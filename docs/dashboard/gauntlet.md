# Dashboard critique gauntlet

## 1. Summary

- **What:** a four-round critique of the Master-JEV Hook dashboard page (`gateway/src/dashboard.html`) by 25 personas in five groups (designers, UI/UX, product owners, marketing and advertising, leadership). Each round: five critics in parallel, a consolidator, JEV triage, then two implementer packages on the same file.
- **When:** 2026-10-18, against the live page on port 8795. Screenshots at 1300 px (rounds 1 and 2) and 1568 px (rounds 3 and 4), dark and light, plus 390 px. Screenshots are not kept in the repository.
- **Models:** Haiku 5.5 at high for the designer, UI/UX and product critics and for all implementers; Sonnet 5.5 at medium for marketing; Opus 5.5 at medium for leadership and arbitration.
- **Triage:** JEV triage sorted each round's findings into adopt and skip. Where the JEV abstained, the local call was made and recorded in the round file (round 3: `request_decision` abstained at confidence 0.47).
- **Owner's rule:** "errors and harmonizing changes only". Adopted: regressions, copy in EN and pt-BR, a11y, honest data scope, offline and stale states. Result: 58 fixes adopted over four rounds (15, 16, 15, 12). The approved navy aurora E2 look was not changed.

## 2. The 25 personas

Names are from round 4. The five groups were the same in every round; some persona seats were renamed between rounds.

| Group | Persona | What they looked at |
|---|---|---|
| Designers | Brand designer | KeepGlide identity, brand colour use, pt-BR copy of the approved parts |
| Designers | Visual and typography designer | Type scale, text contrast, status pill colours in both themes |
| Designers | Motion and micro-interaction designer | Transitions, hover and focus motion, the reduced-motion rule |
| Designers | Icon and illustration designer | Icon symbols, their sizes and their meaning |
| Designers | Design-systems lead | Tokens, raw CSS values, spacing, segment contrast in dark |
| UI/UX | Information architect | Hierarchy, labels, repeated facts in the hero |
| UI/UX | Interaction designer | States: hover, focus, loading, empty, error, stale |
| UI/UX | Accessibility specialist | WCAG 2.2 AA, keyboard, screen-reader names, focus churn |
| UI/UX | Data-visualization designer | Charts, legends, axes, peak columns, honest encodings |
| UI/UX | Responsive designer | 390, 768 and 1280 px layouts, masthead wrapping |
| Product owners | Truthfulness PO | Whether each number and sentence is true for the data (averages, shares, buffer scope) |
| Product owners | Lay reader | First-glance reading by a non-expert; sums a reader can check |
| Product owners | Operations PO | Gateway and router states (down, paused, failing) and the alert logic |
| Product owners | Onboarding and copy PO | Newcomer comprehension; EN and pt-BR term consistency |
| Product owners | Behaviour-over-time PO | Early uptime, restarts, polling, rebuilds, refresh |
| Marketing and advertising | Brand strategist | Brand voice, colour emphasis, verdict wording |
| Marketing and advertising | Copywriter EN | English copy and term consistency |
| Marketing and advertising | Copywriter pt-BR | pt-BR copy, calques, anglicisms |
| Marketing and advertising | Growth and landing marketer | First screen at 1568 px; offline and empty states give a next step |
| Marketing and advertising | Art director | Visual weight of the page; spelling variants |
| Leadership | Head of design | Layout alignment (hero footers), visual regressions |
| Leadership | Head of UX research | Jargon in failure states; the reader's next step |
| Leadership | Head of product | Shares arithmetic; copy against product terms |
| Leadership | Chief marketing officer | Brand holding: coral use, chip row reading as facts |
| Leadership | Engineering lead (frontend) | Code-level regressions (frozen clock, rebuild logic) |

## 3. Round by round

Tagged findings are the bracket-tagged lines in the five persona reports of each round. Skip reasons are grouped in section 4.

### Round 1: first critique of the page

- Tagged findings: 125 (designers 23, UI/UX 27, product 22, marketing 26, leadership 27).
- Regressions found: none (first round).
- Consolidated: 16 items (F1 to F16). **15 adopted**; F16 (an extra masthead line under the subtitle) was not applied, and the approved look has no extra masthead lines.
- Skipped: 15 bullets. Ask owner: 3 questions.
- Adopted:
  - F1: full buffer shows "1,000+" and a kept-window note.
  - F2: average-confidence sub states its pool and the lowest value.
  - F3: No-decision ring sub notes Partial counted apart; shares rounded.
  - F4: response-time tile labelled as an average, with a 95% reply time.
  - F5: "last request N s ago" refreshes every 5 s.
  - F6: requests sub gives the rate over the hours shown.
  - F7: zero-request copy in the hero note and the tile.
  - F8: status band shows its evidence (share and alert threshold) with an icon.
  - F9: masthead threshold chip and confidence note name the three thresholds.
  - F10: first paint shows dashes and a waiting line; reserved heights; "hook" in the pill.
  - F11: Failures tile neutral at zero.
  - F12: live dot uses the ok colour; coral only on the mark.
  - F13: hero pair stretches to the tile column bottom; chart captions reserve two lines.
  - F14: title does not split at 390 px; tagline loses its leading dot.
  - F15: a11y: bar chart as one tab stop with arrow keys and focus ring; dark error text and control borders to 3:1.

### Round 2: second critique, after round 1

- Tagged findings: 97 (designers 21, UI/UX 16, product 19, marketing 21, leadership 20).
- Regressions found: 3. Hero share chip stretched to 53 px; round-1 5 s render key rebuilt charts and killed tooltips and selection; "24 hours" copy over a full buffer.
- Consolidated: 16 items, all adopted (R2-16 only merged the chips; the subtitle was kept).
- Skipped: 35 bullets. Ask owner: 15 questions.
- Adopted:
  - R2-01: hero "% of total" chip no longer stretched (28 px).
  - R2-02: 1 px surface separators between stacked segments.
  - R2-03: transitions on the chevron, filter pills and bar columns.
  - R2-04: aria-live removed from the status row; tooltip hidden from assistive tech.
  - R2-05: confidence histogram as one tab stop with arrow keys.
  - R2-06: masthead chips borderless; model chip hidden below 480 px; language and theme on one row at 390 px.
  - R2-07: tiles at a 89 px minimum height.
  - R2-08: honest scope when the 1,000-request buffer is full (hero note, window chip, tile).
  - R2-09: status band: failures outrank abstentions; "proposed" alert wording.
  - R2-10: gateway down: "not connected since HH:MM · showing last data".
  - R2-11: regression fix: charts rebuild per hour, not per 5 s.
  - R2-12: hourly note on empty early bars; busiest-hour unit; first histogram tick "< 0.45".
  - R2-13: no-decision note says it is not a failure and not an error.
  - R2-14: tile titles and subtitles shortened.
  - R2-15: summary reads "Advanced: tokens with and without JEV".
  - R2-16: uptime and last request merged into one chip.

### Round 3: third critique, after round 2

- Tagged findings: 82 (designers 13, UI/UX 11, product 20, marketing 18, leadership 20).
- Regressions found: 14, the largest set in any round. Examples: `capped` ignored the 24 h window; PT confidence note used dots as decimals; tooltip stuck after a rebuild; 1 px separators erased 1 to 2 request segments; `tick()` could stop polling after an exception.
- Consolidated: 16 items. **15 adopted**; R3-14 (chart baselines and centred threshold labels) skipped under the owner's rule, because round 1 anchored the labels to stop 390 px overflow.
- Skipped: 26 bullets. Ask owner: 21 questions (cumulative).
- Adopted:
  - R3-01: hover no longer recolours the pressed segment button.
  - R3-02: "·" separators between masthead chips (desktop only).
  - R3-03: `capped` honours the 24 h window.
  - R3-04: tooltip hidden before each chart rebuild.
  - R3-05: 3 px minimum segment height so 1 to 2 request segments show.
  - R3-06: latency tile renamed to name the JEV, with "average" in the sub.
  - R3-07: PT decimal commas in the confidence note; PT hourly note wording.
  - R3-08: confidence kicker drops "24 h" (the hourly kicker keeps "Last 24 h").
  - R3-09: `tick()` reschedules in `finally`.
  - R3-10: `role="img"` on bar columns.
  - R3-11: busiest-hour caption with a unit; non-breaking spaces in clock times.
  - R3-12: one shared sparkline scale for the hero pair.
  - R3-13: received tile uses whole hours, as the chip does.
  - R3-15: offline and failing band: frozen window, a next step, never blank.
  - R3-16: under 20 requests the band no longer says "All normal".

### Round 4: last round, ship check

- Tagged findings: 58 (designers 11, UI/UX 13, product 12, marketing 9, leadership 13).
- Regressions found: 6, all in round-3 fixes: R4-01 (R3-15), R4-02 (R3-15), R4-03 (R3-13), R4-04 (R3-06), R4-05 (R3-15), R4-11 (R3-11).
- Must-fix list: 12 items, **12 adopted** per the brief. The round-4 change list was not written as a separate file, so the adoption count rests on the brief and `r4/fixlist.md`.
- Polish for a later release: 11 items (P-01 to P-11), not adopted.
- Skipped: 9 bullets. Ask owner: 10 questions.
- Adopted:
  - R4-01: last-request chip keeps ageing while the gateway is offline.
  - R4-02: a paused router no longer reads as "needs attention".
  - R4-03: uptime under one hour: no "1 h of data" and no inflated per-hour rate.
  - R4-04: pt-BR latency title "Tempo do JEV" (leads' rule: shorter string, true in both states).
  - R4-05: failing copy: no "masthead", "status pill" or "no answer"; the failing causes are named correctly.
  - R4-06: Partial tile sub: no "cards" in pt-BR; one clear clause set in EN.
  - R4-07: shares rounded so they sum to 100 (largest remainder).
  - R4-08: bar focus stays on the column across polls; a click sets the focus index.
  - R4-09: the abstain band test uses the printed share.
  - R4-10: Score answers excluded from the confidence average and the histogram.
  - R4-11: hero footers aligned at 1568 px.
  - R4-12: light "Online" pill text raised to AA (4.5:1).

## 4. Not changed on purpose

Approved by the owner; no critic's finding changed them:

- Navy aurora background, with its dot field, glide arc and fork echo.
- Fork mark.
- Hero pair: Answered and No decision side by side, each with its "% of total" chip, ring and sparkline.
- Type scale.
- Tile set (six tiles).
- Two charts: requests per hour and confidence.
- Collapsed details: "Requests received" and "Advanced".
- English by default, with the live pt-BR switch.
- No help buttons.
- No extra masthead lines.
- Refresh cadence. The code polls every 2 s (`POLL_MS = 2000`) while the approved note says 5 s; the owner's rule kept the code as it is.

Cumulative skip list, by reason. Each item is listed once, with the round where it first came up.

**Conflicts with the approved look (owner's rule)**

- Hero pair internals: chip, sparkline, icons, kicker and numeral size (R1).
- Hero pair stacked or in two columns at 390 px; sparkline hidden under 480 px (R2).
- Chip moved under the numeral; 66 % repeated across chip, ring, legend and sparkline (R2, repeated R3 and R4).
- Hero kicker "JEV DECISIONS" removed or renamed (R2).
- Light No-decision tone darkened or lightened (R2, repeated R3 and R4).
- Empty early hourly columns removed, or a dashed baseline (R2, repeated R3).
- Fork echo resized, glide arc moved, aurora raised (R1, R2, R4).
- Tile column: tiles dropped, moved or reordered; Failures moved first; tokens de-emphasised (R1).
- Failures icon changed at zero; Failures value in accent colour; tokens value muted (R2).
- Tile stacked under 480 px; tile value moved under its label below 480 px (R2, R3).
- Disclosure headers with icon chip and kicker (R1, R2).
- Masthead chips in ghost style; model, port, threshold or uptime moved into Advanced (R1, R2).
- Port or pill text shortened; "Online" pill dot removed (R2, R3).
- Counts in collapsed summaries (R2, repeated R3 and R4).
- Compact token value "1.59M" (R3, R4).
- Reserved share slot in the confidence card; chart baselines and centred threshold labels (R2, R3, R4).
- Masthead height on desktop; tagline folded or hidden under 720 px (R1, R2).

**Taste or brand refinement (not an error)**

- Spacing: section gap 32 to 48 px (R1); page gap 48 px (R2, R3, R4). Raw literals moved to tokens (R1 to R4).
- Surface and colour: lifted dark ladder (R1, R2); tagline colour and size (R1, R2); light masthead wash; unified No-decision hue (R1); light mark-tile border (R2).
- Brand items: fork glyph in the status band; new icons (percent, dashed circle, above-usual glyph); teal brand line (R2, R3, R4).
- Motion: live-dot pulse (R1, R2, R4); skeleton shimmer (R1); tooltip and disclosure fades (R3, R4); small-icon stroke 3 (R3, R4).
- Copy voice: benefit captions, the "Everything's running smoothly" line, the quotable verdict line, the "656 decided" verdict (R1, R2); footer rewrite and tagline rewrite (R2, R4); "O JEV deu uma decisão em" (R3, R4); "limite" for "limiar" (R3).
- "Proposed alert" wording (R3, R4); "Last 24 h" hourly kicker kept, because its axis spans 24 h (R3, R4).
- Online pill: keep the dot, drop the check, or the reverse (R3).
- Long band sentence "All normal: the hook is online and no request failed" (R2).
- Band padding reduced (R2).

**Owner decision, or disruptive**

- Light Partial colour and palette change (R2, R3).
- Page gap, dark surface ladder, hatch on Partial (R2, R3).
- Request table as four fields below 960 px (R1).
- Offline dimming of hero and tiles; new "last data N min ago" chip (R2).
- Hero "JEV decided n of your total" note (R2, conflicts with the honest scope).

**Not an error, speculative, or deferred by the 16-item cap**

- Hourly bars before the first gateway start drawn as zero (R3; open as Ask owner 7).
- "JEV abstained" wording in the detail panel (R3; polish P-08).
- Home and End keys in the bar focus handler (R3; polish P-04).
- `!document.hidden` guard in `tick()` (R3): already present.
- Min-height 4 px and box-shadow separators (R3): replaced by R3-05.
- Tile minimum height 92 px (R3): superseded by the shorter latency title.
- Failures pointer and "0.89 out of 1" sub (R3).
- Window repeated in the received tile (R4): the leads kept it, because it is honest.
- Next-signature minute and unscoped `.filter:hover` (R4): no visible defect.
- `POLL_MS` 2 s against the 5 s note (R3, R4): owner's rule, not changed.
- "Tempo de resposta do JEV" as the pt-BR latency title (R4): longer than R4-04.

## 5. Open for the owner

Copied from the Ask owner list of `r4/fixlist.md`, as written:

1. The "66% of total" chip on the Answered hero: keep it, or read "66% of kept" while the 1,000-request buffer is full?
2. On phones (390 px) the first hero number sits below the fold: hide the thresholds chip under 480 px (safe), and/or accept it as it is.
3. Approve a server change that sends the risk thresholds, so the chip and note stop printing 0.80 and 0.90 as fixed text.
4. In dark mode Partial and No decision are 1.08:1 apart: add stripes, choose a new tone, or accept it (a possible WCAG 1.4.11 gap, not checked in a browser).
5. The peak column's top segment is clipped by the 3 px minimum: 12 px of top padding fixes it, but every bar becomes 6 % shorter.
6. After a failed call the band stays red until the next success: keep it red for one hour (proposed), then fall back?
7. Before the gateway's first start the hourly bars read as zero: add a "started at HH:MM" note in both languages?
8. Copy on approved elements: EN "colours" or "colors"; the two hero cards both say "JEV DECISIONS" (give them distinct kickers?); the confidence title.
9. The Online pill draws a dot and a check that both say "online": keep both, or only the dot?
10. Brand touches (tagline colour, fork glyph in the status band, new icons, teal brand line): one brand pass, or leave them as they are.

## 6. Round-4 ship verdict per group

| Group | Verdict | Conditions (round-4 fix IDs) |
|---|---|---|
| Designers | Yes | After R4-06 and R4-12. All five personas say yes; the partial-and-no-decision pair is the one owner decision. |
| UI/UX | Yes | After R4-01 and R4-08. The band-case and separator items are polish. |
| Product owners | No as written, yes after fixes | The behaviour-over-time persona says no until R4-03 is in. Then: truthfulness yes after R4-10 (and P-09); lay reader yes after R4-07; operations yes after R4-02; onboarding and copy yes after R4-04. |
| Marketing and advertising | Yes | After R4-04 and R4-06. P-07 is polish. |
| Leadership | Yes, unanimous | After R4-11, R4-01 and R4-05, with R4-07 and R4-04 in the same pass. |

Conditions for all groups: every must-fix item is in; each is checked in EN and pt-BR, dark and light, at 1568 px and 390 px; and an offline check passes (stop the gateway: the chip ages and the band says "not connected since"). The ask-owner items do not block ship, except owner item 4 if WCAG 1.4.11 must be cleared before release. That item was not checked in a browser.

## 7. How to run it again

Launch five critic groups in parallel, one per group, each with the persona brief and the current page at 1568 px (dark and light) and 390 px. Each critic tags every finding with a severity and a fix line. A consolidator merges the five reports, removes duplicates, and checks each finding against the source with `rg` and short line reads. JEV triage then sorts the findings into adopt, skip and owner, and the owner's rule is applied as the tiebreaker. Two implementer packages edit the same file: one for data and copy, one for layout, a11y and motion. Then run the build, the tests for the dashboard and `cmp` the served page against the file. Restart the gateway service so it serves the new page, and take the screenshots again at 1568 px dark and light and at 390 px. The next round starts from the new screenshots and the skip list in section 4.
