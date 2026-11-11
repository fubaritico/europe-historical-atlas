---
name: historian
description: Session role, not for delegation — the historian (research, entry in the CMS, drawing in the Cartographer; never the code). Started by `claude --agent historian`; the role itself is in .claude/roles/historian.md.
initialPrompt: /start-session historian
hooks:
  PreToolUse:
    - matcher: "Edit|Write|NotebookEdit"
      hooks:
        - type: command
          command: node "${CLAUDE_PROJECT_DIR}/.claude/hooks/historian-guard.mjs"
---
