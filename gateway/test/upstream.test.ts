import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { forward } from "../src/upstream.js";

describe("forwarding to the upstream", () => {
  it("does not echo a client query that a failed upstream fetch puts in its message", async () => {
    const config = loadConfig({ UPSTREAM_BASE_URL: "https://llm.test/v1" });
    const failing = (async () => {
      throw new TypeError("Failed to parse URL from https://llm.test/v1/models?key=s3cret");
    }) as unknown as typeof fetch;
    const response = await forward(new Request("http://127.0.0.1:8795/v1/models?key=s3cret"), config, failing);
    const text = await response.text();
    expect(response.status).toBe(502);
    expect(text).toContain("<redacted-url>");
    expect(text).not.toContain("s3cret");
  });
});
