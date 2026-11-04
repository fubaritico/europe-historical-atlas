# End-to-end tests with Playwright — the epic

> The dev's call, 2026-11-04: *"you make me test scenarios by hand — maybe it is time to bring in Playwright or
> Cypress, to make sure at least the bare minimum works."* Then: an epic whose goal is **the most scenarios covered by
> Playwright**, one setup ticket, and tickets that are **batches of tests to write**. Not for now — the order is his.
> Trello: the epic **REPO-346** in Chantiers, its tickets in Backlog, each depending on the setup (label `chantier · playwright`).

## Why, and why Playwright

**What Vitest under jsdom cannot see** is today checked by the dev alone, by hand: the focus of a `<dialog>`, keys
heard by `window`, the computed style of a layered cascade, a clipboard kept in the tab across two maps
(`s07`'s walk already said it: *"such bugs want Playwright"*; memory `browser-bugs-want-playwright`).

**Playwright over Cypress**, for three facts:

| need | Playwright | Cypress |
| --- | --- | --- |
| two pages, two maps open (copy in one, paste in the other — `s22`) | native (`browser.newContext`, `context.newPage`) | *"Multiple browsers open at the same time"* is listed among its **permanent** trade-offs; multiple tabs only through the `@cypress/puppeteer` plugin — docs.cypress.io/app/references/trade-offs, **found** 2026-11-04 |
| real keys (‹cmd+C›, arrows in a menu bar) | through the browser's protocol, trusted events | mostly events simulated from inside the page — **from memory**, to check before quoting |
| Safari's engine — the dev is on a Mac | WebKit runs | not WebKit in the same way — **from memory** |

## The constraints the setup must answer first

1. **Blocking — the tests must never write the dev's years.** The Cartographer's years folder is hard-coded
   (`packages/cartographer/vite.config.ts:16`, `YEARS_DIR`) and a map saves itself two seconds after every gesture
   (`s18`, `s19`). A test that draws would overwrite `years/1100`. **Remedy**: the folder read from an environment
   variable, set only by Playwright's server, pointing at a copy of a **test year** created per run in a temporary
   folder; unset, the dev's folder as today. The atlas reads `years/` through the shared `publicDir` — its tests read
   the same test year, or assert only what does not depend on the drawing (to decide in the setup ticket).
2. **His servers are his** (memory `one-dev-server`): Playwright starts **its own** server on a fixed port of its own
   with `--strictPort`, never reuses one already running (`reuseExistingServer: false`), and stops it at the end.
3. **The canvas is not readable as a picture.** A test asserts what the chrome says — the status bar, a panel, a
   menu's state, a file written to the test folder — never pixels. If a gesture leaves no trace outside the canvas,
   a read-only handle on the store **in the test server only** is a seam decision for the dev, raised then, not
   assumed.
4. **Not in the commit gate.** The local gate already goes red under load on correct code (REPO-260). The e2e tests
   run on demand (`pnpm e2e`) and as **their own CI job**, which does not block the others while it is new.
5. **Every console error fails the test** — `page.on('console')` and `page.on('pageerror')`: the code logs every
   refusal (`rules/error-handling.md`), so an `error` that no test expected is a defect.

## One test per scenario, and back

A scenario walked by hand becomes a test; a test names its scenario in a comment, never in its name (memory
`test-names-are-factual`). `/scenarii-to-code` gains the rung: a scenario's `Then` line can be **covered by e2e**.
Coverage is counted per scenario in each `s00-index.md`, so the epic's goal — the most scenarios covered — is a
number read there.

## The tickets — a setup, then batches

| ticket | what | scenarios |
| --- | --- | --- |
| **setup** — REPO-347 | Playwright installed in its own package or in the apps (decided there), its config, the years folder injectable, the test year, the console guard, `pnpm e2e`, the CI job, **one smoke test per app** (it opens without a console error) | — |
| Cartographer 1 — CARTO-348 | open, navigate, save, reopen, the automatic save, maps as folders | `s01`, `s04`, `s18`, `s19` |
| Cartographer 2 — CARTO-349 | the menu bar, every shortcut, copy and paste between two maps | `s22`, CARTO-239 |
| Cartographer 3 — CARTO-350 | draw and correct an outline, islands, out of frame, tools waiting for the zoom | `s02`, `s03`, `s11`, `s12`, `s17` |
| Cartographer 4 — CARTO-351 | the registry, vassalage, stacking, overrides | `s07`, `s08`, `s13`, `s16` |
| Cartographer 5 — CARTO-352 | the panels: history, cities, moved and docked | `s14`, `s20`, `s21` |
| Cartographer 6 — CARTO-353 | names, the check before publishing, derived years, offline | `s05`, `s06`, `s09`, `s10`, `s15` |
| Atlas 1 — ATLAS-354 | open, navigate, click and focus, levels of detail | atlas `s01`–`s04` |
| Atlas 2 — ATLAS-355 | countries, cities, events | atlas `s05`–`s07` |
| Atlas 3 — ATLAS-356 | the sheet, what is missing, language, help, the pad, the snapshot, the century | atlas `s08`–`s15` |
| CMS 1 — CMS-357 | the city at a date, the sources, the export read by the atlas | CMS screens — **depends on the test base, CMS-279** |

Each batch depends on the setup. A batch whose scenarios are not built yet (the pastes, `s22`) covers what exists
and lists the rest on its card.
