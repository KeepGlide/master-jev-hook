# Experiment log

What we tried to make Claude use the JEV better, how we measured it, and what we kept or dropped. Read this
before proposing a change to the reminders, rule text or hooks, so a rejected idea is not tested again without
a new reason. Newest first.

**Budget rule behind every measurement:** JEV (TypeSafe) cost does not matter; Claude tokens do. A change is an
improvement only if it lowers cost-weighted Claude tokens (or keeps them flat) with equal correctness.
Cost-weighted = uncached input ×1 + cache creation ×1.25 + cache read ×0.1 + output ×5.

## 2026-10-18 — abstentions of the hook Choice questions `completion`, `direction`, `risk` (fix)

### Observed (router.log, 2026-10-16 → 10-18, `context.workflow.answers`)

| Question | Calls | Abstained | Notes |
|---|---|---|---|
| `direction` (drift) | 596 | 45% | answered: 324 `on_track`, 5 `stuck`; abstentions sit at confidence 0.34–0.5 |
| `completion` (Stop check) | 137 | 43% | answered: 64 `partial`, 8 `other`, 4 `done_verified`, 2 `done_unverified` |
| `risk` (Bash gate, threshold 0.80) | 795 | 27% | abstentions at 0.73–0.79, just under the bar |

The log keeps no state text, so the abstained states were rebuilt: the hook functions were run (gateway stubbed to
capture the body) on cut points of the last 12 days of real session transcripts → 120 drift and 90 stop states, plus the
labeled gauntlet cases (3 stop, 12 drift) and hand-written ones (14 stop, 12 drift). Why the JEV abstained, from reading them:
- `completion`: the final message is often a progress note ("Reading what it flagged"), an analysis or a report
  after a commit. It is neither a completion report nor clearly `other`, and `partial`/`other`/`done_*` overlap.
  Only `done_unverified` makes the hook act, yet the question asked for four degrees.
- `direction`: the actions are tool names and paths, so `on_track` and `out_of_scope` cannot be told apart with
  confidence; the options were degrees without a default. Several "stuck" answers were a single failed call.
- Truncating `last_message` to its head was a hypothesis; only 3 of 90 messages exceed 3000 chars, so it was dropped.

Method: temporary gateway on port 8798 (own env file and log, live service on 8795 untouched), same states per
variant, 3 runs on real states, 5 runs on labeled ones, paid TypeSafe calls (input tokens only).

### Kept: `direction` as situations with a default (D1)
- Instruction ends with "Choose on_track unless another option is clearly shown by `recent_actions`"; options
  describe observable situations (same failing command repeated; unrelated files or goal; a choice only the user can make).
- Real states: abstain 92% → 19% (reconstructed set, confidence 0.49 → 0.79). Labeled (5 runs): `stuck` 15/15,
  `out_of_scope` answered 5/15 → 9/15 with no wrong answer, gauntlet s10a/c/d unchanged, the false `stuck` on a
  recovering test run (5/30 before) gone. Caveat: the real set has no labels; every answered real state is `on_track`
  (production before: 324 `on_track`, 5 `stuck`).

### Kept: `completion` as one question the hook acts on (C3b)
- Two options: `done_unverified` (finished work reported, nothing shows a check) vs `other` (everything else).
  `done_verified` and `partial` were never used by the hook.
- Real states: abstain 39% → 20%. Labeled: unverified recall 25/30 → 25/30 (the sixth, U6, abstains in both), 0 false
  flags on checked/partial/question/progress cases, gauntlet s9a 3/3. Real flagged states 3 → 3 (same cases).
  The note now says `other` where it said `partial`/`done_verified`.

### Rejected
- `completion` C1/C2 (ordered four-situation wording, with and without a `progress_note` exit): labeled correctness
  94% → 82% (two clear `done_unverified` cases abstained, one became `done_verified`), real abstention unchanged (38–42%).
- `completion` C3 (without "answers the user, analyses"): flagged a pure explanation after a commit as unverified.
- `direction` D2 (shorter `request`, 600 chars): abstain 92% → 86% only. D3 (situations without the default): no
  gain (93% on real, `out_of_scope` recall fell to 2/9).
- `risk` R1 (conjunctive "only when all hold" wording): pass 76% → 65%, `ask` cases 59% → 41%, abstain 29% → 38%.
  R2 (confirm listed first): pass 74% → 72%, `ask` 57% → 54%, abstain unchanged. Same 94 gauntlet bash cases, 3 runs,
  through the hook script. `risk` therefore keeps its wording and its 0.80 threshold: its abstentions are the bar doing its job.

### Rollout
Sophia ran `install.py --target claude-code` on 2026-10-18 (backup under `~/.local/share/master-jev-hook/backups/`); the installed `claude_jev.py` matches the repository (`cmp`).

## 2026-10-18 — mass Score abstentions in `jev_score` / `jev_rank` batches (fix)

- **Finding:** Sophia saw batches of 8 answers with 8 abstentions in most rounds. The router log confirms it:
  since 10-17, `jev_score` batches on 5-level scales abstained 12/12, 6/6 and 4/5 (confidence 0–0.58); the
  10-15 replay already showed `jev_rank` 67–83% and `jev_score` 50% abstention. Hook questions abstain too
  (`risk` 33% at 0.80, `direction` 35%, `completion` 55%) but those are Choice and out of this fix.
- **Cause:** Score `confidence` is a spread measure, `1 − MAD(from the mode) / MAD(uniform)`
  (docs.typesafe.ai/confidence), not a probability. On 1,610 Score answers since 10-10, 3-level scales passed
  0.65 94% of the time, 4-level 37%, 5-level 15% (31% at 0.50, 47% at 0.40). A direct API probe (96 answers,
  per-level probabilities) showed most abstentions are mass split between two *adjacent* levels (e.g.
  0.59/0.35 on levels 0/1 → confidence 0.57, score 0.5), which still orders candidates correctly; genuinely
  uncertain items spread over 3+ levels (confidence 0.0–0.3). The gateway nulled the score below threshold, so
  a ranking lost exactly the candidates that were merely "between two levels".
- **Rejected:** changing `jev_rank`'s default levels from 5 degree words to 3 situation-described levels.
  Gateway A/B, 3 cases × 3 runs: 62% accepted with the 5 degree words, 56% with the 3 situations. The docs'
  advice (describe situations, not degrees) is kept as guidance, not as the fix. Also rejected: a lower
  Score-only floor (`JEV_MIN_CONFIDENCE_SCORE`) and a "mass within one level ≥ threshold" rule, both of which
  change the documented threshold contract (the latter is trivial on 3-level scales).
- **Kept (JEV: keep_score, 0.97):** an abstained Score keeps its expected `score` under `status: abstain`
  (`workflow.ts`); `jev_rank` orders every scored candidate and keeps `abstained` as the tentative list
  (`master-jev-mcp.mjs`); tool descriptions, skill and READMEs tell callers to use 3 situation-described
  levels and how to read a ranking with abstentions. Composite and cascade still gate on `status`, so no
  abstention becomes a value. The MCP change works with the old gateway (null score → left out, as before).
- **Rollout:** the MCP server, skill and docs apply to new sessions on install; the gateway part applies on
  its next restart (`systemctl --user restart master-jev-hook`, ~0.3 s; hooks fail open and the MCP server
  reports "Gateway unavailable" for a call in that window). The gateway was left running on purpose.
- **Open:** the hook Choice questions (`completion` 55%, `direction` 35%) deserve their own replay with the
  `eval-jev-1.14` harness before changing their wording.

## 2026-09-28 — v1.2.0 rule text regression (fix)

- **Finding:** model-side JEV calls in real Claude sessions (test fixtures excluded) fell from dozens a day under
  v1.1.0 (09-27: tail-harness 33, keepglide 15, agent-atlas 7, auto-navigate-workflow 4, others) and 9 on 09-28
  morning to **0 across 10 sessions** after v1.2.0 was installed (09-28 ~14:15 UTC). Tools were deferred in both
  periods (most calls were preceded by a ToolSearch), so deferral was not the cause.
- **Cause:** `be235f5` replaced the decision trigger ("decision with explicit alternatives → call
  `request_decision` and wait") with "consult when it replaces your own reading or judging; the goal is fewer
  Claude tokens, not more JEV calls … skip when writing the query costs more". Claude took the exits every time.
  The v1.2.0 A/B measured cost and correctness on a small fixture, not whether Claude still consulted in real use.
- **Change:** the v1.1.0 decision trigger is back as the lead of the rule (reminder, rule file, skill). Kept from
  v1.2.0: the 3+ item triage and `jev_verify` triggers and the lean-query guidance. Dropped: "fewer Claude tokens,
  not more JEV calls" and "skip when writing the query costs more than doing it yourself".
- **Lesson:** any rule-text change is measured on the share of real sessions with a model-side JEV call, not only
  on a fixture's token cost.

## 2026-09-28 — always-loaded MCP tools (fix)

- **Finding:** in a real Claude session (keepglide, ~90 min, 4 subagents) the model made 0 JEV MCP calls;
  only hooks consulted the JEV. A parallel Codex session made 3 spontaneous `request_decision` calls. The main
  cause was the rule text (entry above); deferral is a secondary cost: Claude Code hides MCP tools behind
  ToolSearch, so each consult first costs a search turn, while Codex lists them upfront.
- **Change:** the MCP server marks every tool with `_meta: {"anthropic/alwaysLoad": true}` in `tools/list`
  (documented at code.claude.com/docs/en/mcp, "Scale with MCP tool search"). Per tool, not the server-wide
  `alwaysLoad` config key, so it ships with the server and leaves the user's `~/.claude.json` alone.
- **Check:** headless `claude -p` with only this server: old script → tools `DEFERRED`, new → `LOADED`. Unlike
  the rejected nudges it adds no reminder text; it removes a turn from each consult, in line with the budget rule.
- **Per-tool flag is not enough in the desktop app:** an interactive session (Claude Code 2.1.280 in Claude
  Desktop) still deferred the tools; the transcript shows them arriving in a `deferred_tools_delta` before the
  first prompt had any MCP tool. The same binary headless loaded them. MCP servers connect asynchronously and late
  tools are deferred; the server-level `"alwaysLoad": true` in `~/.claude.json` makes startup wait for the server
  (up to 5 s). The installer now writes it for Claude Code only (Claude Desktop's own config does not get it).
- **Still deferred in the desktop app, known upstream bug:** with both flags set, a new desktop session still
  deferred the tools. anthropics/claude-code#86284 ("Desktop app ignores mcpServers alwaysLoad … identical config
  honored by CLI") was closed as stale without a fix; #88483 (desktop never rebuilds its deferred-tool pool) is
  open. Hooks cannot load tools (their output is text only; #89049 asks for a tool-registry API). Both flags stay:
  they work in the CLI and headless runs, and cost nothing in the desktop app. Retry when #86284/#88483 are fixed.
- **Workaround added:** the SessionStart context asks for one ToolSearch with the 5 JEV tools at the start
  (skipped when they are already loaded) and a confirmation line `🔷 MCP Master-JEV Hook loaded: <n>/5 tools
  ready.` read from what the model actually has. The request sits before the verbatim status block so it is
  never printed as part of it. Cost: one tool turn per session, instead of one before the first consult.
  Measured on Opus 5.5 (1 h cache): 2,796 cache-write + 65,135 cache-read + ~150 output tokens ≈ $0.04 once per
  session, then ~2.8k extra cached tokens per turn ≈ $0.0006. Neutral or cheaper in sessions that consult the JEV
  (the same ToolSearch would come later, on a larger context); pure overhead in sessions that never do.
- **Pending measurement:** over the next days, the share of real Claude sessions with a model-side JEV call. Below
  ~50%, replace the upfront load with a presence check that loads nothing.
- **Impact is small:** in the test session the model loaded the JEV in one ToolSearch together with other tools
  and consulted it (`jev_rank`), so the regression was the rule text, not deferral.
- **Check tools from the transcript, not by asking the model:** the `prompt_snapshot` attachment lists the loaded
  tools; `deferred_tools_delta` lists the deferred ones.
- **Not done:** a `SubagentStart` hook injecting the rule into subagents. It is reminder text, the family of the
  rejected nudge; try it only with an A/B that shows lower Claude tokens.
- **Measure next:** share of real Claude sessions with at least one model-side JEV call, before vs after.

## 2026-09-28 — v1.2.0 cycle

Method: unit and integration suites; a sandboxed installer suite; a live headless A/B (`claude -p`, fresh session
per run) on a fixture of 11–12 small Python modules with an answer key. Arms: v1.1.0 (`3309921`) vs candidates.
Two lean rounds, 1 run per task per arm (N=1: direction, not proof). Round 2 blocked Bash so reads went through
Read/Grep/Glob, and gated every session on a live JEV self-test plus a dashboard check for failed evaluations.

### Rejected: PreToolUse "nudge" before reads, searches and delegation

- **Idea:** a local PreToolUse hook injects a short reminder to triage with the JEV. WebSearch and
  AskUserQuestion every call; Read, Grep, Glob, WebFetch, `mcp__graphify__*` and Chrome page reads every
  third call without a JEV call; Agent/Task every call (first version only).
- **Result:** 0 of 5 nudges turned into a JEV call. Triage cost more in both rounds (+58%, then +15.5%): after
  the nudges Claude made 3 more reads and 3 more turns. Delegation with the Agent nudge cost +89% Claude tokens
  with the same result, because each JEV query costs Claude a written query and an extra turn.
- **Decision:** dropped. Commit `2e9f037` is kept only on branch `archive/nudge-hooks-rejected`.
- **Mechanics that did work there (reuse if this returns):** Claude Code does not anchor hook matchers (a
  `Read` matcher also fired on `ReadMcpResourceTool`), so anchor with `^(...)$`; an append-only counter
  (`O_APPEND` + `lseek`) counts parallel calls without locks, where a JSON read-modify-write lost 14 of 20.
- **Retry only if:** tasks are large enough that a keyword search cannot do the triage (dozens of candidate
  files or pages), and a pilot shows nudges turning into JEV calls that cut reads.

### Rejected: "consult the JEV by default" / "as many JEV calls as possible"

- **Idea:** more JEV calls means more savings.
- **Result:** false for calls Claude makes itself. Each one costs output tokens for the query plus a turn that
  re-reads the context. Verification cost +68% with no accuracy gain in round 1.
- **Decision:** replaced by the cost-aware wording below. The goal is fewer Claude tokens, not more JEV calls.
- **Not affected:** hook-side calls (Bash gate, Stop check, drift, compaction, session self-test). Python builds
  their context from the transcript on disk, so they cost only the JEV. Sending the last user messages as
  context there was kept: it lowers abstentions at no Claude cost.

### Kept: trigger-based, Claude-cost-aware rule text (`be235f5`)

- Same concrete triggers in the per-message reminder, the guide and the skill (choice → `request_decision`;
  3+ items → `jev_rank`/`jev_classify`/`jev_score`, then read only what it keeps; claim or done check →
  `jev_verify`). Consult only when it replaces Claude's own reading or judging; lean queries (ids, names, short
  snippets, never whole files); skip when writing the query costs more than doing it. Agent/model choice stays
  with Claude.
- **Result:** no regression. Control task +0.5% to +3% (noise), verification 3–10% cheaper, same correctness.
- **Superseded:** in real use it stopped model-side JEV calls entirely; see "v1.2.0 rule text regression".

### Kept: guide as a Claude Code rule file (`d183ee3`)

- The guide moved from a managed block in `~/.claude/CLAUDE.md` to `~/.claude/rules/master-jev-hook.md`.
- **Result:** it loads in new sessions and after `/compact`; migration removes only the legacy block
  (byte-exact); no measurable cost change. The gain is a cleaner install, not behavior: a rule loads exactly
  like CLAUDE.md, so it does not make Claude call the JEV more.

### Observed, not caused by this cycle

- JEV answer rate in real use rose from 42% (09-26) to 82% (09-28 after install), abstentions from 58% to 14%.
  Most of the rise came before this cycle (drift and self-test context fixes), so it is not credited to v1.2.0.
- The TypeSafe upstream failed between ~10:38 and ~10:51 on 09-28 (`workflow_evaluation_failed`, 8 s, 0 tokens)
  while the local gateway stayed up. Gate live tests on a JEV self-test, not only on `/health`.
- Open idea (not tested): every session prints the self-test block, costing Claude output tokens; printing it
  only on failure would save them.
