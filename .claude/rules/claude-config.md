---
paths:
  - ".claude/**"
  - "**/CLAUDE.md"
  - "**/CLAUDE.local.md"
  - "AGENTS.md"
---
# Configuring Claude — check the documentation, not my memory

> The dev's call, 2026-10-21. For weeks `CLAUDE.md` said the rules were "NOT auto-loaded" while all six loaded at
> every session (126 KB at launch), and `/end-session` measured against a 150k "limit" I had written myself. I
> followed both without checking — instruction files are orders to me, not objects to audit — and Claude Code
> changes faster than what I remember of it. Same reason this project forbids guessing a three.js API.

## Before changing any instruction file, skill, hook, agent or setting

1. **Read the current page** — `curl -sL https://code.claude.com/docs/en/<page>.md` (WebFetch truncates long pages):
   `memory` (CLAUDE.md, rules, imports, auto memory), `hooks`, `skills`, `sub-agents`, `settings`, the index at
   `https://code.claude.com/docs/llms.txt`. **Cite it** in the answer.
2. **Say plainly when the change goes against the guidance**, with the remedy — the dev expects me to warn
   (*« il vaut mieux pas faire ça, il est préconisé de faire comme ça »*), unasked.
3. **A new rule file or known-issues slice gets its topic in `.claude/skills/rules/topics.json`.**

## What the documentation says that we rely on (verified 2026-10-21, Claude Code 2.1.306)

- A rule **without `paths:` loads at every session**; with `paths:`, when a matching file is read or written.
  Invalid frontmatter YAML loads the rule unconditionally, silently.
- `@imports` load at launch: they organise, they **save no context**.
- **Target under 200 lines per instruction file**; Claude Code warns at startup past it, and past a combined limit.
- `MEMORY.md`: the first 200 lines or 25 KB load; topic files are read on demand.
- A `UserPromptSubmit` hook's `additionalContext` is capped at **10 000 characters**.
- `.claude/CLAUDE.md` exists, so the root `AGENTS.md` (written by Turbo) is **not read** — import it if it ever matters.
- **`/doctor prompt-audit`** audits CLAUDE.md, rules, skills, agents for stale or conflicting content and proposes
  edits without applying them (needs ≥ 2.1.283) — run by `/end-session` when `.claude/` changed.
