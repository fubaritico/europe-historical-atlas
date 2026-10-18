# 18 — Nothing drawn is lost: the draft and the snapshots

> [Index](s00-index.md) · CARTO-238, asked by the dev on 2026-10-17: *« la sauvegarde automatique toutes les
> 30 secondes, et un snapshot complet toutes les heures […] on ne peut pas se permettre de perdre quelque
> chose »* — then *« qu'est-ce qui se passe s'il y a un problème de courant, ou si je ferme mon navigateur par
> erreur ? »* Two losses had already happened: a reload of his page by Claude (14/10), a ‹ctrl+S› writing a
> stale state back (15/10).
>
> **Decided with the dev, 2026-10-17** (the card holds the exchange):
> - **A draft, after every gesture, not on a 30-second clock** — 2 s after the last change; at most that is
>   lost, and nothing is written while nobody draws.
> - **On disk, not in the browser** — a closed tab, a crash, a power cut, cleared browser data: the draft
>   survives all of them. Written atomically (beside, then renamed), like ‹ctrl+S›.
> - **Outside `public/`** — `packages/cartographer/.autosave/`, git-ignored. Under `public/years/` the dev
>   server would serve the drafts and every build would publish them (caught while building, 17/10).
> - **‹ctrl+S› stays the only gesture that writes the year.** A draft never touches `years/`, so `git
>   status` does not move until the author saves.
> - **Nothing loses a draft**: declining it sets it aside under a dated name; a draft that cannot be read
>   is set aside too, never left where the next gesture would write over it.
> - **Silent when it works, said when it fails** — once, then again when it recovers.

## Rung 1 — the draft and its recovery (built 2026-10-17)

```gherkin
Scenario: a gesture is kept as a draft a moment later
  Given 1100 is open and I have not pressed ‹ctrl+S›
  When I place an anchor and wait two seconds
  Then packages/cartographer/.autosave/drafts/1100.json holds the document with that anchor
  And nothing has changed under packages/atlas/public/years/
  And the status bar says nothing about it
```

```gherkin
Scenario: the page is closed, then reopened — the work is offered back
  Given a draft of 1100 written today at 15:42, newer than the last save
  When I open the Cartographer
  Then once 1100 has been read, a dialogue asks "A draft of 1100 was kept today at 15:42, with work that was never saved. Resume it?"
  And [Resume] holds the focus
  When I press [Resume]
  Then the map is the draft, and the status bar reads "resumed the draft of 1100 today at 15:42 — ‹ctrl+S› to save it"
  And the disk is untouched until I press ‹ctrl+S›
```

```gherkin
Scenario: declining a draft keeps it
  Given the dialogue offers the draft of 15:42
  When I press [Set it aside], or ‹escape›
  Then the saved year stays open
  And the draft is renamed 1100.set-aside-<date and time>.json in the same folder
  And the status bar says where it went
```

```gherkin
Scenario: a save removes the draft — unless I drew while it ran
  Given a draft of 1100 is kept
  When I press ‹ctrl+S› and the year is written
  Then the draft is removed, and nothing is offered at the next opening
  But if I placed an anchor while the save was running, the draft is kept and brought up to date
```

```gherkin
Scenario: the draft cannot be written — said once, and when it recovers
  Given the dev server answers the draft with an error
  When I keep drawing
  Then the status bar reads "the draft is not kept (<reason>) — save with ‹ctrl+S› not to lose your work", once
  And the console logs it as an error, once
  When drafts can be written again
  Then the status bar reads "the draft of 1100 is kept again"
```

```gherkin
Scenario: a draft that cannot be opened is set aside, not overwritten
  Given the kept draft of 1100 is not a year core can read
  When I open the Cartographer
  Then nothing is offered
  And the draft is set aside, and the status bar says why and where
```

> **Proved by sabotage**, 2026-10-17: removing the draft on *every* successful save fails *"keeps the draft
> when the author drew between the save and its answer"*; writing without the queue fails *"never lets a
> slow write land after a newer one"*; leaving an unreadable draft in place fails *"sets aside a draft that
> cannot be read"*. Each trap is caught by its own test.

## Rung 3 — the year changed on disk under the page (2026-10-18)

> **Why first**: it is the loss that really happened, twice — Claude wrote into `years/` while the dev's
> page was open, and his next ‹ctrl+S› wrote the old state back over it (`known-issues.md`, 16/10).
> **How it knows**: at the opening the archive keeps a fingerprint of the three files it read; a save sends
> it, and the dev server compares it with the files on disk **as it writes** — no write can slip between the
> check and the save. A year never saved has no fingerprint, and its first save is unconditional.

```gherkin
Scenario: a save over a year changed on disk asks first
  Given 1100 was opened, then its files were rewritten on disk at 14:02 by something else
  When I press ‹ctrl+S›
  Then nothing is written yet
  And a dialogue asks "1100 was changed on disk today at 14:02, since it was opened. Overwrite it with this page?"
  And [Cancel] holds the focus

Scenario: overwrite
  Given the dialogue is open
  When I press [Overwrite]
  Then the page is written over the files, and the status bar reads "saved 1100 · …"
  And the next ‹ctrl+S› saves without asking — the page is now what is on disk

Scenario: cancel
  Given the dialogue is open
  When I press [Cancel], or ‹escape›
  Then nothing is written, the page and its draft stay as they are
  And the status bar reads "not saved — 1100 was changed on disk today at 14:02; ‹ctrl+S› again to choose"
  And the console warns it once

Scenario: my own saves never ask
  Given 1100 was opened, and I saved it twice
  When I press ‹ctrl+S› a third time, with nothing else writing
  Then it saves without asking
```

## Not built yet — the rungs that follow (CARTO-238's checklist)

> **Decided with the dev, 2026-10-18** — the order: rung 3 first (the loss that really happened, twice), then
> rung 2; rung 4 dropped.

- **Rung 3 — the file changed under the page**: ‹ctrl+S› warns before writing over a year modified on disk
  since it was opened (a write of Claude's), instead of overwriting it — *"1100 was changed on disk at 14:02,
  since it was opened"* — **[Overwrite] [Cancel]**, nothing else (the dev: *« d'accord, c'est bon »*). [Cancel]
  leaves the page as it is and the draft kept.
- **Rung 2 — a full snapshot every hour of work**, in `.autosave/snapshots/`, only when something changed in
  the hour. ~~Keeping the last 24 and one per day~~ (Claude's proposal) — **all are kept**, the dev: *« on les
  conserve … on verra ensuite »* (≈ 3 MB an hour of work). **Loading one** — the dev's idea: a dated list
  ("Snapshots…" beside [Open…]), select, load; with unsaved work, [Overwrite] or [Cancel]. Loading replaces
  the document **in the page**, undoable; ‹ctrl+S› stays the only gesture that writes the year.
- ~~**Rung 4 — the dev server is down**: the draft goes to the browser's storage, and the status bar says
  *"draft kept in the browser only"*.~~ **Dropped by the dev, 2026-10-18**: with the server down the page
  stays, the status bar already says the draft is not kept, and the next draft once the server is back
  writes the whole document — only closing the tab meanwhile loses work, too narrow for a second store.
- **A gesture made before drafting starts** (QUAL-002, review of 17/10, left open by Claude): drafting starts once
  the year is read and the offer answered; a gesture in that window is drafted only with the next one. The
  window is while the backdrop bakes and the tools still wait. Trigger to revisit: a loss seen in it.
- **Drafting stays off when an old draft cannot be set aside** (ARCH-001): said in the status bar —
  *"automatic drafts are off: move it out of …, then reload"*. Claude's call under the dev's go, to confirm.
- **Walked in the dev's Chrome**: ~~not yet — every line above is asserted by a test, none was seen on screen.~~
  **Tested by the dev on 2026-10-17** (`f967d4d`, CARTO-238): *« ça marche »* — the draft offered back at the
  opening. No walk written down line by line; corrected on 2026-10-18 by the scenario audit.
