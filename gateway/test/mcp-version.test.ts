import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The installer copies bin/master-jev-mcp.mjs alone, so the adapter carries its version as a literal:
// this test keeps that literal equal to gateway/package.json.
describe("master-jev-mcp serverInfo", () => {
  it("reports the package version", () => {
    const adapter = readFileSync(new URL("../bin/master-jev-mcp.mjs", import.meta.url), "utf8");
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    expect(adapter.match(/serverInfo: \{ name: "master-jev-hook", version: "([^"]+)" \}/)?.[1]).toBe(pkg.version);
  });
});
