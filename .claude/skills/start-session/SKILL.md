---
name: start-session
description: Gather all necessary written context from the previous session. Use at the start of a work session to reload state and relevant rules.
allowed-tools: Read
metadata:
  version: "1.0"
---

# Start Session

Gather all necessary written context from previous session.

## Steps

1. Read @.claude/CLAUDE.md to load current Session State and reference file list
2. Ask the user which rule files are needed for this session, based on what's in `### Next`
3. Read the relevant rule files and memorize their patterns
4. Remind the user of the next step from `### Next` in CLAUDE.md