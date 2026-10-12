# `eslint-plugin-eha` — the order of declarations, as a package of this monorepo

> Opened 2026-10-12, at the dev's request. Source of inspiration:
> `~/Desktop/WebstormProjects/eslint-plugin-fluid-react` (his plugin for Fluid's React library).
> **Status: done 2026-10-12** — steps 1–4 and 7 shipped, 5 and 6 dropped on measurement (below).

## Why

The dev re-reads the code and wants to find each declaration **where he expects it**: same order, same
separators, in every component and every function. Readability for a human reader is the goal; the
lint is how it stays true without anyone watching.

## What the dev asked (2026-10-12, verbatim intent)

| # | requirement | where it lands |
| --- | --- | --- |
| R1 | adapt Fluid's plugin to this monorepo, renamed `eslint-plugin-eha` (or `…-europe-historical-atlas`) | step 1 |
| R2 | an **installable package**, added to the monorepo's dependencies | step 1, wired at step 3 |
| R3 | rules at **`error`**, not `warn` — one author, nothing to count down | every wiring step |
| R4 | messages keep Fluid's **pedagogy**: say what to do, with the reader's own names | every rule |
| R5 | **Zustand selectors** are a declaration group of their own | step 2 |
| R6 | every group is preceded by a **separator comment**: `// State`, `// Refs`… | step 2 |
| R7 | applies to the **Cartographer and the atlas** | steps 3–6 |
| R8 | adapt the existing code **without forgetting anything** — one thing at a time | every step |
| R9 | a note in Basic Memory about this session | done 2026-10-12 |

## Inventory of Fluid's plugin — keep / adapt / remove

| piece | verdict | reason |
| --- | --- | --- |
| `component-body-order`: the group order | **keep, adapt** | the core of the request |
| `movableFunction` ("reads nothing from it, move it out") | **keep, generalise** | true of every function, not only components |
| `unknownHook` (every custom hook must be classified) | **keep** | otherwise `useHoldToOpen`, `useListCursor`… escape the rule |
| messages that write the fix with your names | **keep** | R4 |
| props destructured on the body's first line | **inverted — D1** | props are destructured in the signature, as 16 of our 18 components already do |
| `asChild`, `getAsChildElement`, `Children.only`, `mergeRefs`, `floating` group, `id ?? generatedId` | **remove** | Fluid-specific, zero occurrences here |
| `contextFactories` + type information for it | **remove** | no `createContext` in the Cartographer |
| `no-unstable-context-value`, `provider-with-memoized-context` | **remove** | same |
| `no-render-functions` | **remove** | zero occurrences (`const renderX =`) |
| `react-hooks` and `function-component-definition` in the preset | **remove** | already configured by the Cartographer |
| custom formatter | **remove for now** | `stylish` prints multi-line messages; revisit if they read badly |
| `no-inline-event-handlers` | **later — decision of the dev** | 29 inline handlers today; moves a lot of code |

## What is created

1. **Store group** (R5). Our components receive the store as a hook prop (`store: CartographerStoreHook`)
   and select with `const tool = store((state) => state.tool)` — 9 selectors in 3 components, values and
   actions interleaved today (`ToolRailPanel`: `tool`, `selectTool`, `penMode`, `choosePenMode`).
   Detected without names: a call whose single argument is an arrow `(state) => state.<member>`, on a
   callee configured by an option (`storeHooks: ['store']`). Values before actions — decision D2.
2. **Separator comments** (R6), one line per group, exact labels. This is the one thing the rule can
   **fix safely** (`eslint --fix` inserts the comment); reordering is never auto-fixed, because moving a
   `const` above what it reads breaks the code.
3. **Plain functions.** A fixed category order does **not** transpose to a computation: a guard reads the
   value computed just before it. What transposes:
   - `injected-deps-first` — a function taking `deps` / `context` / `options` destructures it on the first
     line (today `mapPipeline.ts` does both: `const { sources, ui } = context` and `context.sources.x`).
   - `factory-body-order` — a `create…` function (34 of them): dependencies → state (`let`) → inner
     functions → wiring (listeners, subscriptions) → `return` of the handle. The component order's twin.
   Both need a precise definition before code — written at their step, shown to the dev.

## Packaging — facts that decide the shape

| fact | consequence |
| --- | --- |
| Node **22.14**: type stripping is unflagged only from 22.18 | the plugin is **JS + JSDoc**, checked by `tsc --checkJs --noEmit` — no build step, ESLint imports the source |
| `pnpm-workspace.yaml` globs `packages/*` | the package is picked up by pnpm and Turbo with no list to edit |
| **Turbo does NOT hash a workspace dependency's sources by itself** — measured 2026-10-12, my plan said the opposite | `lint` depends on `^lint` and each consumer declares the plugin `workspace:*`; the root `eslint.config.js`, `tsconfig.json`, `.prettierrc` are `globalDependencies` (they were not: a pre-existing hole). See `troubleshooting.md` |
| `.lintstagedrc.json` globs `packages/*/src/**/*.{ts,tsx}` | rules live under `src/` and the glob gains `js`. **Known-issues trap: grep every `.ts'` glob in the config before writing the first file** |
| `sonar.exclusions` lists `*.test.ts`, `*.test.tsx` | add `*.test.js` |
| `scripts/merge-coverage.mjs` reads `packages/*/coverage` | picks the new package up; verify its `SF:` paths resolve |
| ESLint flat config has no cascade | the plugin package owns its `eslint.config.js` (plain JS, untyped) |
| Vitest per package, `core` under `node` | the plugin's tests run under `node`, with ESLint's `RuleTester` |
| plugin name `eslint-plugin-eha` | rule ids read `eha/component-body-order` |

## Steps — each one reviewed, tested, committed alone

| step | what | done when |
| --- | --- | --- |
| **0** | baseline: `pnpm type-check && pnpm lint && pnpm test` green, counts written down | numbers noted here |
| **1** | the package: `package.json`, `eslint.config.js`, `tsconfig.json` (checkJs), `vitest.config.ts`, README, `HOW-IT-WORKS.md` adapted; no rule yet. Lint-staged, Sonar, docs (`architecture.md`, `CLAUDE.md`: **four** packages) | `pnpm install`, gate green, Turbo lists 4 packages |
| **2** | `component-body-order` rewritten: groups `props → store → ids → refs → state → derived → handlers → effects → render`, separators, `unknownHook`, `movableFunction`, at `error`. 5-level tests, each guard proven by the plausible naive code | `RuleTester` green, sabotage falls |
| **3** | wired into the Cartographer (`workspace:*`, `error`), and **all 18 components + 8 custom hooks** brought in line in the same commit (an error rule cannot land red) | gate green; dev reads two components and says if it reads better |
| **4** | `movable-function` generalised to every function — atlas, Cartographer (and `core`, decision D4) | gate green |
| **5** | `injected-deps-first` — definition shown first | gate green |
| **6** | `factory-body-order` — definition shown first | gate green |
| **7** | `no-inline-event-handlers` — only if the dev wants it | — |

Before step 3, a **dry run**: the rule at `error` on the Cartographer, the list of every report written
here, so the dev sees the size of the rewrite before a line moves.

## Decisions — taken 2026-10-12

| | question | decision | by |
| --- | --- | --- | --- |
| **D1** | where are props destructured? | **in the signature**, "when it causes no problem" — `function X({ a, b }: XProps)`. A whole `props` stays whole only when the body never reads a field of it (it forwards it). Reading `props.a` is an error | dev |
| **D2** | where does the store group sit? | **right after props, before ids** — the store is injected like props, and a selector may read a prop. Order: `props → store → ids → refs → state → derived → handlers → effects → render`. Inside the group, values before actions | dev asked me to choose; mine |
| **D3** | separators on a tiny body? | **always** — "a system, not exceptions". A one-`return` body gets its `// Render` | dev |
| **D4** | does `core` get the plain-function rules? | **yes, if a rule is generic and coherent** — each plain-function rule is measured on the three packages first, and dropped if it needs exceptions | dev |
| **D5** | name | **`eslint-plugin-eha`**, rules `eha/…` | dev |

**One principle that is not an exception, and it is mine (D2 follow-up): a declaration never goes above
what it reads.** The order is by group, but the language forbids reading a `const` before it exists, so
a statement that reads a value declared lower in the group order stays below it — and the rule says
nothing. Fluid wrote this as a special case for floating-ui; here it is the general constraint. The
rule only ever asks for a move JavaScript can make.

**Mandate**: the dev gave full rights on 2026-10-12 to run the whole plan in one go, notifying progress and
completion. Commits per step; **no push** (he pushes).

## Outcome — 2026-10-12

| step | result | commit |
| --- | --- | --- |
| 1 | the package, JS + JSDoc checked by `tsc` | `bd0fd45` |
| — | **found on the way**: Turbo replayed a green lint after a rule or a root config changed. `globalDependencies` + `lint` → `^lint` | `c8eaa25` |
| 2 | `eha/component-body-order`: groups, separators (fixable), props in the signature, store values before actions by type | `fa6b2cf` |
| 3 | wired in the Cartographer at `error`: 91 separators by `--fix`, 13 moves by hand, `openingOf` in `PolityDialog` | `47e0394` |
| 4 | `eha/hoist-independent-function`, every package: 38 functions moved by its fix (1 in source, 37 in tests) | this step |
| 5 | **dropped** — `injected-deps-first` | — |
| 6 | **dropped** — `factory-body-order` | — |
| 7 | `no-inline-event-handlers`, the Cartographer: 20 handlers declared in their bodies — the dev left it to me, 2026-10-12; my call: yes, because a handler in the markup escapes `// Handlers` | this step |

**Why 5 is dropped (D4: generic and coherent, or not at all).** Measured on the three packages: 482
parameters are read field by field and never whole. The most frequent are `event` (21), `gui` (9),
`scene` (10) — read through **method calls**, `event.preventDefault()`: destructuring a method detaches its
`this` and breaks the code. Then `a` / `b` in the geometry, where `({ x: ax }, { x: bx })` reads worse
than `a.x - b.x`. The rule holds only with exceptions — by name, or for methods — which D4 rules out.

**Why 6 is dropped.** The 60 `create…` factories are sequential constructions: value, wiring, value,
value, wiring… (`VWVVWWR` is the typical shape — a three.js module creates an object, adds it to the
scene, creates the next). Wiring statements are barriers, so an order rule would move nothing and only
stack alternating separators. Same finding as for plain functions: a computation has its order already.

**What the review changed in step 4's fix**, all proven by sabotage: the text of a string or template
spanning lines is never dedented (checked on the 38 applied moves: no literal changed); a comment set
apart by a blank line stays; a name already bound at the module, or declared by another function of the
file, gets a report and no rewrite; a `vi.mock` / `vi.hoisted` factory is not reported (Vitest lifts it
above the module); an arrow reading `super` or `new.target` stays.

**Step 7, what the rule does that Fluid's did not.** Fluid's rule asked every inline handler to move up,
including one reading a `.map` row — a move JavaScript cannot make. Here that case gets its own message:
give the row a component of its own (Fluid's README already said so). Measured: none in the Cartographer
today. JSX that no component renders — a test's `it` callback — is outside the rule by definition, not by
a file glob. `PolityArrangeMenu` was split the same way: its handlers read a polity resolved after an early
return, so the menu of a polity known to exist became `KnownPolityMenu`, rather than a silent guard or a
`?? ''` in each handler (`rules/error-handling.md`).
