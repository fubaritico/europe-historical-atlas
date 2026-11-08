---
name: opensrc
description: Fetch a dependency's source code into the project's opensrc/ folder to read its implementation, not just its types — verify a three.js API before using it, debug a library's behaviour, check an edge case the docs do not answer. Use when asked to fetch or read the source of a package, or how a library works internally.
allowed-tools: Bash(npx opensrc@0.6:*)
---

# Source code with opensrc

**In this project the command is always `npx opensrc@0.6`, at that version** (the dev's call): 0.6 clones into the
project's `opensrc/` folder (git-ignored, never pushed), which is where the review agents and `CLAUDE.md` look; later
versions write to `~/.opensrc/`, outside the project.

## Fetch

0.6 has three commands — `list`, `remove`, `clean` — and fetching is the bare form, the names as arguments. **It has no
`path` command**: `npx opensrc@0.6 path three` would fetch an npm package called `path`.

```bash
npx opensrc@0.6 three                          # npm: the version installed, read from pnpm-lock.yaml
npx opensrc@0.6 three zustand                  # several at once
npx opensrc@0.6 three@0.186.0                  # a given version
npx opensrc@0.6 payloadcms/payload@v3.92.0     # a GitHub repository at a tag
npx opensrc@0.6 list                           # what is fetched, with versions
```

Run from the repository root (or pass `--cwd <root>`), so the installed version is read from this workspace.

## Read

The sources sit at `opensrc/repos/<host>/<owner>/<repo>/`, listed with their version in `opensrc/sources.json` — read
them with the file tools, e.g. `opensrc/repos/github.com/mrdoob/three.js/src/`.

## Keep, and update

- **Every source is kept** (the dev, 2026-11-01): never `remove` nor `clean`. Many sources are no problem — none is pushed.
- **Updating is fetching again.** For an npm package, the same command re-reads the installed version: « Already up to
  date » if unchanged, a new clone if the lockfile moved (`dist/commands/fetch.js`, 0.6.0). A repository moves only when
  given its new tag. When to do it is `/repo-version-manager`'s: after a bump, in the same breath.

Fetch source when the question is how the code behaves — internal behaviour, an edge case, an API to verify before use.
Types and docs answer how to call it.
