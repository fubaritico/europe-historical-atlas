---
name: end-session
description: Update the Session State in CLAUDE.md to reflect the current state of work before closing the session.
allowed-tools: Read Edit Bash
metadata:
  version: '1.3'
---

# End Session

Update the Session State in CLAUDE.md to reflect the current state of work before closing the session.

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
4. Edit the `## Session State` section in `.claude/CLAUDE.md`:
   - Append newly completed items to `### Completed` (keep existing entries, add new ones)
   - Replace `### Next` with the resume point: where we stopped, what is mid-flight, and the cards in
     À toi / En cours / top of À faire — never a list of tasks (that is the board)
   - Update `### Known Issues` — add new ones, remove resolved ones
5. **Keep the auto-loaded context under 150k characters** (Claude Code's limit across every file
   `CLAUDE.md` pulls in). Run `wc -m .claude/{CLAUDE,completed,known-issues,next}.md .claude/rules/*.md`
   plus the memory `MEMORY.md`; if the total passes ~130k, rotate before writing:
   - `completed.md` keeps the **two latest sessions** — older ones move, verbatim, to the top of
     `.claude/archive/completed-history.md`;
   - a `known-issues.md` entry that closes moves to `.claude/archive/known-issues-closed.md`;
     atlas-only issues live in `.claude/known-issues-atlas.md`.
   Moving, never deleting: the archives are committed and read on demand.
6. **The Trello board — run the sync check of the `/trello` skill** (its section *Sync*): every card
   touched this session carries a comment saying where it stands; every card in **En cours** or **À toi**
   is named in `next.md`; every file of `files/plans/`, `known-issues.md` or `next.md` changed this
   session has its card, and each ticket it cites (`— CARTO-41`) names a card that exists in a coherent column. What
   shipped this session is a card in **Fait** (after the dev's test) — `completed.md` cites the ticket and
   does not re-describe it; `next.md` holds no task list, the board does.
7. If a new architectural decision or stable pattern was established this session, update the relevant memory file in `.claude/projects/.../memory/` (e.g. `MEMORY.md`, `patterns.md`)
8. Propose all changes to the user before writing — do not write without confirmation
