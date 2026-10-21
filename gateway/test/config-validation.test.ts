import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const GATEWAY_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Starts src/index.ts on a free port and resolves with its stdout once it is listening. */
const startGateway = (env: Record<string, string>) =>
  new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
      cwd: GATEWAY_ROOT,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: "0", TYPESAFE_API_KEY: "fixture-not-a-secret", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`gateway did not start: ${err}`));
    }, 20_000);
    child.stdout.on("data", (chunk) => {
      out += chunk;
      if (out.includes("listening")) {
        clearTimeout(timer);
        child.kill();
        resolve(out);
      }
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`gateway exited with ${code}: ${err}`));
    });
  });

describe("configuration validation", () => {
  it("accepts the documented true and false spellings, in any case", () => {
    for (const value of ["1", "true", "yes", "on", "TRUE", " On "]) {
      expect(loadConfig({ JEV_ROUTING: value }).routing, value).toBe(true);
    }
    for (const value of ["0", "false", "no", "off", "FALSE"]) {
      expect(loadConfig({ JEV_ROUTING: value }).routing, value).toBe(false);
    }
  });

  it("rejects an unrecognised boolean instead of silently turning the feature off", () => {
    expect(() => loadConfig({ JEV_ROUTING: "enabled" })).toThrow(/JEV_ROUTING must be one of 1, true, yes, on, 0, false, no, off/);
    expect(() => loadConfig({ JEV_DIRECT_CALLS: "maybe" })).toThrow(/JEV_DIRECT_CALLS/);
  });

  it("keeps the fallback when a boolean is unset or empty", () => {
    expect(loadConfig({}).routing).toBe(true);
    expect(loadConfig({ JEV_ROUTING: "" }).routing).toBe(true);
    expect(loadConfig({ JEV_DIRECT_CALLS: "  " }).directCalls).toBe(false);
  });

  it("accepts PORT from 0 to 65535 and rejects anything else", () => {
    expect(loadConfig({ PORT: "0" }).port).toBe(0);
    expect(loadConfig({ PORT: "65535" }).port).toBe(65535);
    for (const value of ["70000", "1.5", "0x1F", "-1", "1e3"]) {
      expect(() => loadConfig({ PORT: value }), value).toThrow(/PORT must be an integer from 0 to 65535/);
    }
  });

  it("requires UPSTREAM_BASE_URL to be an absolute http or https URL", () => {
    expect(loadConfig({ UPSTREAM_BASE_URL: "https://llm.test/v1/" }).upstreamBaseUrl).toBe("https://llm.test/v1");
    expect(loadConfig({ UPSTREAM_BASE_URL: "http://localhost:4000/v1" }).upstreamBaseUrl).toBe("http://localhost:4000/v1");
    for (const value of ["api.openai.com/v1", "ftp://llm.test/v1", "localhost:4000/v1"]) {
      expect(() => loadConfig({ UPSTREAM_BASE_URL: value }), value).toThrow(/UPSTREAM_BASE_URL must be an absolute http or https URL/);
    }
  });

  it("refuses credentials, a query or a fragment in UPSTREAM_BASE_URL, and never echoes them", () => {
    const refusal = (env: Record<string, string>) => {
      try {
        loadConfig(env);
        return "";
      } catch (error) {
        return (error as Error).message;
      }
    };
    for (const value of ["https://user:s3cret-pass@llm.test/v1", "https://llm.test/v1?token=t0ken-value", "https://llm.test/v1#t0ken-value"]) {
      const message = refusal({ UPSTREAM_BASE_URL: value });
      expect(message, value).toMatch(/UPSTREAM_BASE_URL must not carry credentials, a query or a fragment/);
      expect(message, value).not.toMatch(/s3cret|t0ken/);
    }
  });

  it("validates JEV_URL and TYPESAFE_BASE_URL like the upstream URL", () => {
    expect(loadConfig({ JEV_URL: "https://jev.test/decide" }).jevUrl).toBe("https://jev.test/decide");
    expect(() => loadConfig({ JEV_URL: "ftp://jev.test/decide" })).toThrow(/JEV_URL must be an absolute http or https URL/);
    expect(() => loadConfig({ TYPESAFE_BASE_URL: "jev.test:8789" })).toThrow(/TYPESAFE_BASE_URL must be an absolute http or https URL/);
    expect(() => loadConfig({ JEV_URL: "https://user:s3cret-pass@jev.test/decide" })).toThrow(/JEV_URL must not carry credentials/);
  });

  it("checks TYPESAFE_BASE_URL only under the TypeSafe provider, the one that reads it", () => {
    expect(loadConfig({ JEV_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k", TYPESAFE_BASE_URL: "jev.test:8789" }).jevProvider).toBe("openrouter");
    expect(() => loadConfig({ JEV_PROVIDER: "typesafe", TYPESAFE_BASE_URL: "jev.test:8789" })).toThrow(/TYPESAFE_BASE_URL must be an absolute http or https URL/);
  });

  it("warns at boot when JEV routing is on without a JEV key, naming the variable and never its value", async () => {
    expect(await startGateway({ TYPESAFE_API_KEY: "" })).toMatch(/JEV routing is on but TYPESAFE_API_KEY is not set/);
    expect(await startGateway({})).not.toMatch(/is not set/);
  });

  it("refuses to start with credentials in UPSTREAM_BASE_URL, without printing them", async () => {
    const failure = await startGateway({ UPSTREAM_BASE_URL: "https://user:s3cret-pass@llm.test/v1?token=t0ken-value" }).then(() => "", (error: Error) => error.message);
    expect(failure).toMatch(/UPSTREAM_BASE_URL must not carry credentials/);
    expect(failure).not.toMatch(/s3cret-pass|t0ken-value/);
  }, 30_000);
});
