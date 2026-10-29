# Rules — Decision tree, before acting

> Before writing a file, check whether a skill below produces it; if one does, use it — it carries conventions a
> hand-written file would miss.

## Skill triggers

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
| Log a source used to draw a year, and its mention | `/create-data-mention` |
| Reason about a subject whose rules are not loaded | `/rules` |
| **Make an event icon, or change how one looks** — its 3D model or its flat drawing | **`/make-event-icon`** |
| Write or review a Cartographer component | `/react-canvas-and-panels` |

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
