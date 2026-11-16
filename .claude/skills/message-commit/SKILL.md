---
name: message-commit
description: Prepare and propose a conventional commit message only (no execution) for the current changes. Use when you want the commit message text without running git commit.
allowed-tools: Bash(git:*)
metadata:
  version: "1.0"
---

# Message Commit

Prepare and propose a conventional commit message only for the current changes.

## Steps

1. Run `git status` to see changed files
2. Run `git diff --staged` and `git diff` to analyze all changes
3. Identify the scope based on changed files:
   - `packages/atlas/src/{scene,camera,controls,picking,ui}` → that folder's name; `atlas` across several
   - `packages/core/src/data` → `data`; `packages/core/src/editor` → `editor`; the rest of core → `core`
   - `packages/cartographer/**` → `cartographer`
   - `packages/cms/**` → `cms`
   - `packages/atlas/public/years/**` → `data`
   - `packages/eslint-plugin-eha/**` → `lint`
   - `files/plans/**` → `plans`
   - root config, CI, `.claude/` → `repo`
   - Multiple areas → use the most impacted scope
4. Generate a conventional commit message

## Commit format

```
type(scope): subject [TICKET-123]

- bullet point detail if needed
```

## Allowed types

`feat` `fix` `refactor` `style` `test` `docs` `chore` `build` `ci` `perf` `revert`

## Rules

- Subject: lowercase, no trailing period, max 100 chars total
- **The header ends with its ticket** (REPO-460, the dev, 2026-11-16: *« il faut que tu aies la référence du ticket quand
  tu commites quelque chose »*): `[CARTO-457]`, several split by a comma (`[CMS-422, CARTO-453]`), or `[no-ticket]` written
  on purpose — the historian's data, a note no ticket serves. Seen in `git log --oneline` and on GitHub, where a line of
  the body is not. **commitlint refuses a header without it** (`header-ticket`, `commitlint.config.js`). The ticket
  counts in the 100 characters.
- Body: bullet points for non-obvious changes
- Never skip pre-commit hook (runs typecheck + lint + test automatically)
- One feature per commit — do not accumulate unrelated changes
