---
name: start-session
description: Gather all necessary written context from the previous session. Use at the start of a work session to reload state and relevant rules.
allowed-tools: Read Bash
metadata:
  version: '1.2'
---

# Start Session

Gather all necessary written context from previous session.

## Steps

1. **Situate yourself in time FIRST** — run
   `~/.claude/hooks/session-log.sh report "$PWD" 14`
   It reports the work **spans** (real working stretches, derived from action timestamps) and whether
   the current **chantier** is still open or was interrupted. Read it before anything else:
   - **Chantier EN COURS** → this is a _continuation_, possibly spanning several days. Do NOT reopen
     from scratch: pick up the thread, and say what was being done in the last span.
   - **Interruption longue** → the dev has likely forgotten the context. Brief them on where things
     stood _before_ proposing any work.
     A `SessionStart` hook already injects a short version of this automatically; the report adds the
     per-span detail and the most-touched files.
2. Work from the Session State already in context (CLAUDE.md's imports: completed.md, next.md, known-issues.md)
3. **Load the rules of the subjects `### Next` points to** — `/rules` with those topics (since 2026-10-21
   most rules are path-scoped and the prompt hook names the rest; no need to ask the dev which files)
4. Say in one line which rules are loaded, so the dev can name what is missing
5. **Read the Trello board** — `/trello` skill, `list`, then its sync check. Tell the dev, in two lines,
   what waits on him in **À valider par le développeur** and what tops **À faire**: the board is the list of tasks, `next.md`
   only the resume point.
6. Remind the user of the next step from `### Next` in CLAUDE.md, framed by the elapsed time from
   step 1 (e.g. "on reprend le chantier d'hier" vs "ça fait 2 mois, voici où on en était")
