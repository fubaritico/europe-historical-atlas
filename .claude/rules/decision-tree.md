# Rules — Decision Tree (BEFORE any action)

> Check this BEFORE writing any file. If a skill can generate it, use the skill.

## Skill Triggers — NEVER bypass

| I'm about to...                      | Invoke            |
| ------------------------------------ | ----------------- |
| Write tests                          | `/test`           |
| Review code (after a set of changes) | `/review`         |
| Commit                               | `/commit`         |
| Propose a commit message only        | `/message-commit` |
| Create a new skill                   | `/create-skill`   |
| Fetch a dependency's source          | `/opensrc`        |
| Feed / query the knowledge base      | `memory-*` skills |
| Start a work session                 | `/start-session`  |
| End a work session                   | `/end-session`    |
| Fetch the SonarCloud report          | `/sonar`          |

> DS skills (React/Stencil/Storybook/monorepo/BEM) were archived under `files/claude-archive/` —
> they do NOT apply to this 3D project.

## 3D skills to create (as we go)

- Generate a pluggable scene module (standalone renderer/mesh/light + mock).
- Camera state persistence/restoration (hot-reload) — see roadmap Phase 0.2.

## Pre-flight — BEFORE writing code

1. Confirm the approach with the dev (never code without confirming).
2. Ask which reference files are needed; read the relevant `rules/*`.
3. Check if a skill handles the task (table above).
4. If yes → use the skill, do not write manually.
5. If no → write the code following the patterns, then `pnpm type-check && pnpm lint && pnpm test` + `/review`.

## Rule

**Never write a file that a skill can generate.** A module is never "done" without its tests
(`/test`, 5-level policy — see `tests.md`).
