---
name: end-session
description: Update the Session State in CLAUDE.md to reflect the current state of work before closing the session.
allowed-tools: Read Edit Bash
metadata:
  version: '1.2'
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
   - Replace `### Next` with the single most actionable next step
   - Update `### Known Issues` — add new ones, remove resolved ones
5. **Keep the auto-loaded context under 150k characters** (Claude Code's limit across every file
   `CLAUDE.md` pulls in). Run `wc -m .claude/{CLAUDE,completed,known-issues,next}.md .claude/rules/*.md`
   plus the memory `MEMORY.md`; if the total passes ~130k, rotate before writing:
   - `completed.md` keeps the **two latest sessions** — older ones move, verbatim, to the top of
     `.claude/archive/completed-history.md`;
   - a `known-issues.md` entry that closes moves to `.claude/archive/known-issues-closed.md`;
     atlas-only issues live in `.claude/known-issues-atlas.md`.
   Moving, never deleting: the archives are committed and read on demand.
6. If a new architectural decision or stable pattern was established this session, update the relevant memory file in `.claude/projects/.../memory/` (e.g. `MEMORY.md`, `patterns.md`)
7. Propose all changes to the user before writing — do not write without confirmation
