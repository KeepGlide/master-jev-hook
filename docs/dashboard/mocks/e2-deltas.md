# Mock E2 deltas (from mock E, navy aurora)

Source mock: `e-navy-aurora.html` (unchanged). Result mock: `e2-navy-aurora-keepglide.html`.
Scope kept from E: layout, grid distribution, every `--text-*` size, radii, spacing, shadows, the hero pair with the tiles column, the charts, the table, the advanced compare table. E2 adds personality, a language switch and a hero pair in equal columns (revision 2 drops the asymmetric widths and the offset).

## 1. Token changes

| Token | E value | E2 value | Why |
| --- | --- | --- | --- |
| `--muted` (dark) | `#a5aebf` | `#b8c0d0` | Footer text on the worst-case aurora page was 3.97:1; now 4.85:1 |
| `--muted` (light) | `#4a5670` | `#4a5670` | unchanged |
| `--signal` (light) | `#f2715f` | `#d9503d` | Coral live dot on the light page was 2.65:1; now 3.75:1 (dark keeps `#f2715f`) |
| `--glow` | `#2bb8ae` | removed | The 26 % hero halo is replaced by the page aurora (below) |
| `--hero-value` (new, dark) | (none) | `#7ee8dc` | Teal-light Answered numeral |
| `--hero-value` (new, light) | (none) | `#02736c` | Teal-dark Answered numeral on white (5.72:1) |
| `--ring-fill` (new, dark) | (none; ring used `--accent` `#2bb8ae`) | `#7ee8dc` | More teal-light energy on the ring |
| `--ring-fill` (new, light) | (none; ring used `--accent` `#2bb8ae`) | `#02736c` | Ring stroke at 3:1 or more on white |
| `--aurora-teal` (new) | (none) | `#2bb8ae` (both themes) | Teal glow, page background |
| `--aurora-teal-strength` (new) | (none) | `9%` | Glow strength, kept under 9 % |
| `--aurora-sky` (new) | (none) | `#9ad9e6` (both themes) | Sky glow, page background |
| `--aurora-sky-strength` (new) | (none) | `7%` | Glow strength, kept under 8 % |
| `--dot-field` (new) | (none) | dark `#9ad9e6`, light `#1e2a47` | Dot field colour |
| `--dot-opacity` (new) | (none) | dark `0.07`, light `0.06` | Dot field layer opacity |
| `--motif` (new) | (none) | dark `#9ad9e6`, light `#1e2a47` | Glide arc and fork echo colour |
| `--motif-opacity` (new) | (none) | dark `0.06`, light `0.05` | Glide arc and fork echo layer opacity |
| `--flag-navy`, `--flag-red`, `--flag-white` (new) | (none) | `#012169`, `#c8102e`, `#ffffff` | Union Jack artwork for EN |
| `--flag-green`, `--flag-yellow`, `--flag-blue` (new) | (none) | `#009c3b`, `#ffdf00`, `#002776` | Brazil artwork for PT |
| `--text-xs`, `--text-sm`, `--text-md`, `--text-lg`, `--text-h3`, `--text-h2`, `--text-numeral` | as E | as E | Type sizes kept |
| `--space-*`, `--radius-*`, `--shadow-1..3`, `--edge-light`, `--tint-answer`, `--tint-abstain`, `--accent`, `--accent-text`, `--focus`, `--on-accent`, `--border*`, `--control-border`, `--surface`, `--raised`, `--bg`, `--text`, `--heading` (dark and light) | as E | as E | Unchanged |

## 2. Layout and component changes

| Area | E | E2 | CSS class names |
| --- | --- | --- | --- |
| Page background | flat navy, plus the hero halo | aurora wash (teal and sky glows), dot field fading down, a faint glide arc across the hero, the fork echo at the right | `.field`, `.field__dots`, `.field__glide`, `.field__fork` |
| Fork mark | 56 px | 64 px desktop, unchanged artwork (embedded as a data URI, byte for byte) | `.masthead__icon` |
| Masthead brand gap | 16 px | 32 px | `.masthead__brand` |
| Company mark | none | 24 px PNG (data URI), no recolour | `.masthead__company` |
| Tagline | pt-BR only, in the by-line | EN and PT, bold, beside the company mark | `.masthead__tagline` |
| Language switch | none (pt-BR fixed) | segmented EN / PT, inline SVG flags, 44 px targets, `aria-pressed` | `.segmented`, `.segmented__option`, `.flag` |
| Hero pair | equal columns | Two equal columns from 720 px (`repeat(2, minmax(0, 1fr))`), both cards stretched in one row with the same top edge, no offset; each card is a grid whose last row holds the ring and the sparkline side by side | `.hero-pair`, `.hero-panel`, `.hero-panel__head`, `.hero-panel__foot`, `.hero-panel--answered`, `.hero-panel--abstain` |
| Hero caption | none | one warm line in text colour above the note | `.hero-panel__caption` |
| Hero halo | `.hero-row::before` radial 26 % | removed | (was `.hero-row::before`) |
| Tile grid | 3 columns | 3 columns, `auto minmax(0, 1fr) auto` (the 44 px info reserve is gone) | `.tile` |
| Live dot | Coral, masthead | Coral, masthead, still the only Coral use in the UI | `.live-dot` |
| Number formats | fixed pt-BR text | `data-format` (`integer`, `decimal` with `data-digits`, `percent`, `milliseconds`) formatted per language by one function | `[data-format]` |
| Language and text | pt-BR text | one dictionary, EN default, `data-i18n` and `data-i18n-label`, `<html lang>` updated, choice in `localStorage` inside try/catch | `[data-i18n]`, `[data-i18n-label]`, `[data-language]` |
| Stacked table labels | `data-label` in markup | set by script from the header text, so they switch with the language | `.table--requests` |

## 3. Caption and copy changes (EN default, pt-BR second)

Captions now speak in the KeepGlide voice, short and plain. Examples: "373 answers, clear and confident." (pt-BR "373 respostas, claras e seguras."); "147 times the JEV chose to stop." (pt-BR "147 vezes o JEV preferiu parar."), one line like the Answered caption.

## 4. Deviations from the brief and open points

- Clear space around the fork mark is 32 px to the text block, not the mark's own width. The identity rule asks for own-width clear space; the masthead layout keeps E's density.
- The tagline sits beside the company mark in the masthead, as Sophia asked. The identity README places it under the mark and outside the app UI; flag this for Sophia.
- Both marks are embedded as data URIs so the file stays self-contained. The company mark is a PNG, so it is not a vector master.
- The Union Jack and Brazil flags use fixed flag colours through the `--flag-*` tokens, not theme colours.

## Revision 2 (Sophia's review)

Applies to `e2-navy-aurora-keepglide.html` only. Measured in Claude in Chrome on 2026-10-18 with `getBoundingClientRect` inside a 1280 px iframe and a 390 px iframe (CSS px).

1. **Info buttons and help dialog removed.** Gone: the six `.info-button` (Answered, No decision, Partial, Failures, Not sent to the JEV, Response time), the shared `#help-dialog` and its `.help-dialog*` CSS, the open, fill and close script, the `--info-glyph` token, the `icon-info-mark` symbol, the `help.*` strings in EN and pt-BR, and the 44 px reserve on the tiles. The cards keep their explanation in their captions. No help button remains. The `icon-info` symbol stays: it is a decorative icon in the Advanced summary and the footer, not a help control.
2. **Hero pair aligned.** Both cards start on the same top edge. At 1280 px both tops are 338.6 px. At 390 px the cards stack (tops 591.9 px and 1098.3 px).
3. **Equal widths.** At 1280 px both cards are 378.7 px wide (before: Answered about 450 px, No decision about 376 px). At 390 px both are 344.4 px. The asymmetric composition (1.2 fr against 1 fr) is dropped; the hero pair is equal columns, no asymmetry.
4. **Ring and sparkline side by side in both cards.** The sparkline no longer drops below the ring in No decision. Each card is a grid with rows `auto auto auto 1fr auto`, so the last row (ring and sparkline) sits at the same height in both cards.
5. **Caption shortened to one line.** No decision: "147 times the JEV chose to stop." (pt-BR "147 vezes o JEV preferiu parar."). Its wrap pushed the note down by 23 px.
6. **i18n keys renamed**, in both dictionaries and in the markup: `requests.colX` to `requests.columnX` (8 keys), `requests.respX` to `requests.responseX` (5 keys), `tile.*Sub` to `tile.*Subtitle` (7 keys). The 144 `data-i18n` elements and the 10 labels were scanned in EN and PT: no empty text and no text equal to its key.

### CSS changes in the hero pair

- `.hero-pair`: `grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr)` becomes `repeat(2, minmax(0, 1fr))`; `align-items: start` becomes `stretch`.
- `.hero-panel--abstain`: `margin-top: 32px` removed.
- `.hero-panel--answered`: no width or offset rule (the file never had one); it keeps only the teal `.hero-value` colour. Its width now comes from `.hero-pair`.
- `.hero-panel`: `display: flex` column becomes `display: grid; grid-template-rows: auto auto auto 1fr auto`.
- `.hero-panel__head`: flex wrap becomes a two-column grid; the icon spans two rows and the badge sits under the title, in both cards.
- `.hero-panel__foot`: `flex-wrap: wrap` becomes `nowrap`; `.sparkline`: `flex: 1 1 200px` becomes `flex: 1 1 0`.

### Measurements

| Check (1280 px) | Answered | No decision |
| --- | --- | --- |
| Card left / top / width | 49.2 / 338.6 / 378.7 | 443.8 / 338.6 / 378.7 |
| Title top | 395.6 | 395.6 |
| Badge top | 430.2 | 430.2 |
| Number top | 474.2 | 474.2 |
| Caption top (one line in both) | 562.2 | 562.2 |
| Ring top | 749.8 | 749.8 |
| Ring right to sparkline left | 194.1 to 218.1 (24 px) | 588.7 to 612.7 (24 px) |

At 390 px the cards stack, both 344.4 px wide. Ring right is 160.9 and sparkline left is 184.9 in both cards. The page has no horizontal overflow (scroll width equals client width).

### Checks

- `check_mock.py e2-navy-aurora-keepglide.html --max-lines 900`: 27 checks, 0 failed.
- `node --check` on the script: passes.
- `grep` for `info-button`, `help-dialog` and `dialog` in the mock: no hits.
- Screenshots in `screenshots/`: the eight `e2-navy-aurora-keepglide-<theme>-<width>-first-<lang>.jpg` files replaced; the two dialog screenshots deleted.
