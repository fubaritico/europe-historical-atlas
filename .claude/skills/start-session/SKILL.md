---
name: start-session
description: Gather all necessary written context from the previous session. Use at the start of a work session to reload state and relevant rules.
allowed-tools: Read Bash
metadata:
  version: '1.1'
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
2. Read @.claude/CLAUDE.md to load current Session State and reference file list
3. Ask the user which rule files are needed for this session, based on what's in `### Next`
4. Read the relevant rule files and memorize their patterns
5. Remind the user of the next step from `### Next` in CLAUDE.md, framed by the elapsed time from
   step 1 (e.g. "on reprend le chantier d'hier" vs "ça fait 2 mois, voici où on en était")
