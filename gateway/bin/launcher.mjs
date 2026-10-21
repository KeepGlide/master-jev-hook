// Shared by the jev-<client> launchers: keep one background router per client alive, then run
// the client pointed at it. Nothing in the client's own config directory is ever modified.
import { execFileSync, spawn } from "node:child_process";
import { chmodSync, closeSync, existsSync, fchmodSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { configuredProvider, loadProviders, runSetup, terminalIo } from "./setup.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_DIR = join(homedir(), ".master-jev-hook");
// A git checkout runs the TypeScript sources directly; an installed package only ships dist/.
const FROM_SOURCE = existsSync(join(ROOT, "src/index.ts"));
const ROUTER_ARGS = FROM_SOURCE ? ["--import", "tsx", join(ROOT, "src/index.ts")] : [join(ROOT, "dist/index.js")];
// Either entry point under this checkout is the gateway router, whichever one started it.
const ROUTER_ENTRIES = [join(ROOT, "src/index.ts"), join(ROOT, "dist/index.js")];
/** Where the key for Jev and tuning knobs may live; the first file to set a variable wins. */
// (JEV_SKIP_PROJECT_ENV keeps a checkout's own .env out of it, so tests see a clean machine.)
const ENV_FILES = [...(FROM_SOURCE && !process.env.JEV_SKIP_PROJECT_ENV ? [join(ROOT, ".env")] : []), join(STATE_DIR, ".env")];

/**
 * @param {object} spec
 * @param {string} spec.name         launcher name, e.g. "master-jev-claude"
 * @param {string} spec.client       binary to run, e.g. "claude"; also names the log/pid files
 * @param {string} spec.portEnv      env var overriding the router port
 * @param {number} spec.defaultPort
 * @param {() => string} spec.upstream        where this client's traffic is forwarded
 * @param {string} spec.upstreamHelp          help text describing the upstream default
 * @param {(origin: string) => string[]} [spec.args]   extra leading arguments for the client
 * @param {(origin: string) => Record<string, string>} [spec.env]  extra environment for the client
 * @param {(origin: string) => string} spec.configHelp  how to wire the client up permanently
 */
/** Load the key for Jev and friends; real environment variables win over both files. */
export function loadEnv() {
  for (const file of ENV_FILES) if (existsSync(file)) process.loadEnvFile(file);
}

/** How to start a gateway process from this install: `spawn(process.execPath, GATEWAY_ARGS, { cwd: ROOT })`. */
export { ROOT, ROUTER_ARGS as GATEWAY_ARGS };

export async function runLauncher(spec) {
  loadEnv();

  const rawPort = process.env[spec.portEnv] ?? String(spec.defaultPort);
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
    console.error(`${spec.name}: ${spec.portEnv} must be a whole number from 1 to 65535, got "${rawPort}".`);
    process.exit(1);
  }
  const origin = `http://127.0.0.1:${port}`;
  const logFile = join(STATE_DIR, `${spec.client}.log`);
  // Creation modes do not apply to an existing directory or log, so tighten both every time.
  const openLog = () => {
    mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
    chmodSync(STATE_DIR, 0o700);
    const fd = openSync(logFile, "a", 0o600);
    fchmodSync(fd, 0o600);
    return fd;
  };
  const pidFile = join(STATE_DIR, `${spec.client}.pid`);

  const help = `${spec.name}: ${spec.client} with tool selection routed through Jev

  ${spec.name} [${spec.client} args]    start the gateway if needed, then run ${spec.client} through it
  ${spec.name} --dashboard        open the monitoring dashboard in your browser
  ${spec.name} --routing on|off   off = baseline mode: stop asking Jev, keep counting tokens
  ${spec.name} --status           is the gateway running, and where does it forward to?
  ${spec.name} --logs             follow routing decisions live (use a second terminal)
  ${spec.name} --start            start the gateway without opening ${spec.client}
  ${spec.name} --stop             stop the background gateway
  ${spec.name} --setup            choose where to reach Jev (TypeSafe, OpenRouter, Vercel) and set the key
  ${spec.name} --print-config     how to point plain \`${spec.client}\` at the gateway permanently
  ${spec.name} --gateway-help     this text (\`--help\` shows ${spec.client}'s own help)

Environment (or ${ENV_FILES.at(-1)}):
  A key for Jev is required. ${spec.name} asks for it the first time and saves it; it can be
  TYPESAFE_API_KEY, OPENROUTER_API_KEY or AI_GATEWAY_API_KEY (JEV_PROVIDER picks when several are set)
  ${spec.portEnv}   router port for ${spec.client} (default ${spec.defaultPort})
  ${spec.upstreamHelp}
  BROWSER            command --dashboard opens the page with; "none" only prints the URL
`;

  const health = async () => {
    try {
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1000) });
      return response.ok ? await response.json() : undefined;
    } catch {
      return undefined;
    }
  };

  const tailLog = (lines = 15) =>
    existsSync(logFile) ? readFileSync(logFile, "utf8").trimEnd().split("\n").slice(-lines).join("\n") : "";

  const providers = loadProviders(ROOT);
  const envFile = ENV_FILES.at(-1);

  /** Ask for the key and adopt the answer in this process, so the gateway it starts inherits it. */
  const setup = async () => {
    let saved;
    try {
      saved = await runSetup({ name: spec.name, providers, envFile, io: terminalIo() });
    } catch {
      console.error(`\n${spec.name}: setup cancelled.`);
      process.exit(130);
    }
    if (!saved) process.exit(1);
    Object.assign(process.env, saved);
  };

  /** No key, no routing. With a person at the keyboard, ask; otherwise say exactly what is missing. */
  const ensureKey = async () => {
    if (configuredProvider(process.env, providers)) return;
    if (process.stdin.isTTY && process.stdout.isTTY) return setup();
    const names = Object.values(providers).map((provider) => provider.keyEnv).join(", ");
    console.error(`${spec.name}: no API key for Jev. Run \`${spec.name} --setup\` in a terminal, or set one of ${names} (environment or ${envFile}).`);
    process.exit(1);
  };

  /** Refuses a router that forwards somewhere else; a hidden upstream is accepted with a note. */
  const checkUpstream = (running, upstream) => {
    if (running.upstream === undefined) {
      // ROUTER_API_KEY hides the upstream from /health, so there is nothing to compare against.
      console.error(`${spec.name}: router on :${port} is up; its upstream is not verifiable (ROUTER_API_KEY hides it), expected ${upstream}.`);
      return;
    }
    // /health reports origin + path only (no userinfo or query), so both sides are compared in that form.
    const bare = (url) => { try { const u = new URL(url); return (u.origin + u.pathname).replace(/\/+$/, ""); } catch { return url; } };
    if (bare(running.upstream) === bare(upstream)) return;
    console.error(`${spec.name}: router on :${port} forwards to ${running.upstream}, expected ${upstream}.`);
    console.error(`${" ".repeat(spec.name.length)}  Run \`${spec.name} --stop\` and try again.`);
    process.exit(1);
  };

  const ensureRouter = async () => {
    const upstream = spec.upstream().replace(/\/+$/, "");
    const running = await health();
    if (running) return checkUpstream(running, upstream);
    await ensureKey();

    const log = openLog();
    // The client authenticates itself (subscription login or its own key); the gateway must not swap that out.
    const { UPSTREAM_API_KEY: _key, ROUTER_API_KEY: _routerKey, ...env } = process.env;
    const child = spawn(process.execPath, ROUTER_ARGS, {
      cwd: ROOT,
      // JEV_LOG_FILE is where stdout goes (below): the router replays it so the dashboard keeps its history.
      env: { ...env, PORT: String(port), UPSTREAM_BASE_URL: upstream, JEV_CLIENT: spec.client, JEV_LOG_FILE: logFile },
      detached: true,
      stdio: ["ignore", log, log],
    });
    closeSync(log);
    child.unref();
    writeFileSync(pidFile, String(child.pid));

    let exited = false;
    child.once("exit", () => (exited = true));
    for (let attempt = 0; attempt < 50 && !exited; attempt++) {
      const up = await health();
      if (up) return checkUpstream(up, upstream);
      await new Promise((done) => setTimeout(done, 100));
    }
    // The child may have exited because another router already holds the port; that one is up.
    const up = await health();
    if (up) return checkUpstream(up, upstream);
    console.error(`${spec.name}: the router did not start. Last log lines (${logFile}):\n${tailLog()}`);
    process.exit(1);
  };

  /** `kill(pid, 0)` sends nothing: ESRCH means no such process, while EPERM means it exists but is not ours. */
  const isAlive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return error.code !== "ESRCH";
    }
  };

  /** A pid file can outlive its router and the pid can be reused, so only a process running this gateway is signalled. */
  const isRouterProcess = (pid) => {
    try {
      // macOS has no /proc; `ps` prints the same command line there.
      if (process.platform === "darwin") {
        const command = execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        return ROUTER_ENTRIES.some((entry) => command.includes(entry));
      }
      const words = readFileSync(`/proc/${pid}/cmdline`, "utf8").split("\0");
      return ROUTER_ENTRIES.some((entry) => words.includes(entry));
    } catch {
      return false;
    }
  };

  /** Returns false when it refused to signal anything, so the caller does not claim a router went away. */
  const stopRouter = async () => {
    // Whoever answers on the port is the router to stop; the pid file only covers a router that does not say its pid.
    const reported = (await health())?.pid;
    const filed = existsSync(pidFile) ? Number(readFileSync(pidFile, "utf8")) : undefined;
    const pid = reported ?? filed;
    const notRunning = () => {
      rmSync(pidFile, { force: true });
      console.log(`${spec.name}: no router was running.`);
      return true;
    };
    // Nothing to confirm: a pid file without a usable pid is only garbage, and no signal is sent.
    if (!Number.isInteger(pid) || pid <= 0) return notRunning();
    // A pid file left behind by a reboot or a crash names a pid that no longer exists.
    if (!isAlive(pid)) return notRunning();
    // A pid the live router reports on /health is the router naming itself, so it needs no further proof.
    if (pid !== reported) {
      if (process.platform === "win32") {
        console.error(`${spec.name}: refusing to stop pid ${pid}: Windows cannot confirm it is the gateway router here. Nothing was signalled; end it in Task Manager.`);
        return false;
      }
      if (!isRouterProcess(pid)) {
        console.error(`${spec.name}: refusing to stop pid ${pid}: could not confirm it is the gateway router (${ROUTER_ENTRIES.join(" or ")}). Nothing was signalled.`);
        return false;
      }
    }
    // The pid file goes only once the identity check has passed; a refused pid keeps its file.
    rmSync(pidFile, { force: true });
    try {
      process.kill(pid);
      console.log(`${spec.name}: stopped router (pid ${pid}).`);
    } catch {
      console.log(`${spec.name}: no router was running.`);
    }
    return true;
  };

  /** Whichever opener this platform has; under WSL the browser lives on the Windows side. */
  const openBrowser = async (url) => {
    const wsl = process.platform === "linux" && Boolean(process.env.WSL_DISTRO_NAME);
    const openers = [
      ...(process.env.BROWSER ? [[process.env.BROWSER, url]] : []),
      ...(process.platform === "darwin" ? [["open", url]] : []),
      ...(process.platform === "win32" ? [["cmd", "/c", "start", "", url]] : []),
      ...(wsl ? [["wslview", url], ["cmd.exe", "/c", "start", "", url]] : []),
      ["xdg-open", url],
    ];
    for (const [command, ...args] of openers) {
      const started = await new Promise((done) => {
        const child = spawn(command, args, { stdio: "ignore", detached: true });
        child.once("error", () => done(false));
        child.once("spawn", () => (child.unref(), done(true)));
      });
      if (started) return;
    }
  };

  // Only names neither client uses: `--help` and `--config` stay theirs, so those two are spelled
  // differently here. The original `--jev-*` spellings still work.
  const LEGACY = { "--jev-config": "--print-config", "--jev-help": "--gateway-help" };
  const [first] = process.argv.slice(2);
  const flag = LEGACY[first] ?? first?.replace(/^--jev-(?=dashboard$|routing$|status$|logs$|start$|stop$)/, "--");
  if (flag === "--gateway-help") return console.log(help);
  if (flag === "--setup") {
    if (!process.stdin.isTTY) return console.error(`${spec.name}: --setup asks questions, so it needs a terminal.`);
    await setup();
    // A gateway that is already running read the old key when it started.
    if (await health()) {
      if (!(await stopRouter())) return console.log(`${spec.name}: the key is saved, but the gateway already running keeps the old key until it ends.`);
      console.log(`${spec.name}: the gateway will start with the new key the next time you run ${spec.name}.`);
    }
    return;
  }
  if (flag === "--stop") {
    if (!(await stopRouter())) process.exitCode = 1;
    return;
  }
  if (flag === "--routing") {
    const wanted = process.argv[3];
    if (wanted !== "on" && wanted !== "off") return console.error(`usage: ${spec.name} --routing on|off`);
    await ensureRouter();
    const key = process.env.ROUTER_API_KEY ? `&key=${encodeURIComponent(process.env.ROUTER_API_KEY)}` : "";
    const response = await fetch(`${origin}/dashboard/routing?enabled=${wanted === "on"}${key}`, { method: "POST" });
    if (!response.ok) return console.error(`${spec.name}: the router refused (${response.status}). Run \`${spec.name} --stop\` and try again.`);
    return console.log(
      wanted === "on"
        ? `${spec.name}: routing on. Jev decides again.`
        : `${spec.name}: routing off (baseline mode). Requests go straight to the LLM, tokens are still metered.`,
    );
  }
  if (flag === "--print-config") return console.log(spec.configHelp(origin));
  if (flag === "--start") {
    await ensureRouter();
    return console.log(`${spec.name}: router up on ${origin} → ${spec.upstream()} (logs: ${logFile})`);
  }
  if (flag === "--status") {
    const running = await health();
    const via = running?.jev ? `, Jev via ${providers[running.jev]?.label ?? running.jev}` : "";
    console.log(running ? `${spec.name}: router up on ${origin} → ${running.upstream ?? "upstream not verifiable"}${via}` : `${spec.name}: router is not running`);
    const configured = configuredProvider(process.env, providers);
    console.log(configured ? `key: ${providers[configured].label} (${providers[configured].keyEnv})` : `key: none yet, run \`${spec.name} --setup\``);
    return console.log(`logs: ${logFile}`);
  }
  if (flag === "--dashboard") {
    await ensureRouter();
    // `localhost`, not 127.0.0.1: it is the name WSL forwards to a browser running on Windows.
    const base = `http://localhost:${port}/dashboard`;
    // The page looks for the other launchers' routers on their default ports; tell it about moved ones.
    const peers = Object.entries(process.env).flatMap(([name, value]) => (/^JEV_[A-Z]+_PORT$/.test(name) && value !== String(port) ? [value] : []));
    const url = peers.length ? `${base}?peers=${peers.join(",")}` : base;
    const served = await fetch(url).then((response) => response.ok, () => false);
    if (!served) {
      console.error(`${spec.name}: the router on :${port} predates the dashboard. Run \`${spec.name} --stop\` and try again.`);
      process.exit(1);
    }
    console.log(`${spec.name}: dashboard at ${url}`);
    if (process.env.BROWSER !== "none") await openBrowser(url);
    return;
  }
  if (flag === "--logs") {
    closeSync(openLog());
    return spawn("tail", ["-n", "30", "-f", logFile], { stdio: "inherit" });
  }

  await ensureRouter();
  const child = spawn(spec.client, [...(spec.args?.(origin) ?? []), ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, ...spec.env?.(origin) },
  });
  child.on("error", (error) => {
    console.error(`${spec.name}: could not run ${spec.client}: ${error.message}`);
    process.exit(127);
  });
  // The router is left running for the next session; `--stop` ends it.
  child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
  // Ctrl-C reaches the client directly (same foreground process group); it decides what that means.
  process.on("SIGINT", () => {});
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}
