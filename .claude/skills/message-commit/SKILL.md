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
   - `src/scene` → scope `scene`
   - `src/camera` → scope `camera`
   - `src/controls` → scope `controls`
   - `src/picking` → scope `picking`
   - `src/data` (ports: heightmap, texture, regions) → scope `data`
   - root / build config → scope `repo`
   - Multiple areas → use the most impacted scope
4. Generate a conventional commit message

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
