# The interface over the map — scenarios for Claude Design — ATLAS-329

> Opened 2026-11-01, past 3 a.m., at the dev's request, once the atlas's ten scenarios were written (`scenarii/`): *"from
> that, we'll be able to write the scenarios of what we are missing, to hand them to Claude Design — to describe all the
> behaviour of the interface you will have over the map. That is something we will have to define."* What exists is the
> map; what is missing is everything a reader uses over it. The dev will provide screenshots of the atlas and other
> pictures for inspiration — old maps, captures of other things — for the application's general mood.

## The approach — agreed by the dev, 2026-11-01

1. **The list of features first.** Claude brings the features already promised (below); the dev chooses what goes in.
2. **One scenario a feature**, following `s01`…`s10` (`s11` on), written from the reader's side — gestures and what is
   seen, never a control invented to fill a gap; what is not decided goes to `scenarii/s99-holes.md`, as `A-NN`.
3. **The mood**: the dev's screenshots and old maps, handed to Claude Design with the scenarios.

**Two families, not to be mixed** (the dev, 2026-11-02): **the flat interface over the viewport** — buttons and windows in
HTML, built with the design system, no 3D in them — and **what happens in the map** — clicking a country or an event, the
focus — interface too, but inside the 3D scene. The flat interface is written first.

| the flat interface — chosen and written | scenario |
| --- | --- |
| the language button | [s11](scenarii/s11-the-language-button.md) |
| the help button: every gesture with its key, a walkthrough opened by itself at the first visit | [s12](scenarii/s12-the-help-button.md) — ATLAS-135 |
| the navigation pad, above the button bar at the bottom right | [s13](scenarii/s13-the-navigation-pad.md) — ATLAS-149 |
| the snapshot: the view as a framed picture, with its cartouche | [s14](scenarii/s14-the-snapshot.md) — the dev, 02/11 |
| choosing the century — a simple selector, not a timeline | [s15](scenarii/s15-the-century.md) — ATLAS-150 |

**The synchronoptic frieze — the dev's call, 2026-11-05**, after Claude Design's mock-up (its screens in `files/resources/claude-design/atlas-png/`, « 15 · La frise
synchronoptique » and « 25 · Téléphone — la frise »; every file Claude Design makes for the atlas's screen lives in
`files/resources/claude-design/` since 2026-11-05, the dev's call):
- **First a reading companion**: what happens around the year shown, to give context; a click shows the event on the
  map. The map does not change year. **A click on an element that has a place on the map** (the dev, 2026-11-05): the
  map focuses on it **and** the panel on the right opens with its text — a short editorial text, written by hand from
  what is known, reworded.
- **Once there are several maps**: a mark on the frieze where a year has its map (a small icon above the cursor), to
  go straight to it. Moving along the frieze updates the map only the day every year has one.
- **Its layers follow a synchronoptic book the dev owns**: Arno Peters, *Synchronoptische Weltgeschichte* (1952), in
  its French edition — recognised from the dev's scan of 2026-11-05 (fifty years of the 11th century), confirmed by
  him. Peters died in 2002, so it is in copyright until 2072, the same status as Euratlas and Duby: **facts and dates
  may be taken, its descriptions never**. Its choice of facts is known to lean (from memory): every fact taken is
  checked against a second source, as the cities are against Wikidata.
- **What the scan shows**: one column per year; from top to bottom a wavy band naming the century with a one-line
  summary of it, **civilisation** (inventions, works, buildings — one vertical text per year), **people** (a horizontal
  band per person, as long as their life, the name large: grey-green for thinkers, pink for rulers), **politics** (one
  vertical text per year) and **wars** (a frame across their duration). Three shapes, then: **an instant**, **a span**,
  **a summary**. Read closer: the top holds two layers, **economy and techniques** above **civilisation**, and the
  people split into thinkers above and rulers below — six layers and the century's band.
- **A condensed selection, not Peters' six — the dev's call, 2026-11-05, on my proposal** (*"that is what I expected"*):
  - **five layers**: period · wars · politics · people · civilisation — economy, techniques and sciences folded into
    civilisation (Claude Design's mock-up has six: its « Économie, techniques, sciences » goes);
  - **kept from Peters**: the column per year and the three shapes — the instant (a lozenge), the span (a bar: a reign,
    a war, a building site), the period (the band);
  - **left out**: **every text** — on the frieze a name and dates only; the text is ours, in the right-hand panel on
    click (no typesetting to fight, and the copyright settled with it) · **the world off the map** (the Incas, China,
    Japan): an element enters only if it has a place on the map, or if it frames the year shown (a reign, the
    Investiture Controversy) · **density**: a few elements per layer at once, the rest by zooming in time, as the map's
    detail levels do;
  - **one data, two views**: the frieze's elements are the CMS's events — the map and the frieze read the same ones,
    selected once by the historian.
- **Claude Design's v2 applies it** (2026-11-05, screens 15 and 25 in `files/resources/claude-design/atlas-png/`). Two
  defects to settle when building it, mine to fix, nothing to ask back: a name too long for its bar is cut
  (« PREMIÈRE C… ») — write it beside the bar, as a lozenge's; the year's line crosses the names — break it behind them.
- My proposal, not decided: its own epic after the map's interface; one line folded by default; an uncertain date
  drawn with a blurred end — the same mark as on the map.

**References for the mood, to hand Claude Design** — named, never copied: **GeaCron** (geacron.com), the dev's reference
for a historical atlas with a timeline; **Chronas** (chronas.org), named by me, to be looked at by the dev.

## The features already promised — to choose from

| feature | where it is promised |
| --- | --- |
| choose the century from the map | ATLAS-150 |
| click a country: who holds this point | ATLAS-147 |
| a country's name in the reader's language, and a link to Wikipedia | ATLAS-244 |
| an event's panel — title, date, actors, consequences | the atlas's end goal (`CLAUDE.md`, « Project »); nothing is clickable today (A-06) |
| a 3D button on the map to enter the focus | ATLAS-157 |
| a country focus — a top-down view framed on the country | ATLAS-148 |
| on-screen navigation buttons | ATLAS-149 |
| choose the interface's language, and remember it | ATLAS-266 — **chosen by the dev, written: [s11](scenarii/s11-the-language-button.md)** (02/11) |
| the year's provenance and licence, shown | ATLAS-152 |
| an uncertainty's *why*, on click — blur and hatching | DESIGN-262 (`files/plans/evidence-system.md`) |

## The tone — decided by the dev, 2026-11-03

**Not parchment everywhere**: a **camaieu**, one range of the map's own hues a little darker than its parchment; **brown
buttons**, as the year buttons are today; **ornament, clearly** — friezes, frames, cartouches; **light gradients** on
the surfaces, never flat and never glossy. Ornament drawn from Speed (1626) and Jolivet (1570), both public domain: the
strapwork cartouche, the graduated frame, the title band, the medallions; the year on a cartouche after Kings and
Generals. The loading screen takes Total War's composition only, the tip in a cartouche, the progress bar as the
graduated frame filling — my proposal. **The research behind it**, its sources and their rights, and a first translation
into interface pieces: [`ornament-17th-century.md`](ornament-17th-century.md) (2026-11-03) — Claude Design draws first,
I rework, we finish the identity together (the dev, same day).

**Open, the dev's idea of the same evening — one design per era?** Working with Claude Design, he found himself drawing
« a 17th-century design, Versailles, Louis XIV » — the trap he wanted to avoid, the atlas running from the 1st century
to the 21st. His thought: **ornament libraries from several eras, perhaps three designs that alternate with the century
shown**. Not decided; Claude Design is paused until 2026-11-04, its result to be taken as it is and reviewed from his
screens. My task for then: the research of ornament libraries by era, and the prompts to give Claude Design while he
tests the Cartographer. Chosen over a dark,
translucent game interface (Crusader Kings), which was the other way offered. **The loading screen is designed with
the rest** (the dev, same day), from s01.

## The pictures — where they go

**The repository is public.** A game's screenshot or a map still in copyright is never committed: it goes in
`files/resources/` (git-ignored) and is handed to Claude Design only. A public-domain map may be committed, with its
source — the `/create-data-mention` rule for a year's sources applies to a plate used for the mood as well.
