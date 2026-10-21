/**
 * Token usage of one LLM call, in one vocabulary whatever the provider's. `input` is everything
 * the model read, cached or not — Anthropic reports its three input buckets separately, OpenAI
 * reports a total with the cached part inside; both end up here as a total plus its cached share.
 * A count the client sent as `null` is unknown: `undefined`, never zero.
 */
export interface Usage {
  input: number | undefined;
  output: number | undefined;
  /** Part of `input` served from the prompt cache (billed at a fraction). */
  cached: number | undefined;
  /** Part of `input` written to the prompt cache (Anthropic only; billed at a premium). */
  cacheWrite: number | undefined;
  /** Part of `output` spent on hidden reasoning, when the provider says (OpenAI). */
  reasoning: number | undefined;
}

type Raw = Record<string, unknown>;
/** A count as sent: a number, `null` for unknown, or `undefined` when the field is absent. */
type Sent = number | null | undefined;

const sent = (value: unknown): Sent => (typeof value === "number" && Number.isFinite(value) ? value : value === null ? null : undefined);
const obj = (value: unknown): Raw => (value && typeof value === "object" ? (value as Raw) : {});

/** Store one sent count. Absent leaves the default; unknown never overwrites a count already known. */
function store(into: Partial<Usage>, key: keyof Usage, value: Sent): void {
  if (value === undefined) return;
  if (value !== null) into[key] = value;
  else if (!(key in into)) into[key] = undefined;
}

/** Fold one provider `usage` object into the running total; later reports override earlier ones. */
function merge(into: Partial<Usage>, raw: Raw): void {
  if ("prompt_tokens" in raw || "completion_tokens" in raw) {
    // Chat Completions
    store(into, "input", sent(raw.prompt_tokens));
    store(into, "output", sent(raw.completion_tokens));
    store(into, "cached", sent(obj(raw.prompt_tokens_details).cached_tokens));
    store(into, "reasoning", sent(obj(raw.completion_tokens_details).reasoning_tokens));
  } else if ("cache_read_input_tokens" in raw || "cache_creation_input_tokens" in raw) {
    // Anthropic, message_start: the input side, with a placeholder output count.
    const fresh = sent(raw.input_tokens);
    const cached = sent(raw.cache_read_input_tokens);
    const cacheWrite = sent(raw.cache_creation_input_tokens);
    store(into, "cached", cached);
    store(into, "cacheWrite", cacheWrite);
    if (fresh !== undefined)
      store(into, "input", fresh === null || cached === null || cacheWrite === null ? null : fresh + (cached ?? 0) + (cacheWrite ?? 0));
    store(into, "output", sent(raw.output_tokens));
  } else if ("promptTokenCount" in raw || "candidatesTokenCount" in raw) {
    // Google Gemini API (usageMetadata)
    store(into, "input", sent(raw.promptTokenCount));
    store(into, "output", sent(raw.candidatesTokenCount));
    store(into, "cached", sent(raw.cachedContentTokenCount));
  } else {
    // Responses API — or Anthropic's message_delta, which only updates the output count.
    if ("input_tokens" in raw) {
      store(into, "input", sent(raw.input_tokens));
      store(into, "cached", sent(obj(raw.input_tokens_details).cached_tokens));
    }
    if ("output_tokens" in raw) {
      store(into, "output", sent(raw.output_tokens));
      store(into, "reasoning", sent(obj(raw.output_tokens_details).reasoning_tokens));
    }
  }
}

function collect(payload: unknown, into: Partial<Usage>): void {
  const root = obj(payload);
  // Where each API keeps it: top level (JSON replies, chat chunks, message_delta),
  // `response.usage` (Responses events), `message.usage` (Anthropic message_start), `usageMetadata` (Gemini).
  for (const holder of [root, obj(root.response), obj(root.message)]) {
    if (holder.usage && typeof holder.usage === "object") merge(into, holder.usage as Raw);
    if (holder.usageMetadata && typeof holder.usageMetadata === "object") merge(into, holder.usageMetadata as Raw);
  }
}

/**
 * Read a reply to its end and report what it cost. Works on a clone, in the background: the
 * client's own stream is never delayed. A stream cut short (Codex hangs up as soon as it has
 * `response.completed`) still yields whatever usage arrived before the cut.
 */
export async function readUsage(response: Response): Promise<Usage | undefined> {
  const found: Partial<Usage> = {};
  // Told apart by content, not by header: the ChatGPT Codex backend streams events without
  // sending any content-type at all.
  let streaming: boolean | undefined;
  let pending = "";
  const scan = (line: string) => {
    // Most stream events are text deltas; only the few that mention usage are worth parsing.
    // (`"usage` with no closing quote also matches Gemini's `usageMetadata`.)
    if (!line.startsWith("data:") || !line.includes('"usage')) return;
    try {
      collect(JSON.parse(line.slice(5)), found);
    } catch {
      // A line cut short by the client hanging up.
    }
  };
  try {
    for await (const chunk of response.body?.pipeThrough(new TextDecoderStream()) ?? []) {
      pending += chunk;
      streaming ??= /^\s*$/.test(pending) ? undefined : !/^\s*[{[]/.test(pending);
      if (!streaming) continue;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      lines.forEach(scan);
    }
  } catch {
    // Aborted mid-stream: keep what was seen.
  }
  if (streaming) scan(pending);
  else {
    try {
      collect(JSON.parse(pending), found);
    } catch {
      // Not JSON (an HTML error page, an empty body): nothing to report.
    }
  }
  if (found.input === undefined && found.output === undefined) return undefined;
  return { input: 0, output: 0, cached: 0, cacheWrite: 0, reasoning: 0, ...found };
}
