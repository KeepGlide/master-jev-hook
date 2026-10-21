import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { chat, fakeJev, fakeUpstream, settled, testConfig } from "./helpers.js";

const json = { "content-type": "application/json" };

// A tool name Headers cannot carry: every character is above 0xFF. Its free-text argument keeps
// Jev from closing the call, so the decision is "forced" and goes out through the rewrite forward.
const cjkTool = { type: "function", function: { name: "工具", description: "d",
  parameters: { type: "object", properties: { q: { type: "string" } }, required: ["q"] } } };

describe("decision headers", () => {
  it("sanitises a tool name Headers cannot carry, and answers instead of a 500", async () => {
    const upstream = fakeUpstream();
    const jev = fakeJev({ tool: { choice: "工具" }, needs_tool: { noul: 0.97 } });
    const app = createApp({ config: testConfig({ directCalls: false }), askJev: jev.askJev, fetch: upstream.fetchImpl });
    const res = await app.request("/v1/chat/completions", { method: "POST", headers: json,
      body: JSON.stringify(chat("look it up", { tools: [cjkTool] })) });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-jev-gateway-mode")).toBe("forced");
    expect(res.headers.get("x-jev-gateway-tool")).toBe("??");
    expect(upstream.calls).toHaveLength(1);
  });
});

describe("origin guard", () => {
  it("checks the Origin of the exact /v1 and /v1beta paths, not only of their sub-paths", async () => {
    const upstream = fakeUpstream();
    const app = createApp({ config: testConfig(), askJev: fakeJev({}).askJev, fetch: upstream.fetchImpl });
    for (const path of ["/v1", "/v1beta"]) {
      const res = await app.request(path, { method: "POST", headers: { ...json, origin: "https://evil.example" }, body: "{}" });
      expect(res.status, path).toBe(403);
    }
    expect(upstream.calls).toHaveLength(0);
  });
});

describe("usage logging", () => {
  it("does not let a throwing log sink become an unhandled rejection", async () => {
    const app = createApp({ config: testConfig(), askJev: fakeJev({}).askJev, fetch: fakeUpstream().fetchImpl,
      log: () => { throw new Error("log sink down"); } });
    const res = await app.request("/v1/chat/completions", { method: "POST", headers: json, body: JSON.stringify(chat("hi")) });
    expect(res.status).toBe(200);
    await settled();
  });
});

describe("?format= override", () => {
  it("ignores format names that only exist on Object.prototype and guesses the wire format", async () => {
    const app = createApp({ config: testConfig(), askJev: fakeJev({}).askJev, fetch: fakeUpstream().fetchImpl });
    for (const format of ["constructor", "__proto__"]) {
      const res = await app.request(`/router/decide?format=${format}`, { method: "POST", headers: json, body: JSON.stringify(chat("hi")) });
      const out = (await res.json()) as { reason?: string };
      expect(out.reason, format).not.toBe("unreadable_request");
    }
  });
});
