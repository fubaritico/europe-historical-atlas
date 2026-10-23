# 15 — Offline and online: where a year goes, and how the atlas reads it

> [Index](s00-index.md) · **These are integration scenarios, not interface ones.** Every other file in
> this set describes a gesture at the button; this one describes what happens *behind* the Cartographer
> and behind the atlas — a path in a repository, a build, a URL served. Written 2026-10-06 at the dev's
> request, because nothing said where the files live and that decides more than it looks.
>
> The gestures themselves are specified elsewhere and are **not repeated here**: creating a polity in
> [s02](s02-create-france-1100.md), editing in [s03](s03-edit-existing-border.md), saving and reopening
> in [s04](s04-save-and-reopen.md). `s04` says *"the file is written"* and deliberately never says where.
> This is where.

## The one thing to hold on to

**The gesture is identical in both modes; only the destination differs.** The author presses ‹ctrl+s› and
does not have to know which mode they are in. That is what makes offline and online a *wiring* choice
rather than two products — and it is the reason none of the scenarios below touch the interface.

| | the author does | the file goes | the atlas reads |
| --- | --- | --- | --- |
| **offline** | ‹ctrl+s› | the author's own disk, then `packages/atlas/public/years/<year>/` by hand | a relative URL, after a commit and a build |
| **online** | ‹ctrl+s› | a Netlify Function, which commits it to the repository | the same relative URL, after the same build |

### Why the detour through the repository

Explained to the dev on 2026-10-06 and settled there. Two things this project has already paid for
depend on it:

- **the deployed bytes are the checked bytes.** The CI builds once, asserts (no three.js in the worker
  chunk, no GPL geometry in the output), and deploys *those* bytes. A year living in a blob store read at
  runtime is outside the build, so neither guard covers it any more.
- **provenance.** A drawn year is a contribution: who, when, against what. Git records that for nothing;
  a bucket records the last write and no history. For a *historical* atlas that is not a detail.

The cost is one to two minutes of rebuild. That is the whole cost.

---

## Offline — the mode today

```gherkin
Scenario: create a year, draw it, and save it — offline
  Given the Cartographer runs on the author's machine
  And no year 1100 exists yet
  When the author draws the Kingdom of France and presses ‹ctrl+s›
  Then three files are written: registry.json, polities.json, borders.json
  And they carry the year 1100 inside them, not only in their path
  And nothing else is written — no border geometry, no computed colour
```

```gherkin
Scenario: the atlas picks the year up — offline
  Given the three files sit in packages/atlas/public/years/1100/
  And years/index.json lists 1100
  When the atlas is built
  Then public/ is copied wholesale into dist/
  And the atlas fetches /years/1100/polities.json as a static file
  And it fetches it exactly as it fetches /heightmaps/europe-dem-z5.bin
```

> **This already works, and one file proves it.** `years/index.json` is committed today and
> `mapPipeline.ts` reads it at `'/years/index.json'`. It is simply empty — `"years": []`. The path
> exists; there is only a year to put in it.

```gherkin
Scenario: open a year, modify it, save it — offline
  Given years/1100/ exists and is listed in the manifest
  When the author opens it, moves sixty anchors, and presses ‹ctrl+s›
  Then the same three files are rewritten in place
  And the anchors that two outlines shared are still shared
  And the manifest is untouched, 1100 having already been listed
```

```gherkin
Scenario: the year is not listed in the manifest
  Given years/1100/ exists on disk
  And years/index.json does not list 1100
  Then the atlas does not load it, and says nothing
  And that is correct: a year absent from the manifest is a fact, not a failure
```

> **The distinction `data/yearManifest.ts` was built on.** A 404 is also what a hiccuping server returns,
> so answering one with the previous payload would show last century's borders without a word. A year
> *absent from the manifest* is a decision; a year *listed and failing* is a breakdown, and only the
> second one is announced.

### Local mode — the dev server writes (built and walked 2026-10-12)

> `H-28` answered for working on the dev's machine: the Cartographer's own dev server writes the year
> (`PUT /__years/<year>`), straight into `packages/atlas/public/years/<year>/`. Walked end to end in the dev's
> Chrome the same evening — every line below was seen on screen or read on disk.
> `files/plans/cartographer/save-open-plan.md` holds the decisions (D1–D10).

```gherkin
Scenario: the editor opens the saved year by itself
  Given years/index.json lists 1100 and years/1100/ holds its three files
  When I load http://localhost:5174/
  Then a green toast reads "opened 1100 · 1 polity · 1,101 vertices" before the backdrop has finished baking
  And {Polities} lists the saved polities
  And the undo line starts fresh on the opened year
```

```gherkin
Scenario: a year never saved starts empty, and says so
  Given years/index.json does not list 1100
  When I load the Cartographer
  Then a toast reads "1100 has never been saved — starting from an empty map"
  And ‹ctrl+S› is allowed
```

```gherkin
Scenario: save in place
  Given I have drawn the Kingdom of France
  When I press ‹ctrl+S›
  Then a green toast reads "saved 1100 · 1 polity · 1,101 vertices"
  And registry.json, polities.json and borders.json are written under years/1100/
  And years/index.json lists 1100, written last
  And the page does not reload, and the drawing stays on screen
```

```gherkin
Scenario: reopen and find it identical, to the byte
  Given a saved year
  When I reload the page, then press ‹ctrl+S› without touching anything
  Then the three files and the manifest are rewritten
  And their contents are byte-for-byte what they were
  And two polities that shared 61 anchors still share 61
```

```gherkin
Scenario: an unreadable year blocks saving rather than being overwritten
  Given years/index.json lists 1100 and its polities.json fails its schema
  When I load the Cartographer
  Then the editor starts on an empty map
  And the alarm dialogue says why 1100 could not be read, and that saving is blocked
  And ‹ctrl+S› writes nothing and repeats the reason
```

```gherkin
Scenario: drawing before the saved year arrives
  Given the start-up read is still in flight
  When I edit the empty map, and the read lands afterwards
  Then the read is not applied — my edit stays
  And saving is blocked, and the alarm dialogue says to reload to open the year
```

```gherkin
Scenario: a page from elsewhere cannot write a year
  Given the dev server is running on localhost
  When another site's page sends PUT /__years/1100
  Then the server answers 403 and writes nothing
  And the same holds for a DNS-rebound name whose page is same-origin with itself
```

```gherkin
Scenario: the saved years are working copies, never committed
  Given I have saved 1100 locally
  Then git status shows nothing — the year folders are ignored and years/index.json is skip-worktree
  And a copy kept under a suffix (years/1100.france-v1/) is ignored too, and read by nothing
```

---

## Online — the later tier

```gherkin
Scenario: create a year, draw it, and save it — online
  Given the Cartographer is deployed at its own Netlify address
  And a Netlify Function holds a repository token, server-side
  When the author draws 1100 and presses ‹ctrl+s›
  Then the three files are sent to that function
  And the function commits them to packages/atlas/public/years/1100/
  And the commit message names the year and the author
  And the manifest is updated in the same commit, never in a second one
```

> **One commit, not two.** A manifest updated separately can list a year whose files have not landed yet,
> which is the only state the atlas cannot read and cannot explain. Atomic, or the failure is invisible.

```gherkin
Scenario: the deployment catches up
  Given the commit has landed
  When the CI builds
  Then it runs the same assertions it runs for every build
  And Netlify serves the new dist/
  And /years/1100/polities.json answers from then on
```

```gherkin
Scenario: open a year, modify it, save it — online
  Given 1100 is published
  When the author opens it from the deployed Cartographer, edits it, and saves
  Then the function commits over the three existing files
  And git holds both versions, so the earlier one is not lost
  And the manifest does not change, 1100 having already been listed
```

```gherkin
Scenario: the author is told what state the work is in
  Given the author has just saved online
  Then the editor says the work has been sent
  And it says the published map will catch up in a minute or two
  And it does not claim the year is live while the build is still running
```

> **H-27.** What tells the editor the build has finished is not decided, and the honest intermediate state
> has no control yet: *sent* is not *published*. Claiming the second while the first is true is the only
> genuine lie available here.

---

## What breaks, and that is where this gets decided

```gherkin
Scenario: the function cannot be reached
  Given the author has unsaved work
  When the save is sent and the network fails
  Then the work is NOT lost and the modified marker stays
  And the author is offered the offline path: download the three files
  And nothing claims a save happened
```

```gherkin
Scenario: the write is refused
  Given the function rejects the request as unauthorised
  Then the author is told the write was refused, not that the network failed
  And the two are never reported as one thing
```

> The distinction `data/assetError.ts` already draws for reads — `transport | schema | consistency |
> semantic` — is the one to draw for writes. "It did not work" is not a message.

```gherkin
Scenario: the build fails after the commit
  Given the three files are committed
  When the CI build fails
  Then the previously deployed site keeps serving the previous year
  And the commit stays in the repository, so nothing is lost
  And the failure is the CI's to report, not the editor's to hide
```

```gherkin
Scenario: two saves of the same year
  Given two saves of 1100 are sent close together
  Then the second commit lands on top of the first
  And git holds both, so neither is destroyed
  And whoever saved first can see that they were overwritten
```

> **H-29.** With one author this cannot happen. With two it is the ordinary case, and nothing above
> resolves it — a second author is the whole of tier B (accounts, review, conflicts) and is not specified.

```gherkin
Scenario: the browser cannot write to a folder
  Given the author is offline and the browser has no File System Access API
  When they press ‹ctrl+s›
  Then the three files are downloaded instead
  And the author is told where they must be placed
```

> **H-28.** Which mechanism the offline save uses is not decided: a **download**, which works everywhere
> and makes the author move the files by hand, or the **File System Access API**, which writes straight
> into a chosen directory and lets ‹ctrl+s› overwrite in place. The second is far better for the author
> and is not available in every browser. It does not block drawing 1100.

```gherkin
Scenario: the year already exists
  Given 1100 is published
  When the author saves a year numbered 1100 from a different file
  Then they are warned before anything is written
```

> **H-30.** [s05](s05-derive-a-year.md) decided that overwriting an existing year **renames the old one**
> rather than destroying it. Offline that is a file rename; online, git already keeps every version, so
> the rename may be redundant — or may still be wanted, so the old year stays *listed*. Not decided.

---

## What is settled here, recorded so it is not reopened

- **The exchange between the two applications is `packages/atlas/public/years/`**, read over a relative
  URL like every other asset. Not a database, not a blob store.
- **Online writing goes through the repository**, by a function holding the token server-side — never by
  a token in the bundle, which is a published secret.
- **The gesture does not change between modes.** Only the destination does.
- **Drafts are a different question from published years.** If autosave is ever wanted online, a blob
  store is right for drafts — written often, disposable, no provenance to keep — while git stays right
  for what is published.
- **Writing online belongs to the milestone that already has a name**: accounts, authentication, the
  security layer, Payload going online and Sentry. `plan.md` says of those that they are *one milestone,
  not three*; this is the fourth thing in it, not a fourth milestone.
