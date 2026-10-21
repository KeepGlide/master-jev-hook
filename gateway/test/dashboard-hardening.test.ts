import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { fakeJev, fakeUpstream, testConfig } from "./helpers.js";

const app = (upstreamBaseUrl = "https://llm.test/v1") =>
  createApp({
    config: testConfig({ upstreamBaseUrl }),
    askJev: fakeJev({}).askJev,
    fetch: fakeUpstream().fetchImpl,
  });

describe("dashboard hardening", () => {
  it("sends nosniff and frame-ancestors on the page and its API replies", async () => {
    for (const response of [await app().request("/dashboard"), await app().request("/dashboard/events")]) {
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
    }
  });

  it("shows the upstream as origin and path only, never its userinfo or query", async () => {
    const response = await app("https://user:sk-secret@llm.test/v1/?api_key=k-123#frag").request("/dashboard/events");
    const text = await response.text();

    expect(JSON.parse(text).router.upstream).toBe("https://llm.test/v1/");
    expect(text).not.toContain("sk-secret");
    expect(text).not.toContain("k-123");
  });
});
