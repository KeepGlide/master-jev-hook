import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { HTTPException } from "hono/http-exception";
import { createApp } from "../src/app.js";
import { chat, fakeJev, fakeUpstream, testConfig } from "./helpers.js";

const json = { "content-type": "application/json" };
const app = () => createApp({ config: testConfig(), askJev: fakeJev({}).askJev, fetch: fakeUpstream().fetchImpl });

describe("request body decoding", () => {
  it("decodes a gzip-compressed body", async () => {
    const res = await app().request("/router/decide", { method: "POST", headers: { ...json, "content-encoding": "gzip" },
      body: gzipSync(JSON.stringify(chat("hi"))) });
    expect(res.status).toBe(200);
  });

  it("treats content-encoding identity as no encoding on a routed endpoint", async () => {
    const res = await app().request("/v1/chat/completions", { method: "POST", headers: { ...json, "content-encoding": "identity" },
      body: JSON.stringify(chat("hi", { tools: [] })) });
    expect(res.headers.get("x-jev-gateway-reason")).not.toBe("unparseable_body");
  });

  it("rejects a JSON array, which is not a request object", async () => {
    const res = await app().request("/router/decide", { method: "POST", headers: json, body: "[]" });
    expect(res.status).toBe(400);
  });

  it("caps a /master/* body at its own limit once decoded, not at the routed 32 MiB", async () => {
    // Trailing whitespace is valid JSON: 1 MiB of it gzips to almost nothing, so only the decoded cap can refuse it.
    const context = { kind: "comparison", criterion: "Primary source", candidates: [{ id: "A", text: "Manual" }, { id: "B", text: "Comment" }] };
    const body = JSON.stringify({ objective: "Choose the primary source", context }) + " ".repeat(1 << 20);
    const res = await app().request("/master/context", { method: "POST", headers: { ...json, "content-encoding": "gzip" }, body: gzipSync(body) });
    expect(await res.json()).toMatchObject({ reason: "invalid_objective" });
  });
});

describe("unhandled errors", () => {
  it("answers the gateway's JSON error shape instead of a plain-text 500", async () => {
    const throwing = createApp({ config: testConfig(), askJev: fakeJev({}).askJev, fetch: fakeUpstream().fetchImpl,
      dump: () => { throw new Error("dump sink down"); } });
    const res = await throwing.request("/v1/chat/completions", { method: "POST", headers: json, body: JSON.stringify(chat("hi")) });
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toMatchObject({ error: { type: "server_error" } });
  });

  it("answers an HTTPException with its own status and text, not a 500", async () => {
    const teapot = app();
    teapot.get("/teapot", () => { throw new HTTPException(418, { message: "short and stout" }); });
    const res = await teapot.request("/teapot");
    expect(res.status).toBe(418);
    expect(await res.text()).toBe("short and stout");
  });
});

describe("/health upstream", () => {
  it("echoes the upstream origin and path, never its userinfo or query", async () => {
    const withSecrets = createApp({ config: testConfig({ upstreamBaseUrl: "https://user:secret@llm.test/v1?token=abc" }),
      askJev: fakeJev({}).askJev, fetch: fakeUpstream().fetchImpl });
    const text = await (await withSecrets.request("/health")).text();
    expect(JSON.parse(text)).toMatchObject({ status: "ok", upstream: "https://llm.test/v1" });
    expect(text).not.toMatch(/secret|token/);
  });
});
