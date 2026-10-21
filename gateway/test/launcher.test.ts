import { execFile, execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

// @ts-ignore: bin/ is plain JavaScript outside the tsconfig include; resolved at runtime.
const clients = await import("../bin/clients.mjs");

interface LauncherSpec {
  name: string;
  client: string;
  portEnv: string;
  defaultPort: number;
  upstream: () => string;
  upstreamHelp: string;
  args?: (origin: string) => string[];
  env?: (origin: string) => Record<string, string>;
  configHelp: (origin: string) => string;
}

const opencode = clients.opencode as LauncherSpec;
const codex = clients.codex as LauncherSpec;
const claude = clients.claude as LauncherSpec;

const origin = "http://127.0.0.1:8798";
const launcherBin = fileURLToPath(new URL("../bin/jev-opencode.mjs", import.meta.url));

const managedEnv = ["JEV_OPENCODE_UPSTREAM_BASE_URL", "JEV_OPENCODE_MODEL", "JEV_CODEX_UPSTREAM_BASE_URL", "JEV_CLAUDE_UPSTREAM_BASE_URL", "CODEX_HOME"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of managedEnv) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of managedEnv) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const inlineConfig = (originOverride = origin) => {
  const env = opencode.env?.(originOverride);
  expect(env).toBeDefined();
  return JSON.parse(env!.OPENCODE_CONFIG_CONTENT as string) as any;
};

describe("master-jev-opencode spec", () => {
  it("identifies itself as the opencode launcher on its own port", () => {
    expect(opencode.name).toBe("master-jev-opencode");
    // launcher.mjs spawns the gateway with JEV_CLIENT: spec.client, so this is what reaches it.
    expect(opencode.client).toBe("opencode");
    expect(opencode.portEnv).toBe("JEV_OPENCODE_PORT");
    expect(opencode.defaultPort).toBe(8798);
    expect([codex.defaultPort, claude.defaultPort]).not.toContain(opencode.defaultPort);
  });

  it("defaults upstream to OpenAI with a JEV_OPENCODE_UPSTREAM_BASE_URL override", () => {
    expect(opencode.upstream()).toBe("https://api.openai.com/v1");
    process.env.JEV_OPENCODE_UPSTREAM_BASE_URL = "https://llm.test/v1";
    expect(opencode.upstream()).toBe("https://llm.test/v1");
    expect(opencode.upstreamHelp).toContain("JEV_OPENCODE_UPSTREAM_BASE_URL");
  });

  it("selects jev-gateway/<model> by default with a JEV_OPENCODE_MODEL override", () => {
    expect(inlineConfig().model).toBe("jev-gateway/gpt-5");
    expect(inlineConfig().small_model).toBe("jev-gateway/gpt-5");
    process.env.JEV_OPENCODE_MODEL = "gpt-5-mini";
    expect(inlineConfig().model).toBe("jev-gateway/gpt-5-mini");
    expect(opencode.upstreamHelp).toContain("JEV_OPENCODE_MODEL");
  });

  it("injects a stable custom-provider config pointing at the gateway, not at TypeSafe", () => {
    const config = inlineConfig();
    expect(config.$schema).toBe("https://opencode.ai/config.json");
    const provider = config.provider["jev-gateway"];
    // Chat Completions path: the gateway already routes POST /v1/chat/completions.
    expect(provider.npm).toBe("@ai-sdk/openai-compatible");
    expect(provider.options.baseURL).toBe(`${origin}/v1`);
    // The user's own OpenAI credential flows through untouched; never a hardcoded secret.
    expect(provider.options.apiKey).toBe("{env:OPENAI_API_KEY}");
    expect(Object.keys(provider.models)).toEqual(["gpt-5"]);
    const raw = JSON.stringify(config);
    expect(raw.toLowerCase()).not.toContain("typesafe");
    expect(raw).not.toContain("/.config/");
    expect(raw).not.toContain("~");
  });

  it("keeps the experimental native LLM and code modes disabled for the launched process", () => {
    const env = opencode.env!(origin);
    expect(env.OPENCODE_EXPERIMENTAL_NATIVE_LLM).toBe("false");
    expect(env.OPENCODE_EXPERIMENTAL_CODE_MODE).toBe("false");
  });

  it("adds no leading client args, so user flags (including -m) forward untouched", () => {
    // launcher.mjs appends the raw argv after spec.args; with no injected --model, the injected
    // config model above stays the default while a user `-m provider/model` keeps top priority.
    expect(opencode.args).toBeUndefined();
    expect(typeof opencode.env).toBe("function");
  });

  it("prints permanent wiring help rooted at the gateway", () => {
    const help = opencode.configHelp(origin);
    expect(help).toContain(`${origin}/v1`);
    expect(help).toContain("jev-gateway/gpt-5");
    expect(help).toContain("opencode.json");
    expect(help).toContain("master-jev-opencode --start");
    expect(help).toContain("--model jev-gateway/gpt-5");
    // The file workflow below needs no shell quoting; the JSON block must parse as-is.
    const jsonBlock = help.slice(help.indexOf("{"), help.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonBlock) as any;
    expect(parsed.model).toBe("jev-gateway/gpt-5");
    expect(parsed.provider["jev-gateway"].options.baseURL).toBe(`${origin}/v1`);
    // No raw-JSON shell one-liner: single-quoting breaks on apostrophes in custom model IDs.
    expect(help).not.toContain("OPENCODE_CONFIG_CONTENT='");
    process.env.JEV_OPENCODE_MODEL = "other-model";
    expect(opencode.configHelp(origin)).toContain("jev-gateway/other-model");
  });

  it("stays safe when a custom model ID contains an apostrophe", () => {
    process.env.JEV_OPENCODE_MODEL = "o'brien";
    const config = inlineConfig();
    expect(config.model).toBe("jev-gateway/o'brien");
    expect(Object.keys(config.provider["jev-gateway"].models)).toEqual(["o'brien"]);
    const help = opencode.configHelp(origin);
    expect(help).not.toContain("OPENCODE_CONFIG_CONTENT='");
    const jsonBlock = help.slice(help.indexOf("{"), help.lastIndexOf("}") + 1);
    expect(() => JSON.parse(jsonBlock)).not.toThrow();
    expect((JSON.parse(jsonBlock) as any).model).toBe("jev-gateway/o'brien");
  });
});

describe("master-jev-opencode entrypoint", () => {
  it("is registered in package.json with a runnable script", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as any;
    expect(pkg.bin["master-jev-opencode"]).toBe("bin/jev-opencode.mjs");
    expect(pkg.scripts.opencode).toBe("node bin/jev-opencode.mjs");
  });

  it("--gateway-help describes the opencode launcher without starting anything", () => {
    const out = execFileSync(process.execPath, [launcherBin, "--gateway-help"], { encoding: "utf8", timeout: 30_000 });
    expect(out).toContain("master-jev-opencode: opencode with tool selection routed through Jev");
    expect(out).toContain("--print-config");
  });

  it("--print-config prints the gateway-rooted provider config without starting anything", () => {
    const out = execFileSync(process.execPath, [launcherBin, "--print-config"], { encoding: "utf8", timeout: 30_000 });
    expect(out).toContain("http://127.0.0.1:8798/v1");
    expect(out).toContain("jev-gateway");
  });
});

describe("existing launchers", () => {
  it("keeps the codex and claude specs intact", () => {
    expect(codex.name).toBe("master-jev-codex");
    expect(codex.client).toBe("codex");
    expect(codex.defaultPort).toBe(8796);
    // No readable login (CODEX_HOME is pointed at nothing): falls back to the API backend.
    process.env.CODEX_HOME = "/nonexistent-jev-test-dir";
    expect(codex.upstream()).toBe("https://api.openai.com/v1");
    expect(codex.args!(origin).join(" ")).toContain('model_provider="jev-gateway"');

    expect(claude.name).toBe("master-jev-claude");
    expect(claude.client).toBe("claude");
    expect(claude.defaultPort).toBe(8797);
    expect(claude.upstream()).toBe("https://api.anthropic.com/v1");
    expect(claude.env!(origin)).toEqual({ ANTHROPIC_BASE_URL: origin });
  });
});

// Only children this file spawns and fake /health servers are touched below; no real router is signalled.
const routerEntry = resolve(fileURLToPath(new URL("..", import.meta.url)), "src/index.ts");
const distEntry = resolve(fileURLToPath(new URL("..", import.meta.url)), "dist/index.js");
const ownChildren: ChildProcess[] = [];
const scratchDirs: string[] = [];

afterAll(() => {
  for (const child of ownChildren) child.kill();
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

const spawnChild = (args: string[] = []) => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)", ...args], { stdio: "ignore" });
  ownChildren.push(child);
  return child;
};

const isAlive = (child: ChildProcess) => child.exitCode === null && child.signalCode === null;

/** A HOME with an optional pid file for the opencode router, so the launcher never touches the real state. */
const stateHome = (pidFile?: string) => {
  const home = mkdtempSync(join(tmpdir(), "jev-launcher-"));
  scratchDirs.push(home);
  mkdirSync(join(home, ".master-jev-hook"));
  if (pidFile !== undefined) writeFileSync(join(home, ".master-jev-hook", "opencode.pid"), pidFile);
  return home;
};

/** Stand-in for a router's /health only; it forwards nothing. The first `failFirst` answers are 503. */
const fakeHealth = (body: object, failFirst = 0) =>
  new Promise<{ port: number; close: () => Promise<void> }>((ready) => {
    let answers = 0;
    const server = createServer((_request, response) => {
      if (answers++ < failFirst) {
        response.statusCode = 503;
        return response.end();
      }
      response.end(JSON.stringify(body));
    });
    server.listen(0, "127.0.0.1", () =>
      ready({
        port: (server.address() as { port: number }).port,
        close: () => new Promise<void>((closed) => server.close(() => closed())),
      }),
    );
  });

const runCli = (args: string[], env: Record<string, string>, nodeArgs: string[] = []) =>
  new Promise<{ code: number; stdout: string; stderr: string }>((done) =>
    execFile(process.execPath, [...nodeArgs, launcherBin, ...args], { env: { ...process.env, ...env }, timeout: 30_000 }, (error, stdout, stderr) =>
      done({ code: error ? ((error as { code?: number }).code ?? 1) : 0, stdout, stderr }),
    ),
  );

/**
 * Runs the launcher as another platform would see it: a preload replaces process.platform, and a fake
 * `ps` (first on PATH) prints `ps.command` for `ps.pid` only, so no real process is inspected there.
 */
const runOnPlatform = (platform: string, args: string[], env: Record<string, string>, ps?: { pid: number; command: string }) => {
  const dir = mkdtempSync(join(tmpdir(), "jev-platform-"));
  scratchDirs.push(dir);
  const preload = join(dir, "platform.mjs");
  writeFileSync(preload, `Object.defineProperty(process, "platform", { value: ${JSON.stringify(platform)} });\n`);
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const fakePs = ["#!/bin/sh", 'if [ "$2" = "$FAKE_PS_PID" ]; then printf "%s\\n" "$FAKE_PS_COMMAND"; exit 0; fi', "exit 1", ""].join("\n");
  writeFileSync(join(bin, "ps"), fakePs, { mode: 0o755 });
  return runCli(
    args,
    { ...env, PATH: `${bin}${delimiter}${process.env.PATH}`, FAKE_PS_PID: String(ps?.pid ?? -1), FAKE_PS_COMMAND: ps?.command ?? "" },
    ["--import", pathToFileURL(preload).href],
  );
};

const pidFileOf = (home: string) => join(home, ".master-jev-hook", "opencode.pid");

describe("launcher --stop only signals a process it can confirm is the router (P19-1)", () => {
  it("refuses a stale pid file that names a process which is not the router", async () => {
    const child = spawnChild();
    const out = await runCli(["--stop"], { HOME: stateHome(String(child.pid)), JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(1);
    expect(out.stderr).toContain(`refusing to stop pid ${child.pid}`);
    expect(out.stdout).not.toContain("stopped router");
    expect(isAlive(child)).toBe(true);
  });

  it("stops the pid /health reports, even when its command line is not the router, and leaves the filed pid alone", async () => {
    const reported = spawnChild();
    const filed = spawnChild();
    const exited = new Promise((done) => reported.once("exit", done));
    const health = await fakeHealth({ status: "ok", pid: reported.pid, upstream: "https://llm.test/v1" });
    try {
      const out = await runCli(["--stop"], { HOME: stateHome(String(filed.pid)), JEV_OPENCODE_PORT: String(health.port) });
      expect(out.code).toBe(0);
      expect(out.stdout).toContain(`stopped router (pid ${reported.pid})`);
      await exited;
      expect(isAlive(filed)).toBe(true);
    } finally {
      await health.close();
    }
  });

  it("stops a process whose command line runs this gateway", async () => {
    const child = spawnChild([routerEntry]);
    const exited = new Promise((done) => child.once("exit", done));
    const out = await runCli(["--stop"], { HOME: stateHome(String(child.pid)), JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(0);
    expect(out.stdout).toContain(`stopped router (pid ${child.pid})`);
    await exited;
  });

  it("stops a router started from dist/index.js while the checkout runs src/index.ts", async () => {
    const child = spawnChild([distEntry]);
    const exited = new Promise((done) => child.once("exit", done));
    const out = await runCli(["--stop"], { HOME: stateHome(String(child.pid)), JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(0);
    expect(out.stdout).toContain(`stopped router (pid ${child.pid})`);
    await exited;
  });
});

describe("launcher --stop after a reboot or a crash (the pid file names a dead process)", () => {
  it("reports no router, removes the pid file, and exits 0", async () => {
    const child = spawnChild();
    const exited = new Promise((done) => child.once("exit", done));
    child.kill();
    await exited;
    const home = stateHome(String(child.pid));
    const out = await runCli(["--stop"], { HOME: home, JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(0);
    expect(out.stdout).toContain("no router was running");
    expect(out.stderr).toBe("");
    expect(existsSync(pidFileOf(home))).toBe(false);
  });
});

describe("launcher --stop on macOS and Windows (P19-1)", () => {
  it("darwin: refuses a stale pid whose ps command is not the router", async () => {
    const child = spawnChild();
    const home = stateHome(String(child.pid));
    const out = await runOnPlatform("darwin", ["--stop"], { HOME: home, JEV_OPENCODE_PORT: "1" }, { pid: child.pid!, command: "/usr/bin/sleep 100" });
    expect(out.code).toBe(1);
    expect(out.stderr).toContain(`refusing to stop pid ${child.pid}`);
    expect(out.stdout).not.toContain("stopped router");
    expect(isAlive(child)).toBe(true);
  });

  it("darwin: stops the process whose ps command runs this gateway", async () => {
    const child = spawnChild([routerEntry]);
    const exited = new Promise((done) => child.once("exit", done));
    const home = stateHome(String(child.pid));
    const out = await runOnPlatform("darwin", ["--stop"], { HOME: home, JEV_OPENCODE_PORT: "1" }, { pid: child.pid!, command: `node ${routerEntry}` });
    expect(out.code).toBe(0);
    expect(out.stdout).toContain(`stopped router (pid ${child.pid})`);
    await exited;
  });

  it("win32: refuses without signalling, because it cannot confirm the router", async () => {
    const child = spawnChild();
    const home = stateHome(String(child.pid));
    const out = await runOnPlatform("win32", ["--stop"], { HOME: home, JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(1);
    expect(out.stderr).toContain(`refusing to stop pid ${child.pid}`);
    expect(out.stderr).toContain("Windows cannot confirm");
    expect(out.stderr).toContain("Nothing was signalled");
    expect(out.stdout).not.toContain("stopped router");
    expect(isAlive(child)).toBe(true);
  });

  it("win32: stops the pid a live router reports on /health, since the router names itself", async () => {
    const child = spawnChild();
    const exited = new Promise((done) => child.once("exit", done));
    const health = await fakeHealth({ status: "ok", pid: child.pid, upstream: "https://llm.test/v1" });
    try {
      const out = await runOnPlatform("win32", ["--stop"], { HOME: stateHome(), JEV_OPENCODE_PORT: String(health.port) });
      expect(out.code).toBe(0);
      expect(out.stdout).toContain(`stopped router (pid ${child.pid})`);
      expect(out.stderr).not.toContain("refusing");
      await exited;
    } finally {
      await health.close();
    }
  });
});

describe("launcher removes the pid file only after the identity check passes (P19-5, P19-6)", () => {
  it("keeps the pid file when it refuses the pid", async () => {
    const child = spawnChild();
    const home = stateHome(String(child.pid));
    const out = await runCli(["--stop"], { HOME: home, JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(1);
    expect(existsSync(pidFileOf(home))).toBe(true);
    expect(isAlive(child)).toBe(true);
  });

  it("removes the pid file once the confirmed router is stopped", async () => {
    const child = spawnChild([routerEntry]);
    const exited = new Promise((done) => child.once("exit", done));
    const home = stateHome(String(child.pid));
    const out = await runCli(["--stop"], { HOME: home, JEV_OPENCODE_PORT: "1" });
    expect(out.code).toBe(0);
    expect(existsSync(pidFileOf(home))).toBe(false);
    await exited;
  });
});

describe("launcher reports an unverifiable upstream instead of undefined (P19-3)", () => {
  it("--status says the upstream is not verifiable when /health hides it", async () => {
    const health = await fakeHealth({ status: "ok" });
    try {
      const out = await runCli(["--status"], { HOME: stateHome(), JEV_OPENCODE_PORT: String(health.port) });
      expect(out.stdout).toContain("upstream not verifiable");
      expect(out.stdout).not.toContain("undefined");
    } finally {
      await health.close();
    }
  });

  it("--start accepts a running router whose upstream is hidden, and says so", async () => {
    const health = await fakeHealth({ status: "ok" });
    try {
      const out = await runCli(["--start"], { HOME: stateHome(), JEV_OPENCODE_PORT: String(health.port) });
      expect(out.code).toBe(0);
      expect(out.stderr).toContain("upstream is not verifiable");
      expect(out.stderr).not.toContain("undefined");
    } finally {
      await health.close();
    }
  });
});

describe("launcher validates the router port (P19-4)", () => {
  it.each(["abc", "0", "65536", "1.5", ""])("fails with a clear message for JEV_OPENCODE_PORT=%j", async (value) => {
    const out = await runCli(["--status"], { HOME: stateHome(), JEV_OPENCODE_PORT: value });
    expect(out.code).toBe(1);
    expect(out.stderr).toContain("JEV_OPENCODE_PORT must be a whole number from 1 to 65535");
    expect(out.stderr).not.toContain("NaN");
  });
});

describe("launcher compares upstreams in the /health form (origin + path)", () => {
  it("--start accepts a running router whose path-less upstream /health reports with a trailing slash", async () => {
    const health = await fakeHealth({ status: "ok", upstream: "https://generativelanguage.googleapis.com/" });
    const home = stateHome();
    try {
      const out = await runCli(["--start"], {
        HOME: home,
        JEV_OPENCODE_PORT: String(health.port),
        JEV_OPENCODE_UPSTREAM_BASE_URL: "https://generativelanguage.googleapis.com",
        TYPESAFE_API_KEY: "test-key",
        JEV_SKIP_PROJECT_ENV: "1",
      });
      expect(out.stderr).not.toContain("forwards to");
      expect(out.code).toBe(0);
    } finally {
      await health.close();
    }
  });
});

describe("launcher checks the upstream when another router holds the port (P19-4 r2)", () => {
  it("--start refuses a router that won the port and forwards elsewhere", async () => {
    // The first /health answer fails, so the launcher starts its own router; that router cannot bind
    // the taken port, and the router that answers forwards to another upstream.
    const health = await fakeHealth({ status: "ok", upstream: "https://other.test/v1" }, 1);
    const home = stateHome();
    try {
      const out = await runCli(["--start"], {
        HOME: home,
        JEV_OPENCODE_PORT: String(health.port),
        TYPESAFE_API_KEY: "test-key",
        JEV_SKIP_PROJECT_ENV: "1",
      });
      expect(out.code).toBe(1);
      expect(out.stderr).toContain("forwards to https://other.test/v1, expected https://api.openai.com/v1");
      expect(out.stdout).not.toContain("router up on");
    } finally {
      await health.close();
      // Stop the router child this test made the launcher spawn, if it is still up.
      if (existsSync(pidFileOf(home))) {
        try {
          process.kill(Number(readFileSync(pidFileOf(home), "utf8")));
        } catch {
          // already gone
        }
      }
    }
  });
});
