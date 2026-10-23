---
name: opensrc
description: Fetch dependency source code to give AI agents deeper implementation context. Use when the agent needs to understand how a library works internally, read source code for a package, fetch implementation details for a dependency, or explore how an npm/PyPI/crates.io package is built. Triggers include "fetch source for", "read the source of", "how does X work internally", "get the implementation of", "opensrc path", or any task requiring access to dependency source code beyond types and docs.
allowed-tools: Bash(opensrc:*) Bash(npx opensrc@0.6:*)
---

# Source Code Fetching with opensrc

Fetches dependency source code so agents can read implementations, not just types. Clones repositories at the correct version tag and, with `npx opensrc@0.6` (this project's command), clones them into the project's `opensrc/` folder (git-ignored).

**In this project always run it as `npx opensrc@0.6`** — that version clones into the project's `opensrc/` folder,
which is where the review agents and `CLAUDE.md` look; the bare `opensrc` writes to `~/.opensrc/` instead. The
examples below omit the `npx opensrc@0.6` prefix for brevity.

## Core Pattern

```bash
rg "parse" $(npx opensrc@0.6 path zod)
cat $(npx opensrc@0.6 path zod)/src/types.ts
find $(npx opensrc@0.6 path zod) -name "*.test.ts"
```

`opensrc path <pkg>` prints the absolute path to cached source. If not cached, it fetches automatically. Progress goes to stderr, path to stdout, so `$(opensrc path ...)` works in subshells.

## Fetching Source Code

```bash
opensrc path zod
opensrc path pypi:requests
opensrc path crates:serde
opensrc path facebook/react

# Multiple packages at once
opensrc path zod react next
opensrc path pypi:requests pypi:flask
opensrc path crates:serde crates:tokio

# Specific versions
opensrc path zod@3.22.0
opensrc path pypi:flask@3.0.0
opensrc path owner/repo@v1.0.0
opensrc path owner/repo#main

# A GitHub repo by URL — fetched if absent; also updates AGENTS.md. Docs: https://opensrc.sh/
npx opensrc@0.6 path https://github.com/owner/repo.git

```

### Version Resolution

For npm packages, opensrc auto-detects the installed version from lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`). Use `--cwd` to resolve from a different project:

```bash
opensrc path zod --cwd /path/to/project
```

For PyPI and crates.io, explicit versions or latest are used. For repos, use `@ref` or `#ref` to pin a branch, tag, or commit.

## Managing the Cache

In this project, `npx opensrc@0.6` keeps the sources in `opensrc/` at the repository root (git-ignored), e.g.
`opensrc/repos/github.com/pmndrs/zustand`. Other opensrc versions default to `~/.opensrc/` (override with `OPENSRC_HOME`).

```bash
opensrc list                     # show all cached sources
opensrc list --json              # JSON output

opensrc remove zod               # remove a package
opensrc remove facebook/react    # remove a repo

opensrc clean                    # remove everything
opensrc clean --npm              # only npm packages
opensrc clean --pypi             # only PyPI packages
opensrc clean --crates           # only crates.io packages
opensrc clean --packages         # all packages, keep repos
opensrc clean --repos            # all repos, keep packages
```

## When to Fetch Source

Fetch source when you need to:
- Understand internal behavior that types don't reveal
- Debug unexpected library behavior
- Learn patterns from well-known implementations
- Verify how a function handles edge cases

Don't fetch source for simple API usage questions that docs or types can answer.
