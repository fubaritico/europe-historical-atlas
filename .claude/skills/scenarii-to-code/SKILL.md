---
name: scenarii-to-code
description: Keep scenarios and code in step, both ways. Scenario → code — load the scenario that governs the work, make every Then line either an assertion or a declared gap, say what the rung deliberately does not do yet. Code → scenario — a gesture shipped, changed or walked is written back into its scenario in the same commit, and an audit finds what shipped without one. Use before writing any code a scenario specifies, after shipping a gesture, at end-session, and when asked whether the scenarios are up to date. Triggers on "scenario", "scenarii", "gherkin", "sNN" (s01…s22), "code to scenario", "synchronise les scénarios", a P4 step, "what does this stage not do", "degraded on purpose".
argument-hint: '[step or scenario, e.g. 4d-2 or s02]'
metadata:
  author: europe-map
  version: '3.0'
---

# From a scenario to code

A **scenario set** specifies an application by its gestures: Gherkin for the contract, and prose
blockquotes for the decisions already taken. Both are binding, and in different ways. This skill is the
procedure for turning one into code without lying about how finished the result is.

It is **not about one application.** Two sets exist: the Cartographer's, written first, and the atlas's
since 2026-11-01. The CMS has none yet. Everything
below is the pattern; §6 lists what actually exists.

**Why it exists.** On 2026-10-06 step 4d-1 shipped with a JSDoc — written two steps earlier, in the same
hand — promising that the anchor projection *"happens once per viewport change, cached, and the cache
belongs to the caller (step 4d)"*. Step 4d was the caller. There was no cache. The gate was green, the
comment was confident, and a review found it. A rung that claims to be less degraded than it is costs
more than one that says plainly what it skipped.

---

## 1. The convention a scenario set follows

```
files/plans/<application>/scenarii/
├── s00-index.md     the shared background, and which rules are DEFAULTS
├── s01…sNN          one file per gesture or screen, each holding Gherkin
└── s99-holes.md     what is NOT decided
```

A new set — the CMS's, when it comes — goes in that shape, for one reason that is not tidiness:
**this skill finds `s00` and `s99` by name.** Depart from it and the two files that say *"this is only a
default"* and *"this is not decided"* stop being loaded.

---

## 2. Load before writing — three files, always

| | what it is | why it is not optional |
| --- | --- | --- |
| `s00-index.md` | the shared background and the **defaults** | it marks which rules are defaults and which are the few real constraints. Treating a default as a law is the mistake `s00` was written to stop — the dev's own words, 2026-09-22: *"tes règles, c'est des contraintes"* |
| the governing scenario | the contract for what is being built | §6, or `grep -l` the gesture |
| `s99-holes.md` | what is **not** decided | a hole treated as settled is a decision taken by nobody, and these belong to the dev |

Read them. Not a summary of them — including this repository's own: `completed.md` records what
happened, it does not specify anything.

---

## 3. What each Gherkin word becomes

```gherkin
Scenario: close the outline
  Given the outline has 340 anchors and the pointer comes near its first
  When the pointer enters the snapping radius of the first anchor
  Then that anchor is emphasised and the cursor shows the closing mark
```

| | becomes |
| --- | --- |
| `Given` | the arranged state — a fixture, a literal, a store opened on a document. Prefer an existing shared fixture; a third copy of one is the thing it exists to prevent |
| `When` | the gesture — a function call, or an event dispatched at a node. If it cannot be driven without a browser, the logic is in the wrong layer |
| `Then` | **one assertion**. Each `And` under it is another one |
| a prose blockquote (`> **H-04 settled…**`) | a **decision** — argued and closed. Re-opening one is the failure this dev has pushed back on more than once |

**A `Then` line is either an assertion or a declared gap.** There is no third option, and the whole
skill turns on it: a scenario line quietly unimplemented is how "less degraded" stops being a
measurement and becomes a feeling.

**Where the scenario says to measure, measure first.** `s02` carries *"Measure before building"* over a
hole about which rivers the dataset actually holds. That instruction is part of the contract, not advice.

---

## 4. The ladder: each rung says what it does not do

A step ships **degraded and honest**, then less degraded. Three obligations separate that from
unfinished work. All cheap, none optional.

### a. Name what the rung does not do, in the commit

And if it outlives the session, in its package's known-issues slice (`.claude/rules/known-issues/<package>.md`) **with a named trigger**. "Later" is not a trigger.
"At 4d-3, which loads the DEM for real" is.

### b. Never write a promise a later rung must keep — except where it will be read

This is the defect above. A JSDoc saying *"the cache belongs to the caller at step 4d"* is invisible to
step 4d: nobody re-opens a module header to find out what they owe. The files read **every session**
are `.claude/next.md` and the index `.claude/known-issues.md`. A promise lives in `next.md`, or in its package's
slice with a named trigger — loaded whenever that package is touched — or it does not exist.

A comment may say what is true **now** — *"the selection is empty until the tools arrive"* — never what
someone else will do about it.

### c. Prove the rung, do not assert it

The gate must tell this rung from the next. The repo's rule, with three instances by 2026-10-06:
**write the implementation a developer would plausibly write, and check that the test written for that
trap is the one that fails.** Not that the suite fails — *that test*. A sabotage caught by a different
test says nothing about which test guards what, and a test written for a trap that does not catch it is
worse than no test.

---

## 5. Before the first line, answer these four

1. **Which scenario governs this?** If none does, see below.
2. **Which `Then` lines will this rung satisfy, and which will it not?** The second list goes in the
   commit message.
3. **Which holes does it touch?** `s99` names them; a rung that silently settles one has taken a
   decision that belongs to the dev.
4. **What does the scenario tell me to measure first?**

### When no scenario governs the work

Three honest answers, and picking the wrong one is how specification gets invented after the fact:

- **It is tooling** (a config, a cache, a CI job) — scenarios do not specify it, and the rules in
  `.claude/rules/` do.
- **It belongs to an application specified by chapters** (the CMS, today) — then the
  chapter is the contract, and the same ladder in §4 applies to it unchanged.
- **It is product work nobody has specified** — then stop and say so. Writing the code first and the
  scenario afterwards produces a scenario that describes the code, which is the one thing a scenario
  must never be.

---

## 6. The sets that exist today

**`ls` the folder before trusting the tables below** — a scenario written since may not be in them yet; one missing
here is added in the commit that writes it. `s00` and `s99` hold no Gherkin (the background and the holes).

**The Cartographer** — `files/plans/cartographer/scenarii/`, s01 to s22 on 2026-11-08.

| scenario | what it specifies | the step that owes it |
| --- | --- | --- |
| `s01-open-and-navigate` | opening a payload, reading what is under the pointer, pan/zoom, the tool strip, framing a polity | 4d-1 (navigation), 5 (opening) |
| `s02-create-france-1100` | creating a polity, the Pen, snapping to a coast or a river, closing a ring | 4c (snapping), 4d-2 (the Pen) |
| `s03-edit-existing-border` | Direct Selection, moving anchors, what an undo must give back | 3 (history), 4d-2 (the tool) |
| `s04-save-and-reopen` | the round trip, and that it keeps the sharing | 1, 2 |
| `s05-derive-a-year` | "save as" as the whole mechanism of deriving a year | 5 |
| `s06-replace-a-gpl-year` | a GPL source, read-only mode, the banner | 5 |
| `s07-manage-the-registry` | identities, bulk import, polities with no territory | 5 |
| `s08-vassalage` | the polity tree, the vassal's hand, inclusion | 5 |
| `s09-place-the-names` | labels, and size by rank never by area | 5 |
| `s10-check-before-publishing` | the check report | 5 |
| `s11-islands` | an island no polygon claims | 4d-2, 5 |
| `s12-out-of-frame` | the render frame (the editorial zone was removed 2026-10-18) | 4b (done) |
| `s13-overrides` | `{Overrides}`, run borders, precedence | 5 |
| `s14-history-panel` | `{History}`, rows, markers | 3 (done), 5 |
| `s15-offline-and-online` | where a year goes, and how the atlas reads it | 5 |
| `s16-stacking-order` | stacking by groups of homage, the menu and its shortcuts | 5 (done) |
| `s17-tools-wait-for-the-zoom` | the tools' reach against the zoom | 5 (done) |
| `s18-autosave` | the draft on disk, the snapshots | 5 (step 1 done) |
| `s19-maps-as-folders` | a map is a folder: Open…, Save, Save as…, Save a copy | 5 (CARTO-340) |
| `s20-cities-panel` | `{Cities}`: the contribution's cities as guides for the borders, their filters, a city's point | 5 (CARTO-193, epic CARTO-363) |
| `s21-panels-moved-and-docked` | panels moved, resized, magnetised to the right column | 5 (CARTO-342) |
| `s22-copy-paste` | copy and paste between maps | 5 (CARTO-345) |

**The atlas** — `files/plans/atlas/scenarii/`, written 2026-11-01 (ATLAS-324) **from the code**, then checked
against what the dev saw: each says when it was built and whether it was walked. s01 to s17 on 2026-11-08 — s11 on,
the interface over the map (ATLAS-329), mostly not built yet; its holes are `A-NN`, never to meet the Cartographer's `H-NN`. The chapters (`01-foundations.md` … `07-robustness.md`,
`focus-mode.md`, `detail-levels.md`…) keep the reasons; a chapter line the code contradicted is struck there.

| scenario | what it specifies |
| --- | --- |
| `s01-open-the-atlas` | the splash, the one bar, the year faded in over the relief |
| `s02-navigate` | keys, wheel, drag, the window's edges, the limits, the view kept |
| `s03-click-and-focus` | the click that recentres, the double-click into the focus, ‹escape› |
| `s04-levels-of-detail` | the four stops, the fade in time, the two thresholds, the layers' order |
| `s05-the-countries` | fills, borders, vassals, tribes, the countries' names |
| `s06-the-cities` | marks, names, the names' reach, a point yielding to a name |
| `s07-the-events` | pins, flat drawings, 3D icons, light and shadow |
| `s08-the-sheet-and-its-decor` | the sheet, frame, title, relief, coast, rhumbs, rose, rivers |
| `s09-when-something-is-missing` | the notices, blocking or degraded |
| `s10-language-and-accessibility` | the language, reduced motion, keyboard, screen reader |
| `s11-the-language-button` | the language button |
| `s12-the-help-button` | the help button |
| `s13-the-navigation-pad` | the navigation pad |
| `s14-the-snapshot` | the snapshot |
| `s15-the-century` | choosing the century |
| `s16-the-share-link` | the share link |
| `s17-the-map-as-a-list` | the map as a list |

**Places & events (Payload)** — nothing yet, and it is an application too (see
`rules/architecture.md`, "apps and resources").

---

## 7. Code → scenario: the other direction (the dev's call, 2026-10-18)

> *« il faut que cette histoire de scénarii to code, code to scénarii, ce soit en double sens »* — the dev, after an
> audit found that of a dozen gestures shipped 15–18/10, **one** had a scenario (`s18`), and three scenarios said
> the contrary of the code (H-04's *"double-click is not used"*, `s16`'s unasked keys, `s08`'s co-vassal limit).

Scenarios come first, and they stay first only if what ships flows back into them. A feature built on the dev's
word in the moment — a double-click, a typeahead — is product work nobody specified; §5 says to stop and write
the scenario first, and when that did not happen, it is written **in the commit that ships it**, never later.

**a. In the same commit as the gesture.** A gesture shipped or changed gets its `Scenario:` in the governing
file — gestures and visible outcomes, the bar's messages **quoted exactly as the code writes them** — plus a
dated prose note: `> **Built <date> (<commit>, <ticket>)**`, and *"not walked yet"* until a walk happens. A
review that changes a behaviour (a refusal, a message) changes its scenario too.

**b. A walk is written back.** When the dev or I use the gesture in the app, the note becomes *"Walked <date>"*
with what the walk changed ([[every-walk-becomes-scenarios]]); a surprise goes to `s99`.

**c. When code and scenario disagree, ask which is the decision.** The dev's latest word wins — usually the
code, built on his request; sometimes the scenario, and then the code is the defect. The losing line is
**struck** (`~~…~~`) with a dated note saying what replaced it and on whose word — **never deleted**: the
history of a decision is what stops it being re-litigated.

**d. The audit — when asked, and at every `/end-session`.** List the user-facing commits since the last audit
(`git log --since=<date>`, leaving out data, docs and tooling); for each, the governing `sNN`, the `Scenario:`
that covers it (file:line), whether it was walked, or **none**. Read the code for each gap — never the commit
message alone, it rounds off. Write the missing scenarios from the code, strike what contradicts it, and report
the table.

**The code is evidence of behaviour, not of intent.** Writing a scenario from code describes what it does; if
what it does was never asked for, the scenario says so (`> **Built … — not asked for, kept pending the dev**`)
instead of dressing it up as a decision. That is the line §5 draws: a scenario must never merely describe the
code — it records what was decided, and the code is checked against it.

## 8. What this skill does not do

It decides no product question. A scenario's prose settles many of them, `s99` lists the rest as open,
and an open hole is **the dev's call** — the decision tables carry a `by` column precisely because an
inference of mine was once filed as his decision.

It replaces nothing either: `rules/tests.md` (the five levels), `rules/error-handling.md` (a fallback is
a decision, discussed before it is written) and `/review` all still apply. This sits before them. It
says what the code owes, and how honest the rung has to be about what it still does not.
