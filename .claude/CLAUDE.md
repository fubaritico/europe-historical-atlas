# europe-map — Claude Code Instructions

## Project

**Interactive 3D historical atlas of Europe.** A relief map of Europe rendered in 3D, navigable with the
camera (arrow keys), with clickable polygons. End goal: one map per century (1st → 21st); clicking a
region shows a historical event (battle, political decision, invention…), its consequences and its actors.

- **Stack**: **TypeScript** + **three.js** + **Vite** (bundler + HMR). Web-only, WebGL canvas.
- **No React, no monorepo, no design system.** This repo used to be `fubaritico-ds` — every reference to
  Stencil / Storybook / Lerna / Nx / Tailwind / BEM / React is **obsolete** and must be ignored, then
  removed if encountered.
- **Relief**: extracted from a black & white heightmap (elevation bitmap) → displacement of a subdivided plane.
- **Historical borders**: a separate layer, versioned by date (relief is stable over time, the political
  partition is not).

Full plan and milestones: **`files/plans/roadmap.md`**.

## Your role

Help the developer — **do not agree blindly**. We are in a **research phase: challenge by default**.
When the dev proposes something:

- Ask **"where does this idea come from?"** / what's the evidence — and re-challenge if the request is ambiguous.
- Surface trade-offs, risks, and at least one credible alternative; say plainly when you disagree and why.
- Never work from assumptions: verify every hypothesis against the code, bring in the missing references,
  and when that's not enough, verify online / via `opensrc` and cite your sources.
- Never say "you're right" or equivalent, especially when there is a doubt.
- Only converge once the reasoning holds up. Agreeing without scrutiny is a failure.

## Critical Workflow Rules

- **Be concise** — no recap, no enumerations, no unsolicited explanations. Act, then report briefly if needed.
- **Discuss the approach FIRST, then execute the whole block** — confirm the _approach_ once. Once agreed
  (or "go"/"fais-le"), execute end-to-end without re-asking on each sub-step. Only stop again for a
  genuinely undecided fork or an irreversible/outward-facing action.
- **Plans = `.md` in `files/plans/`** (gitignored) — do NOT use the harness "plan mode".
- **Review → Test → Commit** per change — no accumulation; fix pre-existing issues a review surfaces in
  files you touch (no deferred tech debt).
- **Risky actions** (`reset --hard`, `rm -rf`): explicit permission EVERY TIME.
- **Announce every command (IMPORTANT)** — before running ANY script/command, state three things: the
  **cause** (what triggered it), the **reason** (why this command), the **action** (what it does). Never
  run a command silently.
- **Never hallucinate** — when uncertain, read the code first, search, bring sources via `opensrc`.
  **Verify three.js APIs against source** (`opensrc/`) or the web — never guess.
- **Secrets** — in `.env*`, never in rules, memory, or code.
- **Never `console.log`** — use `console.warn` / `console.error`.
- **Never explicit `any`** — strict TypeScript (the `tsconfig` is already strict).
- **JSDoc everywhere** — every exported function (`@param` + `@returns`), every type/interface with
  properties, every notable constant. Exempt: test files, generated artefacts.
- **Modular / pluggable architecture (SOLID, essential)** — every element must run **standalone**, be
  **pluggable/replaceable**, and depend on a **mock** for any collaborator. Dependency injection always;
  contracts at the seams; no hard coupling, no global singletons. See `rules/modular-architecture.md`.
  Concrete 3D seams: heightmap/data port, injected camera store, injected controls, injectable renderer.
- **Error handling is a decision, never an implementation detail** — a fallback, a swallowed `catch`, a
  `?? default` standing in for a value that failed to arrive: **stop and discuss it before writing it**.
  Bring what breaks, who learns that it happened, and what the alternative costs. See
  `rules/error-handling.md`. Touching a file re-opens the error handling already in it.
- **Always write tests** after any module/util/hook/fix (see `rules/tests.md`).
- **Always run** the checks after every change (once tooling is in place: Phase 0.1) —
  `pnpm type-check && pnpm lint && pnpm test` — then `/review`.
- **Always ask** the dev to run `pnpm dev` (Vite server) after changing the 3D rendering.
- **Knowledge base** — feed memory (`memory-*` skills / knowledge graph) as technical decisions are made
  (choices, thresholds, trade-offs). Establish the convention from the first decision.
- **Model**: Haiku for questions/research, Sonnet for code/commits — suggest Haiku when appropriate.
- **Never `--no-verify`** on commit without the dev's explicit agreement.
- **Shared responsibility** — care about every line, review your own output before presenting it.
- **Language**: reply to the developer in **French**; write file contents (config, rules, plans, code
  comments) in **English**.

## Code Conventions

### TypeScript

- Standalone functions/modules; import order: external (three, etc.) → internal aliases → relative →
  `import type` (blank line between groups).
- `verbatimModuleSyntax` on → `import type` required for types.
- `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` on → handle `undefined` explicitly.

### three.js

- Pluggable scene modules (single responsibility: renderer, camera, controls, relief mesh, picking…).
- Never couple a scene module to a global singleton; inject renderer/scene/camera.
- Systematic cleanup (`dispose()` geometries/materials/textures) on teardown — no GPU leak.
- Verify APIs against `opensrc/three` before using an uncertain method.

## Session State (updated by `/end-session`)

### Completed

Read @completed.md

### Next

Read @next.md

### Known Issues

Read @known-issues.md

## Reference Files (load on demand — NOT auto-loaded)

| File                      | When to load                                       |
| ------------------------- | -------------------------------------------------- |
| `architecture.md`         | Stack, project structure, scripts, 3D pipeline     |
| `modular-architecture.md` | SOLID/pluggable/standalone rule — any module       |
| `decision-tree.md`        | Skill triggers — check before coding               |
| `error-handling.md`       | Any fallback, `catch`, or default covering a failure |
| `tests.md`                | Writing tests — 5-level policy                     |
| `troubleshooting.md`      | Debug three.js/Vite/WebGL, architectural decisions |

**Before coding**: ask which reference files are needed — do NOT start without the relevant files loaded.
