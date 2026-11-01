---
name: repo-version-manager
description: Check every dependency of the workspace for newer versions, and the opensrc sources against the lockfile; write a report with one proposal per dependency — its risks and the limits the project already set on it — so the dev decides, or revisits a past decision; then bump only what he chose and refresh opensrc. Use when /start-session finds the last check over a month old, or when the dev says versions, dépendances, mise à jour, montée de version, outdated, « est-ce qu'on est à jour ».
argument-hint: "[check | bump <package…>]"
allowed-tools: Read Grep Glob Write Edit Bash(pnpm outdated:*) Bash(npx opensrc@0.6:*)
metadata:
  author: europe-map
  version: "1.0"
---

# Repo version manager — the monthly check

Nothing watches the versions of this repository; this skill is what does, once a month (the dev's call, 2026-11-01). It
**proposes**, it never decides: the dev chooses each bump, because a bump changes what runs on his machine and in the
public build. Two outcomes:

1. **`check`** — a report in `files/versions/<YYYY-MM-DD>.md` (git-ignored, like the audits), one entry per dependency
   that has a newer version, and a short summary to the dev in French, one point at a time.
2. **`bump <package…>`** — the packages he chose, moved in the repository first, then in `opensrc/`.

## Check

Run, read-only (it queries the registry and changes nothing):

```bash
PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH pnpm -C <root> outdated -r --format json
```

Then compare `opensrc/sources.json` (each source's `version`) with `pnpm-lock.yaml`: a source older than what is installed
is reported too — reading the code of a version we do not run misleads.

### One entry per dependency

| field | what goes in it |
| --- | --- |
| **paquet** | its name, current → latest, and the kind: correctif · mineure · **majeure** (see the gotchas for 0.x) |
| **qui s'en sert** | the packages that declare it (`dependentPackages`), and whether it ships to the reader (atlas, CMS) or only runs at build or test time |
| **ce qui change** | read from its release notes or changelog for every minor and major — the lines that touch something we use; for a patch, one line |
| **les risques** | what could break here, named: a peer it breaks, an API we call that moved, a behaviour a test pins. « Aucun connu » is an answer when the notes say nothing that touches us |
| **les limites du projet** | every limit already set on it, quoted with where it lives — see below. None found: say so |
| **la proposition** | monter · attendre · **décision à revisiter** — with the one reason that decides it |

**Where the limits live** — search all of them for the package's name, every time:

- `pnpm-workspace.yaml` — the catalogue's comments (why React is single, why peers are off);
- `.claude/rules/troubleshooting.md` — the majors that broke peers (ESLint 10, TypeScript 7);
- `.claude/rules/known-issues/*.md` — tooling, cms (Payload's traps), cartographer (the design system);
- `.claude/rules/architecture.md`, `.claude/rules/cartographer.md`;
- the Trello board — `/trello list`, then the tickets naming it (`REPO-127`, ESLint 10, sits in Idées);
- `package.json` of each package — an **exact** pin (no `^`) is a limit by itself: find why, or say no reason is written.

A limit whose reason no longer holds becomes **« décision à revisiter »**: quote the decision, its date, what changed since.
That is the point of the report — never drop a limit silently, and never treat one as permanent.

### The summary to the dev

Three lines first: how many, how many majors, the one worth his attention. Then the report's path. Then, one question at a
time, the majors and the « à revisiter » — the patches go as one group (« les 18 correctifs, on les prend ensemble ? »).

## Bump

Only what the dev named, in this order:

1. **The repository**: edit the version in the catalogue (`pnpm-workspace.yaml`) or, for a package outside it, in its
   `package.json` — with the Edit tool, never `pnpm add` (a bare `pnpm add` takes the newest major: `troubleshooting.md`).
   Packages that move together move together (gotchas). Then `pnpm install`, then the gate:
   `pnpm type-check && pnpm lint && pnpm test`, and `pnpm build` for anything that ships.
2. **His test** in the app the package touches — give him what to look at, in three lines. A design-system bump needs his
   dev server restarted (`known-issues/tooling.md`); his servers are his, so ask him to.
3. **`/commit`**, one commit per coherent group (the correctifs together, each major alone).
4. **opensrc**, for every bumped package that has a source in `opensrc/sources.json`:
   `npx opensrc@0.6 <name>` for an npm package (it reads the installed version and re-fetches only if it changed);
   `npx opensrc@0.6 <owner>/<repo>@v<version>` for a repository (Payload) — without the version it does not move.
   **Never `remove` or `clean`**: every source is kept (the dev, 2026-11-01).

## Record the check

After a `check`, set the line in `.claude/next.md`, under « Where we are »:
`**Dernier contrôle des versions** : <YYYY-MM-DD> — <n> à jour proposées, <n> montées, rapport files/versions/<date>.md`.
`/start-session` reads that date to know when the next one is due.

## Gotchas

- **`pnpm outdated` exits 1 when anything is outdated** — that is its answer, not a failure. A real failure (the registry
  unreachable, a 401 from GitHub Packages without the token in `~/.npmrc`) is told to the dev as it is, with the packages it
  left unchecked; the report says which part is missing, never a partial list presented as whole.
- **In 0.x, a minor is a major**: `three` 0.186 → 0.187 is one three.js release, and each can rename or remove an API;
  `@fubaritico/*` 0.9 → 0.10 likewise. Read the release notes (three's on GitHub; the DS's hand-off, `HANDOFF-from-fubaritico-ds.md` at the repository root
  when its Claude has left one — none today).
- **Packages that move together**: `three` and `@types/three`; `react`, `react-dom` and their `@types`; the four
  `@fubaritico/*`; `payload` and every `@payloadcms/*` (pinned exact, one version); `eslint` and `@eslint/js`;
  `typescript-eslint` and `@typescript-eslint/utils`; `vitest` and `@vitest/coverage-v8`; the two `@commitlint/*`.
- **`@types/node` follows the Node the project runs** (`.nvmrc`, `engines.node`), not the newest: a major past it describes
  APIs the runtime lacks. Its bump goes with a Node bump, which is a decision of its own (`known-issues/tooling.md`).
- **`typescript` is capped by `typescript-eslint`'s peer range** — read the peer before proposing a TypeScript major.
- **The design system is not on npmjs**: it comes from GitHub Packages; when `outdated` leaves it out, check it is up to date
  rather than assume it.
