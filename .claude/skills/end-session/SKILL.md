---
name: end-session
description: Update the session-state files CLAUDE.md imports — completed.md, next.md and the known-issues slices — before closing the session.
allowed-tools: Read Edit Bash
metadata:
  version: '1.3'
---

# End Session

Update the session-state files CLAUDE.md imports — completed.md, next.md and the known-issues slices — before closing the session.

## Steps

1. **Get the real timings** — run `~/.claude/hooks/session-log.sh report "$PWD" 14`.
   Use its numbers in the `### Completed` entry instead of estimating: the **spans** (real working
   stretches) and the **files actually touched**. Never write a duration you guessed — a session left
   open overnight is not 14 h of work, and the report already accounts for that (it derives spans from
   action timestamps, ignoring the unreliable process start/end markers).
   If the chantier spans several days, say so explicitly in the entry (e.g. "chantier du 15 au 17/09,
   3 plages, 4h20") rather than dating it as a single day.
2. Read @.claude/CLAUDE.md to see the current Session State
3. Review the conversation history to identify:
   - What was completed this session (new items to add to `### Completed`)
   - What the next actionable step is (`### Next`)
   - Any new known issues surfaced (`### Known Issues`)
4. Edit the files `CLAUDE.md`'s Session State imports:
   - `.claude/completed.md` — append this session's account (keep existing entries)
   - `.claude/next.md` — replace with the resume point: where we stopped, what is mid-flight, and the cards in
     À valider par le développeur / En cours / top of À faire — never a list of tasks (that is the board)
   - the known-issues slices `.claude/rules/known-issues/<package>.md` — add new entries; a closed one moves to
     `.claude/archive/known-issues-closed.md`, never deleted
5. **Keep each file loaded at launch under 200 lines** — the documented target (code.claude.com/docs/en/memory). Run
   `wc -l .claude/{CLAUDE,completed,known-issues,next}.md .claude/rules/{error-handling,decision-tree}.md`
   plus the memory `MEMORY.md` (its own cap: 200 lines or 25 KB); the path-scoped rules do not load at launch.
   A file past 200 lines is rotated or moved to its path-scoped home before writing:
   - `completed.md` keeps the **two latest sessions** — older ones move, verbatim, to the top of
     `.claude/archive/completed-history.md`;
   - a known-issues entry that closes moves to `.claude/archive/known-issues-closed.md`; open entries
     live in their slice, `.claude/rules/known-issues/<package>.md`, path-scoped — `known-issues.md` is
     only their index. A new slice or rule file gets its topic in `.claude/skills/rules/topics.json`.
   Moving, never deleting: the archives are committed and read on demand.

   **If `.claude/` changed this session** (`git diff --stat -- .claude` + `git status`), ask the dev to type
   `/doctor prompt-audit` — a built-in command, I cannot run it myself. It reports stale references and
   contradictions and changes nothing; I go through its findings with him, and only what he accepts is applied
   (`.claude/rules/claude-config.md`).
6. **The Trello board — run the sync check of the `/trello` skill** (its section *Sync*): every card
   touched this session carries a comment saying where it stands; every card in **En cours** or **À valider par le développeur**
   is named in `next.md`; every file of `files/plans/`, `.claude/known-issues.md`, `.claude/rules/known-issues/*.md` or `next.md` changed this
   session has its card, and each ticket it cites (`— CARTO-41`) names a card that exists in a coherent column. What
   shipped this session is a card in **Fait** (after the dev's test) — `completed.md` cites the ticket and
   does not re-describe it; `next.md` holds no task list, the board does.
7. A decision of this project goes in its plan or `.claude/*.md`; a lesson about working with the dev in the file memory; a lesson that holds in other repositories in Basic Memory (`main/patterns/`).
8. Propose all changes to the user before writing — do not write without confirmation
