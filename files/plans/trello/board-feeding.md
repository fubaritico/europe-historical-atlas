# Feeding the Trello board — plan (2026-10-17)

> Agreed with the dev 2026-10-17, revised the same afternoon. Each step is checked alone.

## Decisions of the dev, 2026-10-17

- Columns **Idées → Backlog → À faire → En cours → À valider par le développeur → Fait**; blocked is a red label, not a column.
- Every title starts with its **scope in brackets**: `[atlas]` `[carto]` `[core]` `[contrib]`, and `[repo]`
  for what is none of the four. Scope **labels stay** too (redundant cues help him remember).
- Severity is a label: `critique` / `gênant` / `cosmétique`.
- **Fait is exhaustive**, newest at the top, going back to the first day — journals first, then `git log`
  for what they missed.
- **The Backlog is built from the plans**, by scope, in the plans' order. A subject written in a plan he
  decided enters Backlog directly; what comes from me goes to Idées. What no plan covers yet (contrib has
  no UI designed) goes to Idées.

| # | step | state |
| --- | --- | --- |
| 1 | Sync rule in the `/trello` skill | ✅ |
| 2 | Labels — severity, scope, type, status | ✅ 15 labels |
| 3a | What is to do, from `next.md` and the actionable known-issues → Idées | ✅ 38 cards (#7–#44), #2 #9 #10 shaped |
| 3b | Scope prefixes on every title | ✅ 42 cards |
| 4 | **Fait, exhaustive**: 100 cards from the journals + the gaps `git log` shows, newest on top | ✅ 113 cards: 100 from the journals + 11 from git log + #24 #26 (created by mistake as to-dos, already shipped). Coverage proven: 284 of 315 commits cited, the 31 others are session-state docs and an add/revert pair. 14 duplicates from an interrupted run archived |
| 5 | **Backlog from the plans**, by scope and plan order; Idées cards a plan covers move up; gaps → Idées | ✅ 92 in Backlog (21 moved up from Idées, 70 new; #2 and #3 left ahead), 13 gaps → Idées; 34 cards say « à préciser avec le dev » |
| 6 | Slim `next.md` and `completed.md`; `— carte #N` on known-issues entries | ✅ next.md 361 → 155 lines, the rest moved verbatim to archive/next-history.md; 14 known-issues entries carry their card; completed.md keeps its past accounts, the #N rule applies from now |
| 7 | Wire `/start-session` and `/end-session` to the sync check | ✅ start-session reads the board, end-session runs the sync check; /trello in decision-tree.md |
