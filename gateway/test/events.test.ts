import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createEventLog } from "../src/events.js";

// The replay reads the last 2 MiB of the launcher log (events.ts HISTORY_BYTES).
const HISTORY_BYTES = 2 * 1024 * 1024;

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

const logFile = (content: string) => {
  dir = mkdtempSync(join(tmpdir(), "jev-events-"));
  const file = join(dir, "codex.log");
  writeFileSync(file, content);
  return file;
};

describe("createEventLog replay", () => {
  it("keeps the first line of the window when the window starts exactly on a line boundary", () => {
    // A padded route line that, with its newline, is exactly the window: the file starts it at the window's first byte.
    const padded = (pad: number) => JSON.stringify({ event: "route", path: "/v1/responses", tools: 1, mode: "passthrough", pad: "x".repeat(pad) });
    const head = JSON.stringify({ event: "route", path: "/old", tools: 1, mode: "passthrough" }) + "\n";
    const last = padded(HISTORY_BYTES - 1 - padded(0).length);
    expect(last.length + 1).toBe(HISTORY_BYTES);

    const log = createEventLog({ historyFile: logFile(head + last + "\n") });

    expect(log.since(0)).toHaveLength(1);
    expect(log.since(0)[0]).toMatchObject({ seq: 1, path: "/v1/responses", mode: "passthrough", tools: 1 });
  });

  it("replays the lines after one that cannot become an event", () => {
    const bad = JSON.stringify({ event: "route", path: "/bad", mode: "passthrough", context: { status: "accepted", questions: [null] } });
    const good = JSON.stringify({ event: "route", path: "/good", tools: 2, mode: "passthrough" });

    const log = createEventLog({ historyFile: logFile(`${bad}\n${good}\n`) });

    expect(log.since(0).map((event) => [event.seq, event.path])).toEqual([[1, "/good"]]);
    expect(log.last).toBe(1);
  });
});
