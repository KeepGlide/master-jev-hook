import { describe, expect, it } from "vitest";
import { decide, type AskJev } from "../src/decide.js";
import { argKey } from "../src/questions.js";
import type { JsonSchema, RouterInput, RouterTool } from "../src/types.js";
import { fakeJev, testConfig } from "./helpers.js";

const clock: RouterTool = { name: "clock", kind: "function", description: "Tell the current time.", parameters: { type: "object", properties: {} } };
const input = (roster: RouterTool[]): RouterInput => ({
  system: "",
  turns: [{ role: "user", content: "what time is it?" }],
  tools: roster,
  toolChoice: "auto",
});

describe("decide", () => {
  it("still answers directly for a tool with no arguments when direct calls are off (nothing to judge)", async () => {
    const jev = fakeJev({ tool: { choice: "clock" }, needs_tool: { noul: 0.9 } });
    const decision = await decide(input([clock]), testConfig({ directCalls: false }), jev.askJev);
    expect(decision).toMatchObject({ mode: "direct", tool: "clock" });
  });

  it("rejects a roster that uses the reserved none_of_these name, as it does no_tool_needed", async () => {
    const roster = [
      ...Array.from({ length: 121 }, (_, index) => ({ ...clock, name: `tool_${index}` })),
      { ...clock, name: "none_of_these" },
    ];
    // Any call to Jev would fail the stand-in, so a passthrough with this reason means Jev was never asked.
    const askJev: AskJev = async () => {
      throw new Error("Jev must not be called");
    };
    const decision = await decide(input(roster), testConfig(), askJev);
    expect(decision).toMatchObject({ mode: "passthrough", reason: "reserved_tool_name" });
  });

  it("keeps an argument named __proto__ in the direct call", async () => {
    const schema = JSON.parse(
      '{"type":"object","properties":{"__proto__":{"enum":["fast","slow"]}},"required":["__proto__"]}',
    ) as JsonSchema;
    const setMode: RouterTool = { name: "set_mode", kind: "function", parameters: schema };
    const jev = fakeJev({
      tool: { choice: "set_mode" },
      needs_tool: { noul: 0.9 },
      [argKey(0, "__proto__")]: { choice: "fast" },
    });
    const decision = await decide(input([setMode]), testConfig(), jev.askJev);
    expect(decision.mode === "direct" && Object.hasOwn(decision.args, "__proto__") && decision.args["__proto__"]).toBe("fast");
  });
});
