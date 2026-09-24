# Cartographer — screens from Claude Design

> Copied here 2026-09-22 so the design can be reworked from the repo rather than from Downloads.
> Brief: [`../ui-inventory.md`](../ui-inventory.md).
> Behaviour: [`../scenarii/`](../scenarii/).

## Start here — the working screens (2026-09-24)

Open **`01 Editor at rest ILLUSTRATOR.html`**, **`03 Polity form.html`**, **`04 Check report.html`**.
They are plain HTML with no runtime: the panels really collapse and really resize.

The dev's brief: _Illustrator's **form**, the atlas's **gamut**_. So the warm dark palette is unchanged
and the structure is Illustrator's — 38px icon rail flush to the edge, stacked panel groups with tab
strips, a document tab bar, hairlines instead of gutters, and **no `border-radius` anywhere**.

| file           | what it holds                                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| `chrome.css`   | the tokens and the chrome. **Meant to survive into the editor almost verbatim.** |
| `chrome.js`    | `mountShell` (the four identical bars) + `initDocks` (collapse and resize)       |
| `screen.js`    | fills the icon-only controls, then mounts the shell and the docks                |
| `mock-data.js` | the only throwaway file: 28 polities, 9 layers, the palette                      |

**Collapse is not a second mechanism.** A collapsed group is its tab strip and nothing else — exactly the
lower bound of the same resize. One number drives both, so they cannot disagree, and folding remembers
the height it put away.

**02 was deliberately not redone.** Its subject is the canvas mid-gesture — anchors, rubber band,
cursors — which the screen itself calls _code, not design_. The chrome around it is already 01.

Still open: the dock's **width** is fixed (only height resizes), and 04's single panel has no collapse,
because collapsing the whole dock would have to be a horizontal gesture that is not built.

## What is here

| file                                                 |                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `01 Editor at rest.dc.html`                          | as Claude Design produced it — light, fixed 1440×900            |
| `01 Editor at rest DARK.dc.html`                     | **the same screen, reworked by hand**: dark chrome, full height |
| `02 Drawing.dc.html`                                 | the canvas mid-gesture — **the only version of this screen**    |
| `03 Polity form.dc.html` · `04 Check report.dc.html` | superseded by the `.html` above                                 |
| `05 Cursors.dc.html`, `cursors/`                     | the cursor sheet and its assets — **final, use as they are**    |
| `support.js`, `assets/`                              | the runtime and the backdrop; the pages need both to open       |

**Every `.dc.html` is frozen provenance, not a live file.** They show what Claude Design produced and
what was changed by hand, which is half of what makes this folder worth publishing. Edit the `.html`
screens; leave the `.dc` ones alone. They are kept because they are evidence, not because they are used.

`uploads/` was not copied — it is Claude Design's echo of the files we gave it, which already live in
`files/plans/`, plus a second copy of the terrain PNG.

Open any file directly in a browser.

## The dark variant — what changed and why

Claude Design was asked twice for a dark chrome and a full-height layout and delivered neither, so the two
were applied by hand with `sed`. Fifteen values and one line:

|                           | light                 | dark            |
| ------------------------- | --------------------- | --------------- |
| root                      | `1440×900` hard-coded | `100% × 100dvh` |
| panels                    | `#f7f3eb`             | `#2b2926`       |
| raised surfaces / buttons | `#fbf9f4`             | `#35322e`       |
| borders                   | `#d8cfbd`             | `#45403a`       |
| primary text              | `#2a261f`             | `#e8e3d8`       |
| secondary text            | `#6a6255`             | `#a49a8c`       |
| accent (sliders)          | brown                 | `#5b93d6`       |

**Two inversions matter more than the palette:**

1. **The active tool and `Check this year` flip to dark-on-light.** They were the only light-on-dark
   elements; on a dark panel they would have vanished into it.
2. **The polity swatches' hairline flips from dark to light** — `rgba(42,38,31,.25)` becomes
   `rgba(255,250,240,.35)`. Without it the palette's darkest slot, slate blue `#54719b`, computes to
   **2.86:1** against `#2b2926`, under the 3:1 floor of WCAG 1.4.11. Same reasoning as the map's own
   border casing: no single ink reads across a palette spanning gold to slate, so the outline has to sit
   at the opposite end of the lightness scale from whatever it surrounds.

Two tag borders were also raised once the background darkened — `#6a6255` and `#9a9080` both fell under
3:1, and became `#8f8578` (3.99:1).

## What was right in the original, and must survive any regeneration

Measured by reading the source, not by eye:

- `aria-label` on **every** icon-only button, `role="toolbar"`, `aria-pressed` on the tools and the layer
  eyes;
- 32×32 zoom controls, 24×24 layer eyes — above the WCAG 2.5.8 AA floor;
- keyboard shortcuts in the tooltips, including the Mac variants (`⌘Z`, `⌘⇧Z`);
- `{Details}` on its own 200px rail, so a 51-entry list can never push it off screen;
- `minmax(0,1fr)` on rows and columns with `min-height:0` on the scrollers — the layout plumbing is
  correct, only the root's fixed size was wrong;
- the status bar carrying the scenarios' real figures — `11°34′E 48°08′N · Holy Roman Empire · empire ·
6.1 km/px`, `51 polities · 16 579 vertices · unclaimed land 55 %`.

## The cursors — [`CURSORS.md`](CURSORS.md)

Ten cursors as SVG and PNG (1× and 2×) in `cursors/`, plus `05 Cursors.dc.html`, a reference sheet
showing each one at 4× with its hot spot marked and a terrain pad to hover. **Final assets — use them as
they are.**

The handoff solved legibility the same way the map solves it: **a white halo under the ink stroke**, so
one cursor reads over terrain, sea and political fills alike. That is the border casing's argument, arrived
at independently.

It left four questions open. Answering them here rather than leaving them to the first person who codes it:

1. **Precedence**, which it inferred and asked to have confirmed — **confirmed as written**: ‹space› held
   (hand) › marquee drag › hover state (first anchor › existing anchor › snap range / handle › stretch) ›
   tool default. ‹space› is a global override, and a gesture in progress outranks a hover.
2. **The Pen with no drawing target** → `not-allowed`. It is standard, understood without a legend, and
   matches what s02 already says the Pen does: refuse, and name the polity to select.
3. **While dragging an anchor or a selection, the cursor does not change** — it keeps whatever it was when
   the press began. Every editor does this, and re-evaluating the hover mid-drag makes the pointer flicker
   across its own handles.
4. **The snapped feature's name** ("Schelde", "coast") cannot live in a cursor image, and the handoff is
   right to say so. It is a canvas label beside the pointer, in screen pixels — which also lets it carry
   the local-language name the rivers actually have.

## Still open on these screens

- The polity list holds **28 entries while the counter says 51**. The list under real load is the thing
  being judged.
- Screens 02, 03 and 04 have not been reworked — they are still light and fixed-size.

## Publication — this folder is currently excluded

`files/resources/` is the folder that must **never** ship: it holds the proprietary Euratlas samples
(163 MB). The gitignore inversion planned in `.claude/next.md` excludes all of it, so **this design would
not be published either** — and it is our own work, on the portfolio's strongest thread.

**Remedy, when the repo goes public**: either add `!files/plans/cartographer/design/` to the ignore
rules, or move this folder under `files/plans/`. The second is cleaner — it is design material, not a
third-party resource.
