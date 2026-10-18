# Dashboard redesign: mock specification

Four static mocks of the Master-JEV Hook dashboard with the KeepGlide identity. Each mock is one
self-contained HTML file in this folder (`a-*.html` … `d-*.html`), opened directly in a browser,
with no build step, no external fonts and no network calls. The mocks are a visual contract: once
Sophia picks one, `gateway/src/dashboard.html` is rebuilt from it.

## What the dashboard is

A read-only page served by the gateway at `/dashboard`. It shows what the JEV decided for the hook
over the last 24 hours. **It is informative only:** no control on the page changes the gateway
(the old routing on/off switch is gone). The only controls are view filters: client, language,
theme, outcome filter of the request list, "show more".

## Identity (from `keepglide-company/brand/identity/README.md`)

| Token | Hex | Use |
| --- | --- | --- |
| Teal | `#2BB8AE` | primary: answered, links, the picked path |
| Teal light | `#7EE8DC` | highlights, hover, secondary panel |
| Coral | `#F2715F` | accent, **one element per composition** (the picked point, the live dot, one call-out) |
| Navy | `#1E2A47` | dark background; body text on light |
| Sky | `#9AD9E6` | dots, dashed lines, dividers, quiet UI lines |

Rules: text on Teal or Coral is white; text on Sky or Teal light is Navy; no second accent; no
gradients, outlines or shadows on any mark. System font stack only:
`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
code `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`. Tagline under the company mark
only: "Complexo, sem atrito" (pt-BR) / "Complex made frictionless" (en).

Marks, in `assets/`:

- `keepglide-icon-256.png`: the KeepGlide company mark (hang-glider on navy). Never recolour it;
  clear space of at least its own width; use it as is on Navy or on a white surface.
- `master-jev-hook-mark.svg`: the product mark, "the fork" (a question point, two Sky dotted paths
  left out, one Teal glide to the Coral point picked), transparent, for navy or dark surfaces.
- `master-jev-hook-icon.svg`: the same mark on the navy squircle, for light surfaces.

Masthead: product icon + "Master-JEV Hook" + "by KeepGlide" with the company mark small (24–32 px)
and the tagline. The product name is written exactly `Master-JEV Hook`.

Outcome colours must stay distinguishable without relying on hue alone (a label or icon
accompanies every colour): answered = Teal, partial = Teal light, abstain = Sky with a Navy label,
failed = Coral, skipped = a neutral grey derived from Navy at 40–50 % (never brown or warm grey).

Both themes exist. Light: surface white, plane `#F4F8FA`, text Navy. Dark: plane Navy, surface
`#26334F` (Navy lightened), text `#E9EEF8`. Contrast: body text ≥ 4.5:1, UI lines ≥ 3:1.
Each mock ships one theme as its default and switches with `data-theme` on `<html>`; a small
toggle in the masthead flips it (the one allowed script, ~10 lines).

## Content inventory (every mock shows all of it)

1. **Masthead**: product icon, name, "by KeepGlide", tagline; status pill (Online / JEV pausado /
   JEV falhando / Offline) with the live dot (Coral); model `jev-1.13.0 via TypeSafe`; client
   `hook`; "no ar há 3 h 12 min"; "último pedido há 4 s"; view controls (client, language, theme).
2. **Tiles** (24 h): Pedidos recebidos 612 (25,5/h); Respondidas 373 (61 %); Parciais 55 (9 %);
   Sem decisão 147 (24 %); Falhas 6 (1 %); Não enviadas ao JEV 31 (5 %); Confiança média 0,84
   (mín. 0,12); Tempo de resposta 302 ms (p95 391 ms); Tokens do JEV 858 k (822 k entrada ·
   36 k saída).
3. **Pedidos por hora**: 24 stacked bars, outcome colours; values in `sample-data.json`.
4. **Confiança das respostas**: histogram of declared confidence in 10 bins; dashed threshold
   line at 0,65 (Sky).
5. **Pesos e limiares** (new, the panel Sophia asked for; informative only):
   - Thresholds by risk: `low 0,65`, `medium 0,80`, `high 0,90`, with share of requests at each
     (70 % / 28 % / 2 %) and acceptance rate at each (71 % / 67 % / 55 %).
   - Score scales: pass rate at 0,65 by number of levels: 3 níveis 94 %, 4 níveis 37 %,
     5 níveis 15 % (n = 792 / 83 / 735), with the note "use 3 níveis descritos como situações".
   - Question types share: Choice 62 %, Score 30 %, Noul 8 %.
   - Composite weights of the latest weighted `jev_score`: clareza 0,30 · completude 0,30 ·
     segurança 0,40 → composto 0,62 (ok), shown as a weight bar.
   - A one-line note: "Uma Score abstida mantém o score esperado (provisório, ±1 nível); o
     ranking do jev_rank ordena todas, as abstidas em `abstained`."
6. **Pedidos recebidos**: table, newest first, 8 rows from `sample-data.json`, outcome filter
   chips, "Mostrar mais 30". Columns: Hora, Pedido, Pergunta, Resultado, Resposta do JEV,
   Confiança, Tempo, Tokens. One row expanded showing the questions, options and the answer.
7. **Avançado** (collapsed `<details>`): "Tokens do LLM: com JEV × JEV pausado" compare table
   (rows: pedidos medidos, tokens de entrada/pedido, …em cache, tokens de saída/pedido,
   …de raciocínio, segundos/pedido, total entrada, total saída).

Copy is pt-BR (the default language of the real page); code, ids and class names are English.

## Naming (canonical, enforced)

CSS follows `frontend-ui-reference`: kebab-case class selectors with BEM-like component prefixes
(`.tile`, `.tile__value`, `.tile--abstain`, `.masthead__status`, `.weights__bar`), no ID selectors
for styling, no abbreviations that are not words (`st`, `o`, `kv`, `opts`, `q` are banned). Colours
and sizes are tokens on `:root` (`--color-teal`, `--color-coral`, `--space-md`…) redefined for the
dark theme; components read `var(--token)` only. Outcome states are modifier classes
(`.tile--answered`, `.bar__segment--abstain`).

## Accessibility

Every chart has a text alternative (a visually hidden table or `aria-label` with the numbers);
status uses text plus colour; focus rings visible (`--focus-width: 3px`, Teal); keyboard-reachable
controls; `prefers-reduced-motion` respected; no colour pair below the contrast floors above.

## Sample data

`sample-data.json` holds the numbers above (hourly series, histogram, rows). Mocks inline the
values (static HTML); the file is the single source so the four mocks agree.

## The four directions

| Mock | File | Default theme | Direction |
| --- | --- | --- | --- |
| A | `a-navy-flight.html` | dark | Navy canvas like the company icon; Teal data, Sky lines, one Coral live dot; charts as thin horizon bars; calm, airy, generous spacing. |
| B | `b-daylight.html` | light | White surfaces on a pale Sky plane; Navy text; Teal fills; the fork mark large in the masthead; classic card grid, the weights panel as a wide card right under the tiles. |
| C | `c-glide-board.html` | light | Bento board: tiles of mixed sizes on one 12-column grid; the weights panel is the hero (thresholds as three vertical gauges, scales as a small bar chart); a faint Sky dot-field background (CSS radial pattern) echoing the brand's point field. |
| D | `d-instrument-panel.html` | dark | Dense telemetry: monospace numbers, a single horizontal 24 h timeline across the top, the thresholds as dial-like arcs (SVG), compact request list; for people who leave it open on a second screen. |

Each mock is at most 700 lines, readable at 1280 px and at 390 px (phone: one column, 16 px
gutters, no horizontal scroll).
