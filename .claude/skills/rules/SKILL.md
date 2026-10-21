---
name: rules
description: Load the rule files, known issues and plans a subject or a place of the repository needs, from the one table the prompt hook also reads. Use when a subject comes up that the hook did not name, before reasoning about a package whose files are not open yet, at start-session for the subjects of next.md, after a compaction, or when the dev says "charge les règles", "rules", "va chercher les règles".
argument-hint: "[topic…] — cartographer, atlas, core, date, uncertainty, data, contribution, tests, tooling"
allowed-tools: Read Bash
metadata:
  author: europe-map
  version: "1.0"
---

# Rules — load what a subject needs

Since 2026-10-21 (the dev's call) most of `.claude/rules/` is **path-scoped**: a rule loads only when a file it
names is read or written. Three triggers keep that from turning into forgetting:

| trigger | when | who |
| --- | --- | --- |
| `paths:` in a rule's frontmatter | a matching file is read or written | Claude Code |
| the prompt hook, `.claude/hooks/rules-for-prompt.mjs` | a word of the dev's message is in the table | Claude Code, once per topic per session |
| **this skill** | a subject the two above missed | me |

Still loaded at every session, whatever the subject: `CLAUDE.md`, `next.md`, `completed.md`, the index
`known-issues.md`, `rules/error-handling.md` and `rules/decision-tree.md` — what must hold before any file is
touched.

## Steps

1. **Pick the topics.** From `$ARGUMENTS` if given; otherwise from the subject at hand — the packages and
   tickets under discussion, or at start-session the ones `next.md` points to. Keys and files are in
   `.claude/skills/rules/topics.json`.
2. **Read each file of those topics** that is not already in context this session (read earlier, or a
   `Loaded` line). A file with a `hint` is read for that section only — `plan.md` is long.
3. **Say it in one line**, French: *« Règles chargées : le Cartographe (cartographer.md, known-issues/cartographer.md…) »*,
   so the dev sees what I hold and can name what is missing.

## Keeping the table right

- **A new rule file or known-issues slice gets its topic in `topics.json` in the same change** — otherwise the
  hook and this skill never name it.
- **A trigger word that loads the wrong thing is removed**, not argued for: `historique`, `garde`, `lieu`
  and `ci` were dropped on day one (« l'atlas historique », « je garde », « au lieu de », « celui-ci »).
  A Trello item is a *ticket*, never a *carte*, so `carte` is no trigger at all.
- The hook's tests run with `node --test .claude/hooks/rules-for-prompt.test.mjs`; they read the real table,
  so a word change that breaks a case shows there.
