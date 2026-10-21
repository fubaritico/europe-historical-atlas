---
name: commit
description: Write and make a conventional commit for the current changes, once the dev has tested them. Use when committing code, creating a git commit, or finalizing a set of changes.
allowed-tools: Bash(git:*)
metadata:
  version: "1.0"
---

# Commit

Write and make a conventional commit for the current changes — **after the dev has tested them** (the Definition of
Done in `/trello`, step 6). Push only when he asks.

## Steps

1. Run `git status` to see changed files
2. Run `git diff --staged` and `git diff` to analyze all changes
3. Identify the scope based on changed files:
   - `packages/atlas/src/{scene,camera,controls,picking,ui}` → that folder's name; `atlas` across several
   - `packages/core/src/data` → `data`; `packages/core/src/editor` → `editor`; the rest of core → `core`
   - `packages/cartographer/**` → `cartographer`
   - `packages/eslint-plugin-eha/**` → `lint`
   - `files/plans/**` → `plans`
   - root config, CI, `.claude/` → `repo`
   - Multiple areas → use the most impacted scope
4. Generate a conventional commit message
5. Show the message and the files, then commit (staged by name); the hash goes in the ticket's comment

## Commit format

```
type(scope): subject

- bullet point detail if needed
```

## Allowed types

`feat` `fix` `refactor` `style` `test` `docs` `chore` `build` `ci` `perf` `revert`

## Rules

- Subject: lowercase, no trailing period, max 100 chars total
- Body: bullet points for non-obvious changes
- Never skip pre-commit hook (runs typecheck + lint + test automatically)
- One feature per commit — do not accumulate unrelated changes
- Stage specific files by name, never `git add .` or `git add -A`
