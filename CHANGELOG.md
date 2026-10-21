# Changelog

All notable changes to Master-JEV Hook. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow SemVer and the gateway's `package.json`. The measurements behind each entry live in
[`docs/experiments.md`](docs/experiments.md).

## [Unreleased]

### Fixed

- **The MCP server no longer fails to start when Claude Code is opened inside this repository.** The root `.mcp.json`
  was read as a project-scope config, where `${CLAUDE_PLUGIN_ROOT}` is not expanded, so `node` got a literal path and
  exited before the handshake (`CONNECTION_CLOSED`). The plugin's server definition moved to
  `.claude-plugin/mcp.json` and `plugin.json` points there.
- **Gateway and dashboard gauntlet (2026-10-21).** One loop of critics over the gateway, launcher, hook and dashboard,
  under the owner rule "errors and non-disruptive gains only; layout is decided". Adopted:
  - credentials never leave in output: `/health`, the dashboard and the startup line show the upstream as origin and
    path only; JEV and upstream fetch errors no longer echo a credential-bearing URL; `UPSTREAM_BASE_URL`, `JEV_URL`
    and `TYPESAFE_BASE_URL` with userinfo, query or fragment are refused at start;
  - the Claude hook redacts more secret formats before state leaves the machine (Google `AIza`, Stripe live keys,
    GitLab `glpat-`, Hugging Face `hf_`, npm `npm_`, Google OAuth `ya29.`, JWT/JWE, whole `Cookie:` headers, cookie and
    session values);
  - request handling: `Content-Encoding` honoured on `/router/decide` and `/master/*` with the decoded size capped by
    the route's own limit, `identity` encoding accepted, array bodies refused, `invalid_objective` returned as its own
    reason, unexpected errors answered as JSON, prototype-named tools and arguments kept intact, `none_of_these`
    reserved like `no_tool_needed`;
  - the workflow `ok` count skips skipped steps and an abstained choice is `null`;
  - client usage: a token count sent as `null` is unknown, not zero, and never erases a known count;
  - events: the tail read keeps the first line at an exact line boundary, and one bad log line no longer stops the
    replay; the debug dump directory is private (0700) and dumps are written atomically;
  - launcher `--stop` confirms the pid is the gateway before signalling it (Linux, macOS; a stale pid file of a dead
    process is cleaned up as before), and a router that won the port is checked for its upstream;
  - dashboard: the first hourly bar takes the partial hour, the failure streak ignores the active filter, the page says
    offline after its gateway's first failed poll, five missing reason labels exist in both languages, and keyboard
    focus survives a re-render. The layout did not change;
  - the dashboard responses send `X-Content-Type-Options: nosniff` and `frame-ancestors 'none'`;
  - the MCP server reports the package version; tests no longer leave temp directories behind.

### Changed

- **The README pairs follow the KeepGlide README standard.** The root pair gains the banner, the badges, a contents block, and the Status, Updating, Known issues, Tests and Contributing sections; "Uninstall / restore backup" and "Privacy and costs" are renamed to Uninstall and Security and privacy. The `gateway/` pair gains Prerequisites, Usage, Configuration and Tests (its Commands section becomes Usage). `SECURITY.md` is added.
- **Invalid boolean or port values in the gateway env now stop the start with a clear message** instead of silently
  turning a feature off. A missing JEV key no longer stops the gateway at start: it prints one warning line and each
  JEV call reports the missing variable.

### Not changed, on purpose

- **The JEV model stays pinned to `jev-1.13.0`.** `jev-1.14.0` (2026-10-14) is still a preview (`jev-latest` points to
  1.13), and our replay found a Bash-gate regression on it: `git push --force origin main` passes as `routine` above
  the 0.80 floor. Record: `docs/experiments.md`, 2026-10-21.
- **No-parameter tools still get a direct answer with `JEV_DIRECT_CALLS=false`.** A critic proposed gating them on the
  flag; it would add an upstream round trip per request under the default config, so it was reverted as disruptive.

## [1.3.0-beta.2] - 2026-10-19

### Changed

- **The dashboard page is rebuilt after mock E "navy aurora"** with the KeepGlide identity and the product mark
  ("the fork", KeepGlide DEC-004): navy canvas, floating cards, a hero pair Answered / No decision with
  plain-language captions, a one-line status sentence (abstentions above the usual share only from 20 requests),
  tiles, the two charts, and the request list and advanced data collapsed. English by default with a live pt-BR
  switch; light and dark follow the system. The rows switch and its `POST /dashboard/routing` call are gone from
  the page (the route stays). Help buttons were tried and dropped: the cards explain themselves. CSS classes are
  kebab-case BEM names (`aebc8d5`). Mocks and contract in `docs/dashboard/mocks/`; Sophia chose mock E on
  2026-10-18 and its KeepGlide refinement E2 feeds the next pass.
- **The dashboard page now carries the KeepGlide "E2" look.** A light aurora wash, a dot field, a glide arc and a fork
  echo sit behind the page, the fork mark grows to 64 px, the Answered numeral and the ring use a teal-light accent,
  and the muted text and live dot gain contrast. Data behaviour is unchanged. Restart the gateway service to serve it.
- **The dashboard went through a four-round critique gauntlet.** Twenty-five personas in five groups (designers, UI/UX,
  product owners, marketing and advertising, leadership) reviewed the page, and 58 fixes were adopted under the owner's
  rule "errors and harmonizing changes only": regressions, copy in EN and pt-BR, a11y, honest data scope, and offline
  and stale states. The approved navy aurora E2 look was deliberately not changed. Record:
  [`docs/dashboard/gauntlet.md`](docs/dashboard/gauntlet.md).
- **The ten owner questions of the gauntlet are answered and shipped.** The risk thresholds now travel in the
  `/dashboard/events` router payload (`riskThresholds`) and the page prints them instead of fixed text; the hero chip
  says "of kept" while the buffer is full; Partial is striped in the dark theme; the red band says since when it is
  red; the hourly chart notes the gateway's start time and keeps 12 px of top room; the thresholds chip hides under
  480 px; the confidence title and the EN spelling are revised. Record: gauntlet.md section 5.
- **The dashboard got its brand pass (gauntlet owner question 10).** The tagline takes the identity sky/ink tokens, a
  20 px fork mark leads the status sentence (hidden under 480 px), four icons (Partial, Not sent, Tokens, bars) now use
  Lucide geometry, and a 2 px teal line tops the masthead. Nothing else changed. Record: gauntlet.md section 5, item 10.

### Fixed

- **The JEV answers far more often in batches (`jev_score`, `jev_rank`).** Since 2026-10-17 whole batches came back
  abstained (8 of 8 in most rounds). The cause was not the JEV: Score `confidence` is a spread measure, not a
  probability, and on 5-level scales it passed the 0.65 floor only 15 % of the time, even when the mass sat on two
  adjacent levels and the ordering was right. The gateway now keeps the expected `score` of an abstained Score under
  `status: abstain`, and `jev_rank` orders every scored candidate while listing the doubtful ones in `abstained`.
  The tools, skill and READMEs tell callers to ask for 3 levels described as situations (94 % pass rate) instead of
  4 or 5 degree words (37 % and 15 %). Commit `9225450`, merge `519f32d`.
- **The hook's own questions abstain much less.** `direction` (drift detector) now describes situations and defaults
  to `on_track` unless the recent actions clearly show otherwise: abstention 92 % → 19 % on reconstructed real
  states. `completion` (Stop check) asks the one thing the hook acts on, `done_unverified` versus `other`: abstention
  39 % → 20 % with the same recall and no new false flags. Commit `1ca9c12`, merge `021bcb4`. Applied to the
  installed copy by `install.py --target claude-code` on 2026-10-18 (installed `claude_jev.py` matches the repository).

### Not changed, on purpose

- **No weight or threshold changed.** The confidence floors stay `0.65` (low risk), `0.80` (medium) and `0.90`
  (high), and `risk` (the Bash gate) keeps its wording and its 0.80 floor: two rewordings were tested and both
  lowered the pass rate on the 94-case gauntlet, so its abstentions are the bar doing its job. Composite scores and
  cascades still gate on `status`, so an abstained score never turns into a value. A Score-only lower floor and a
  "mass within one level" rule were rejected because they would change the documented threshold contract.

## [1.3.0-beta.1] - 2026-10-17

- See the git history up to tag `v1.3.0-beta.1`; this changelog starts after it.

[Unreleased]: https://github.com/KeepGlide/master-jev-hook/compare/v1.3.0-beta.2...HEAD
[1.3.0-beta.2]: https://github.com/KeepGlide/master-jev-hook/releases/tag/v1.3.0-beta.2
[1.3.0-beta.1]: https://github.com/KeepGlide/master-jev-hook/releases/tag/v1.3.0-beta.1
