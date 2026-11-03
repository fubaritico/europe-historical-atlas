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
