# Known Issues — the index

> **Since 2026-10-21 the entries live in path-scoped slices** under `.claude/rules/known-issues/`, so each one
> loads only when its package is touched, or when the prompt hook (`.claude/hooks/rules-for-prompt.mjs`) or
> `/rules` names its subject. This file stays loaded at every session and holds only the map below.
> Closed entries are archived in `archive/known-issues-closed.md` (move one there the step it closes).

| slice | holds | loads when a file matches |
| --- | --- | --- |
| `rules/known-issues/cartographer.md` | the Cartographer: canvas, tools, chrome, its React tests, the design system's quirks | `packages/cartographer/**` |
| `rules/known-issues/atlas.md` | the atlas: render, pipeline wiring, dev panel | `packages/atlas/**`, `packages/core/src/pipeline/**` |
| `rules/known-issues/core.md` | core: the document model, the history, the derivations, its README | `packages/core/**` |
| `rules/known-issues/data.md` | the data on disk: `years/`, the relief, the spikes that write them | `packages/atlas/public/**`, `files/spikes/**` |
| `rules/known-issues/tooling.md` | install, lint, Turbo, CI, commits, ignores, the plugin | root configs, `.github/**`, `scripts/**`, `packages/eslint-plugin-eha/**` |
| `rules/known-issues/testing.md` | proving that a test guards something | `**/*.test.{ts,tsx}`, `**/vitest.setup.ts` |

**A new entry goes in its slice**, never here. One that fits none — a process lesson that must hold before any
file is touched — goes below this table.

**An older pointer that says "in `known-issues.md`"** (plans, scenarios, the README) means one of the slices:
`grep -rn "<its words>" .claude/rules/known-issues/`.

**Two entries to have in mind at every session**, whatever the subject:

- **`years/1100/` holds the Euratlas test, not the dev's year** — CARTO-116; detail in `data.md`.
- **The gate goes red under load on correct code** — REPO-260; detail in `tooling.md`.
