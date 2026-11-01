---
name: timeline
description: Query the project's activity log — time really spent, work spans, chantiers spread over several days, the most-touched files, the gap since the last session. Use when the user asks "combien de temps", "depuis quand", "on a passé combien sur X", "timeline", "historique", "quand est-ce qu'on a travaillé sur", how long something took, when work happened, or how much time went into a file or a component.
allowed-tools: Bash Read
metadata:
  author: europe-map
  version: '1.1'
---

# Timeline — query the activity log

Answers questions about **real working time** from `files/session-log.jsonl` (git-ignored), fed by the timestamping
hooks (`~/.claude/hooks/session-log.sh`).

## The time model — three notions, not to be confused

| Notion                | Definition                                                  | Reliable? |
| --------------------- | ----------------------------------------------------------- | --------- |
| **Technical session** | the Claude Code process (`session_start` → `session_end`)   | **no**    |
| **Work span**         | actions less than 90 min apart — the real work              | **yes**   |
| **Chantier**          | spans less than 48 h apart — it may cover several days      | **yes**   |

**Never give a duration based on the technical session.** A terminal left open overnight would read as « 14 h of work »
for 40 real minutes, and three `/clear` in a day as three sessions for one day of work. Spans are **derived from the
actions' timestamps** — the only honest measure. When you quote a figure, say which notion it comes from.

## The base command

```bash
~/.claude/hooks/session-log.sh report "$PWD" 30   # 30 = window in days
```

It prints the chantier's state (ongoing / interrupted, since when, total), the spans one by one, and the most-touched
files. That covers most questions — always start there.

## Recipes for the narrower questions

The log is JSONL: `{ts, epoch, ev, f?, cmd?}` with `ev ∈ edit|bash|session_start|session_end`. Always parse with
`fromjson?`, so a corrupt line is skipped.

**Time spent on a file or a component** (spans holding only actions on it):

```bash
jq -Rrn --arg pat 'reliefMesh' '
  [inputs | fromjson? | select(.ev=="edit" and (.f // "" | test($pat)))]
  | sort_by(.epoch)
  | reduce .[] as $e ([]; if (length==0) or ($e.epoch - .[-1].end > 5400)
      then . + [{start:$e.epoch,end:$e.epoch,n:1}]
      else .[:-1] + [{start:.[-1].start,end:$e.epoch,n:(.[-1].n+1)}] end)
  | "\(length) plages, \((map(.end-.start)|add)/3600*10|round/10) h, \(map(.n)|add) éditions"
' files/session-log.jsonl
```

**Activity per day**:

```bash
jq -Rrn '[inputs | fromjson? | select(.ev=="edit")] | group_by(.ts[0:10])
  | map("\(.[0].ts[0:10]) — \(length) éditions")[]' files/session-log.jsonl
```

**When was this file last touched?**

```bash
jq -Rrn --arg f 'next.md' '[inputs | fromjson? | select(.ev=="edit" and (.f//""|test($f)))]
  | last | .ts' files/session-log.jsonl
```

## Completing with git

The log covers only the sessions **since the hooks were installed**. For older history, cross it with git, which
timestamps everything committed:

```bash
git log --format='%ad %s' --date=format:'%Y-%m-%d %H:%M' -- <path>
```

The two **complement each other**: git knows the deep past but misses sessions with no commit; the log catches all the
work, committed or not, but only since it was installed.

## Gotchas

- **The log may not exist** (`files/session-log.jsonl` absent = the hooks never fired in this project). Say so plainly
  rather than give an invented figure, and fall back on git.
- **It is git-ignored** (the `files/` folder): local to the machine, never shared, never committed.
- **Reads are not logged** — only `Edit`/`Write` and `Bash`. A span spent reading code shows as empty: never conclude
  « nothing was done », say « no change recorded in this span ».
- **The thresholds (90 min / 48 h) are constants** of the script (`SPAN_GAP`, `STREAK_GAP`). If a result looks absurd,
  check them before concluding.
