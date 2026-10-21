# Rules — Decision Tree (BEFORE any action)

> Check this BEFORE writing any file. If a skill can generate it, use the skill.

## Skill Triggers — NEVER bypass

| I'm about to...                      | Invoke               |
| ------------------------------------ | -------------------- |
| **Write code a scenario governs**    | **`/scenarii-to-code`** |
| Write tests                          | `/test`           |
| Review code (after a set of changes) | `/review`         |
| Commit                               | `/commit`         |
| Propose a commit message only        | `/message-commit` |
| Create a new skill                   | `/create-skill`   |
| Fetch a dependency's source          | `/opensrc`        |
| Feed / query the knowledge base      | `memory-*` skills |
| Start a work session                 | `/start-session`  |
| End a work session                   | `/end-session`    |
| Answer "how long / since when"       | `/timeline`       |
| Fetch the SonarCloud report          | `/sonar`          |
| Track a task — a card, its column, its label | `/trello` |
| Reason about a subject whose rules are not loaded | `/rules` |

> **This repository has React in it** — the Cartographer, since 2026-10-01. The line that used to stand
> here said the archived React skills "do NOT apply to this 3D project", and it stopped being true the day
> React arrived. Corrected 2026-10-05, same family as `CLAUDE.md`'s old "No React".
>
> What is true is narrower, and it is measured rather than assumed. Of the six React skills archived under
> `files/claude-archive/skills/`:
>
> | skill | state |
> | --- | --- |
> | `react-canvas-and-panels` (**active**) | **this repository's own.** React owning an imperative canvas, and the panel pattern. Read it before writing a component here |
> | `solid-react-principles` (284 lines) | applicable, and overlaps `modular-architecture.md`. Load on demand |
> | `react-best-practices` | **well built and deliberately left archived, for a licence reason, not a quality one.** 70 rules in addressable files under a 7 kB entry, by Vercel Engineering — four of them are exactly our canvas seam. But there is **no LICENSE file**: the only claim is a `license: MIT` frontmatter line written by whoever packaged it, with no copyright holder, and the README describes an upstream repository that is not present. `files/` is gitignored and `.claude/` is not, so moving it in would commit 108 kB of third-party content on an unverifiable claim — in a repository that goes public. **What we do instead**: `react-canvas-and-panels` restates the few facts we need in our own words and cites the rules by name. Reopen only if the upstream and its licence are found |
> | `composition-patterns` (946 lines) | generic, same licence question. Load on demand, do not commit |
> | `new-react-component` | **dead**: it targets `packages/reference`, Storybook and Tailwind — none of which exist or are wanted here |
> | `state-storage` | **two facts absorbed, the rest stays archived.** It was first dismissed here as redundant with `zustand-react-pattern` — that judgement was made on its *scope* without reading it, and it was wrong. It carries (a) the `useSyncExternalStore` derived-slice gotcha, which independently confirms the `History.rows` finding of 2026-10-05, and (b) "the lightest sufficient tier", which says panel-local state with one writer and one reader needs **no slice at all**. Both now live in `zustand-react-pattern`. What stays archived is design-system material — the Machine tier, Listbox/Typeahead/Toaster, the behaviour-hooks catalogue — which `fubaritico-ds` answers |
> | `react-view-transitions` | out of scope |
>
> Stencil, Storybook, BEM and the monorepo DS skills stay archived and still do not apply.

## Skills to create (as we go)

- Generate a pluggable scene module (standalone renderer/mesh/light + mock).

## Pre-flight — BEFORE writing code

1. Confirm the approach with the dev (never code without confirming).
2. The rules of the place must be loaded: touching its files loads them; for a discussion the prompt hook names
   them, and `/rules` covers what it missed.
3. Check if a skill handles the task (table above).
4. If yes → use the skill, do not write manually.
5. If no → write the code following the patterns, then `pnpm type-check && pnpm lint && pnpm test` + `/review`.

## Rule

**Never write a file that a skill can generate.** A module is never "done" without its tests
(`/test`, 5-level policy — see `tests.md`).
