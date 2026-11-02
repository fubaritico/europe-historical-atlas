# 19 — A map is a folder: Open…, Save, Save as…, Save a copy

> [Index](s00-index.md) · CARTO-340. **The dev, 2026-11-02**, after looking for his map of 1100 from before Cliopatria and
> finding it nowhere in *Open…*: *"it is not a snapshot, it is a map with a name. Simply. A map exists, there is a
> folder for that map, I can open that map. […] I couldn't care less about snapshots. Remove that feature entirely —
> we don't even know where the snapshots are, they're not even in the years folder."*
>
> **Decided by the dev, 2026-11-02:**
> - **A map is a folder of `packages/atlas/public/years/`**, and its name is the folder's name. *Open…* lists every
>   folder there; nothing else is a map.
> - **The four gestures**, in his words: *Open…* — open a map from the list, offering to save the current one;
>   *Save* — save the current map; *Save as…* — save a copy of the current map under any name **and go on working on
>   the copy**, which **first saves the map it was made from**; *Save a copy* — save a copy named after the current map
>   `+ .copy.<date and time>`, **the current map staying open**.
> - **Before opening a map, one question**: *"You are about to open this map. Save the current map?"* — **Yes** saves,
>   then opens; **No** opens without saving.
> - **The map opened keeps the view of the one before**: the same point of view and the same zoom.
> - **The snapshots are removed entirely** — *Open snapshot*, the hourly snapshot, the page kept as a snapshot before
>   an opening ([s18](s18-autosave.md), rungs 2a and 2b, struck). **The automatic draft stays**: it is the net for a
>   tab that crashes, a different thing, and only shows itself then.
> - **The folder named exactly as a year (`1100`) is the map the atlas publishes for that year**; any other folder
>   (`1100-backup-2026-11-02`, `1100.copy.…`) is a working map the atlas does not read — proposed by Claude, not
>   objected to by the dev (2026-11-02).
>
> **Proposed by Claude, not decided** — each marked *proposal* below, to settle with the dev before it is built:
> the year inside a copy, a name already taken, the names refused, ‹escape› on the question.

## Open…

```gherkin
Scenario: Open… lists every map
  Given the folders of years/ are 1100, 1100-backup-2026-11-02 and 1200, and 1100 is open
  When I press [Open…]
  Then a dialogue « Open a map » lists 1100, 1100-backup-2026-11-02 and 1200, in the order of their names
  And it writes « 1100 — open », not as a choice
  And every other map is a choice

Scenario: open a map, saving the current one
  Given 1100 is open, modified since its last save
  And the view is zoomed in on Brittany
  When I choose « 1100-backup-2026-11-02 » in « Open a map »
  Then a question reads « You are about to open this map. Save the current map? » with [Yes] and [No]
  When I press [Yes]
  Then 1100 is saved, exactly as ‹ctrl+S› saves it
  And the Cartographer opens 1100-backup-2026-11-02, its name in the top bar
  And the view is zoomed in on Brittany, as it was

Scenario: open a map without saving the current one
  Given 1100 is open, modified since its last save
  When I choose « 1200 », then press [No] at the question
  Then nothing is written
  And the Cartographer opens 1200, with the view of 1100

Scenario: open a map when nothing changed
  Given 1100 is open, not modified since it was opened or saved
  When I choose « 1200 »
  Then no question is asked
  And the Cartographer opens 1200, with the view of 1100

Scenario: the current map cannot be saved
  Given 1100 is open and modified, and the dev server refuses the save
  When I choose « 1200 » and press [Yes]
  Then 1200 is not opened: 1100 stays open as it was
  And the alarm dialogue says the save failed, as for ‹ctrl+S›
```

> **Proposal — ‹escape› on the question**: the question closes and nothing happens, 1100 stays open — every dialogue of
> the Cartographer closes on ‹escape›. The dev named only [Yes] and [No].

```gherkin
Scenario: the address names the map
  Given 1100-backup-2026-11-02 was opened
  Then the address reads ?map=1100-backup-2026-11-02
  And reloading the page opens 1100-backup-2026-11-02 again
  But with no map in the address it opens 1100, as before

Scenario: an address naming no map
  Given the address reads ?map=1300 and years/ holds no folder 1300
  When the Cartographer starts
  Then it opens nothing, and says « no map named 1300 — Open… lists the maps there are »
```

> The refusal of a name that is not a map keeps the choice of this morning for a year that is not one: opening 1100 in
> its place would have him drawing on 1100 while believing it another map. Said on screen now, not in the console only
> — *proposal*.

## Save

```gherkin
Scenario: save the current map
  Given 1100-backup-2026-11-02 is open and modified
  When I press ‹ctrl+S› or [Save]
  Then the three files of years/1100-backup-2026-11-02/ are written
  And no other folder changes
  And a green toast reads « saved 1100-backup-2026-11-02 · … »
```

> The save over a map changed on disk since it was opened still asks first ([s18](s18-autosave.md), rung 3) — the
> fingerprint is the folder's, whatever its name.

## Save as…

```gherkin
Scenario: save as, and go on working on the copy
  Given 1100 is open and modified
  When I press [Save as…] and type « 1100-essai-bretagne »
  Then 1100 is saved first, with the changes
  And years/1100-essai-bretagne/ is written, a full copy of the page
  And the page is now 1100-essai-bretagne: its name in the top bar and in the address
  And the next ‹ctrl+S› writes years/1100-essai-bretagne/, never 1100
  And the view and the undo line are those of the page, untouched

Scenario: save as cannot save the map it starts from
  Given the dev server refuses to write 1100
  When I press [Save as…] and type « 1100-essai »
  Then no copy is written, and the page stays 1100
  And the alarm dialogue says the save failed
```

> **The year inside the copy — the copy keeps the year of the map it comes from, whatever its name.** Claude proposed
> that a name which is a year (« 1110 ») write that year inside the files, as the first design did
> ([s04](s04-save-and-reopen.md), 2026-09-22); the dev answered *"no"* (2026-11-02) — read by Claude as a refusal of that
> proposal, said back to him. Deriving another year is therefore not *Save as…* any more; how it is done is open.

```gherkin
Scenario: save as under the name of the current map is refused
  Given 1100 is open
  When I press [Save as…] and type « 1100 »
  Then nothing is written, and the page stays 1100
  And under the field: « This is the name of the map open — to save it under the same name, use Save »
```

> **Decided by the dev, 2026-11-02**: *"if we save as 1100 we must be warned that save as only works with another name;
> to save with the same name is Save only."*

```gherkin
Scenario: a map named as a year must be that year
  Given 1100 is open — its files declare the year 1100
  When I press [Save as…] and type « 1200 »
  Then nothing is written
  And under the field: « A map named 1200 is the map of the year 1200, which the atlas publishes — this map is 1100. Choose another name »
```

> **Follows from the dev's "no"** (a copy keeps its year): a folder named `1200` holding 1100 would be published by the
> atlas as 1200. Claude's guard, on the server as well as in the dialogue.

```gherkin
Scenario: save as under the name of another map is refused
  Given 1100 and 1100-essai are maps, and 1100 is open
  When I press [Save as…] and type « 1100-essai »
  Then 1100 is saved, then nothing else is written, and the page stays 1100
  And under the field: « A map named 1100-essai exists already — choose another name »
```

> **Built so by Claude, 2026-11-02 — a proposal, not the dev's word**: *Save as…* never writes over another map; the
> first proposal (« Replace it? ») was dropped as a second way to overwrite a map that *Save* already is. **Proposal — the names refused** (built so): a name is letters, digits, `-`, `_`
> and `.`; anything else (a `/`, a space at either end, an empty name) is refused under the field, saying which
> characters are allowed.

## Save a copy

```gherkin
Scenario: save a copy, staying on the current map
  Given 1100 is open and modified, at 18:30:12 on 2 November 2026
  When I press [Save a copy]
  Then years/1100.copy.2026-11-02T18-30-12/ is written, a full copy of the page
  And the page is still 1100, still modified: nothing is saved into 1100
  And a green toast reads « copy saved as 1100.copy.2026-11-02T18-30-12 »
```

> The date and time are the page's clock, in the folder name's form — no `:` in a folder name.

## The automatic save — a map in `years/`, like the others

> **Decided by the dev, 2026-11-02, evening**: *"the autosaves are named <name of the current map>.autosave.<date +
> time>; no more reference to snapshots — what is saved automatically is in the years folder and nowhere else; there
> is no draft, no snapshot."* Then: one folder per opening, rewritten after each gesture; **kept** (*"for now we keep
> them"*); after a crash, found through *Open…*. The draft of `s18` and its dialogue at the opening are removed.

```gherkin
Scenario: the page is saved automatically, as a map of years/
  Given I opened 1100 at 19:05:12 on 2 November 2026
  When I place an anchor and wait two seconds
  Then years/1100.autosave.2026-11-02T19-05-12/ holds the page with that anchor
  And ~~years/1100/ has not changed until I press ‹ctrl+S›~~ years/1100/ holds it too
  And nothing is said about it

> **Changed 2026-11-02, late evening, on the dev's word**: *"you keep everything. I just want, as in any software, as in
> IntelliJ, that as you go, it saves."* The map open is written too, at each pause, after its autosave — silently
> (`yearSession.saveSilently`); the autosave copies stay. A save already running is left to finish; a failure, the map
> changed on disk included, is said once by the automatic save's alarm, and nothing asks. **Not walked yet.**

Scenario: one folder per opening, not one per gesture
  Given 1100 was opened at 19:05:12
  When I draw for an hour, pausing now and then
  Then years/ holds one autosave of this opening, 1100.autosave.2026-11-02T19-05-12, written again at each pause

Scenario: a save keeps the autosave
  When I press ‹ctrl+S›
  Then years/1100/ is written, and years/1100.autosave.2026-11-02T19-05-12/ stays where it is

Scenario: after a crash, the autosave is opened like any map
  Given the tab was closed without saving, after drawing
  When I open the Cartographer and press [Open…]
  Then « 1100.autosave.2026-11-02T19-05-12 » is in the list, beside 1100
  And choosing it opens the page as it was two seconds before the crash

Scenario: an autosave follows Save as…
  Given 1100 was opened at 19:05:12, and I saved it as « 1100-essai »
  When I draw and wait two seconds
  Then the page is written as years/1100-essai.autosave.2026-11-02T19-05-12/

Scenario: the autosave of an autosave keeps the map's name
  Given I opened « 1100.autosave.2026-11-02T19-05-12 » at 20:00:00
  When I draw and wait two seconds
  Then the page is written as years/1100.autosave.2026-11-02T20-00-00/, not as a second suffix

Scenario: the automatic save cannot be written — said once, and when it recovers
  Given the dev server refuses the autosave
  When I keep drawing
  Then the alarm dialogue says the automatic save is not written — save with ‹ctrl+S› — once
  When it can be written again
  Then a green toast says it is written again
```

> Started once the map is open and saving is allowed; an address naming no map, or a map that could not be read,
> starts none. A name is 128 characters at most, so a working map's name and its suffix fit.

## What no longer exists

```gherkin
Scenario: no snapshot, no draft
  Given the Cartographer is open
  Then no [Open snapshot…] button is in the top bar
  And nothing is written outside years/ — no packages/cartographer/.autosave/
  And no dialogue offers a draft at the opening
```
