# The ornament of 17th-century maps — research for the atlas's graphic identity — ATLAS-329

> **Asked by the dev, 2026-11-03**: *"do some research on 17th-century framing and ornament, which you will use. As
> with the Cartographer's interface, you will rework what Claude Design has made. The point is to find a graphic and
> stylistic language, an identity. We will finish it together."* The tone is already his
> (`interface-scenarios.md`, « The tone »): a **camaieu** of the map's hues a little darker than its parchment, **brown
> buttons**, **ornament, clearly**, **light gradients**. This file brings what that ornament is, where it comes from,
> where it can be taken from freely, and a first translation into interface pieces — **my proposals**, for him to judge.
>
> Grades, as the evidence system asks: **found** = read on the page cited, 2026-11-03; **from memory** = mine, to be
> checked before it is relied on.

## 1. What a 17th-century map's ornament is — the vocabulary

| piece | what it is | in the atlas today |
| --- | --- | --- |
| **neatline** / filet d'encadrement | the printed line round the map — often two, a thick and a thin (found: Old World Auctions' glossary) | the two rules of the **bordure graduée** (`scene/sheet/`) |
| **graduated border** / bordure graduée | a band of alternating blocks, one per degree, between two neatlines (from memory; our own frame is built so) | yes — the sheet's frame |
| **cartouche** | an area enclosed by a frame within the map, for the title, the legend, the scale, the imprint or a note (found: Old World Auctions) | none yet |
| **strapwork** / cuirs découpés | ornament imitating curled and interlaced bands of a flat material, leather or sheet metal; **Northern Europe c. 1535–1630** (found: V&A, the Vredeman de Vries print) | none |
| **auricular style** / style auriculaire | soft, lobed, cartilage-like forms, **Northern Europe, first half of the 17th century**, between Northern Mannerism and the Baroque; Johannes Lutma's cartouches (*Veelderhande Niewe Compartemente*, 1650–54) are its type (found: Wikipedia, the Met) | none |
| **carte à figures** | a border of panels — costumed figures, town views — round the map; a 1594 Amsterdam world map is said to be the first with allegorical figures as a border (found: Old World Auctions; Swaen) | none |
| **medallion** / médaillon | an oval or round frame holding a portrait, an emblem or a small map — Speed 1626's navigators (seen on the dev's plate) | none |
| **mascaron** | a sculpted face, often at the foot of a cartouche — Jolivet 1570 (seen on the dev's plate) | none |

## 2. How it changed over the century — what to choose among

1. **Strapwork, the standard until about 1630.** Ortelius's *Theatrum* (1570) set the standard of map decoration for the
   period, strapwork cartouches, galleons and monsters (found: a dealer's note). Hondius's Asia (1606) and Blaeu's maps
   keep strapwork title cartouches, Blaeu's with floral elements and reclining nereids (found: Geographicus, Swaen).
   **Its pattern books**: Hans Vredeman de Vries, *Strapwork Cartouches with Grotesques*, c. 1555–70, published by
   Hieronymus Cock — plates at the Met and the Rijksmuseum (found).
2. **The Amsterdam cartouche, asymmetrical.** Jodocus Hondius Jr. introduced the typical Amsterdam cartouche of the
   Golden Age: interlaced strapwork replaced by an asymmetrical, Mannerist cartouche with Baroque motifs (found: Swaen,
   *The Hondius–Willem Blaeu sale of 1629*). Blaeu bought his plates in 1629.
3. **The auricular**, c. 1620–1660 (found: Wikipedia, the Met's essay *Extravagant Monstrosities*). Whether Blaeu or
   Janssonius used it on their cartouches is **not confirmed** by what I read — a question for a plate in hand.
4. **The French late century** — Sanson, then Jaillot (*Atlas Nouveau*, 1692): title cartouches crowded with gods,
   figures and animals, an allegory of the sea on Jaillot's Brittany (1696) (found: dealers' descriptions). The
   ornament prints of the Louis XIV style are Jean Le Pautre's and Jean Bérain's, carried to the Netherlands by Daniel
   Marot (found: Sotheby's on Marot; their own ornament on maps not checked).

**My proposal, for the dev**: the **strapwork and the Amsterdam cartouche** (1 and 2) as the atlas's language — flat,
drawable as clean vector shapes, legible at a small size, and the decoration of the first half of the 17th century,
when the map trade's look was fixed in Amsterdam. The auricular is richer and softer, but its lobes read as blur at the
size of a button; the French late century is figures, which we would have to draw. **His call.**

## 3. Colour — what the plates were painted with

- **Transparent washes**, like watercolour, similar colours layered for depth; borders and territories coloured
  systematically, early 17th-century borders in bold colours; cartouches boldly coloured (found: Osher Map Library,
  *Coloring printed maps by hand*; Swaen, *Map coloring*).
- **Verdigris** (copper green) is the period's green, and it browns and eats the paper with time — the brown halos of
  old greens are verdigris (found: the Vienna study on copper-green pigments in 17th-century atlases).
- Gamboge, often named for map yellow, is **not confirmed** for the 17th century by what I read (one study lists it as
  newly introduced in the late 1700s) — I would not cite it as a period colour.
- **What it gives the interface** (my proposal): the camaieu's darker tones taken from the plates' own browns and
  ochres; one accent from the bold borders — a **red lead / vermilion** red as the Speed plate's double rule shows; the
  **verdigris green** kept for a quiet second accent, browned as the plates are. Light gradients read as wash, not as
  gloss: one hue deepening, never two hues blended.

## 4. Lettering

- **Titles in spaced roman capitals** (Speed's *A New and Accvrat Map of the World*, Jolivet's *Galliae Regni…*), place
  names in italic — the atlas already writes its title this way.
- **A revival under a free licence**: the **IM Fell Types** (Igino Marini), from the punches the Oxford University Press
  held under Bishop Fell, 17th–18th century — listed under the SIL Open Font License by Fontsource and Google Fonts
  (found). An older note quotes the author as asking for attribution: **check the licence in the font files** before
  shipping. **EB Garamond** (OFL, from memory) is the other candidate.

## 5. A first translation into interface pieces — my proposals

| interface piece | the period's piece | how |
| --- | --- | --- |
| a button | a small strapwork label | brown leather — a light gradient from a warm dark brown, a thin lighter inner rule (the neatline), the label in spaced capitals; no strapwork curls at this size |
| a panel, a card | a cartouche | the double neatline for its edge; strapwork scrolls at two corners only, drawn once as SVG; its title in a band |
| the century selector | the year on a cartouche (Kings and Generals), the title band (Speed) | a scroll or a framed plate holding the century, the others reached through it |
| the progress bar of the loading screen | the graduated border | the same blocks as the sheet's frame, filling one by one — the loading and the map speak one language |
| the loading screen's tip | Jolivet's strapwork cartouche | the help's gesture of the moment, framed; a mascaron at its foot is the one figure we might draw |
| a tooltip | a small label cartouche | a single neatline, parchment ground — the one light piece among the darker ones |
| a separator | a rule with a fleuron | a hairline broken by a small ornament at its middle |
| a medallion | Speed's ovals, Kings and Generals' portraits | the event's actors, later — not in this round |

**What the ornament must not do**: sit inside a control where it competes with the label; cover the map more than the
scenarios ask; be raster — every ornament drawn as SVG, so it stays sharp at every size and takes the camaieu's tokens.

## 6. Where to take it from — sources and their rights

| source | what | rights | grade |
| --- | --- | --- | --- |
| Rijksmuseum, Vredeman de Vries' cartouches (RP-P-1888-A-12469 and others) | strapwork cartouches, grotesques, mascarons, c. 1555–60 | public domain mark on Europeana's record of a Rijksmuseum copy; the museum's own statement not read | found / to check |
| The Met, *Strapwork Cartouches with Grotesques* (344229, 628932) | the same series, plates | the Met's Open Access is CC0 for public-domain works | from memory — check the record |
| Lutma, *Veelderhande Niewe Compartemente*, 1650–54 | auricular cartouches | public-domain work; the scan's terms depend on the museum | found (the work) |
| John Speed, *A New and Accurat Map of the World*, 1626 (`original.webp`, the dev's) | frame, title band, medallions | public-domain work; the file's own origin to name | found (seen) |
| Jean Jolivet, *Galliae Regni*, 1570 (the dev's file, from MeisterDrucke) | strapwork cartouche, mascaron, graduated border | public-domain work; **MeisterDrucke is a reseller of reproductions** — take the plate from the BnF or a museum instead | found / to replace |
| Gallica (BnF) | Sanson, Jaillot, Jolivet plates | reuse **free for non-commercial use**, citing « Source gallica.bnf.fr / BnF »; commercial use under licence | found |
| David Rumsey Map Collection | Blaeu's *Atlas Maior* and thousands of plates | the scans are **CC BY-NC-SA 3.0** — a reference to look at, not a source to trace or ship | found |

**The rule this repository already holds** (`interface-scenarios.md`, « The pictures »): a picture under copyright never
enters the public repository; a public-domain plate may, with its source, through `/create-data-mention`. The
ornaments we draw are ours — drawn from the period's forms, never traced from a scan whose terms forbid it.

## 7. What comes next

1. The dev looks at Claude Design's first draft, made with the brief (`~/Desktop/atlas-interface-brief.md`).
2. I rework it with this file — the pieces of § 5 — as the Cartographer's chrome was reworked.
3. We finish the identity together: the period chosen (§ 2), the accent colours (§ 3), the typeface (§ 4).

## Sources read

- Auricular style — https://en.wikipedia.org/wiki/Auricular_style
- The Met, *Extravagant Monstrosities: Gold- and Silversmith Designs in the Auricular Style* —
  https://www.metmuseum.org/essays/extravagant-monstrosities-gold-and-silversmith-designs-in-the-auricular-style
- The Met, after Vredeman de Vries, *Strapwork Cartouches with Grotesques* — https://www.metmuseum.org/art/collection/search/344229
- V&A, Vredeman de Vries print (strapwork, 1535–1630) — https://collections.vam.ac.uk/item/O656408/print-vredeman-de-vries/
- Rijksmuseum, *Cartouche omgeven door grotesken* — https://rijksmuseum.nl/en/collection/RP-P-1888-A-12469
- Europeana, Rijksmuseum cartouches — https://www.europeana.eu/en/item/90402/RP_P_OB_6278
- Swaen, *The Hondius – Willem Blaeu sale of 1629* — https://www.swaen.com/atlases/hondius-blaeu-sale-1629
- Geographicus, Blaeu's Iceland, 1659 — https://www.geographicus.com/P/AntiqueMap/iceland-blaeu-1659
- Old World Auctions, illustrated map glossary — https://www.oldworldauctions.com/static/docs/illustrated-map-glossary-2025-08-11.pdf
- Swaen, *carte à figures* — https://www.swaen.com/carte-a-figures-map.php
- Osher Map Library, *Coloring printed maps by hand* — https://exhibits.oshermaps.org/pageant-of-spectacles/mapping/coloring-by-hand/
- Swaen, *Map coloring* — https://www.swaen.com/articles-about-maps/map-coloring
- Copper-green pigments in 17th-century atlases (Vienna) — https://iris.uniupo.it/handle/11579/25990
- Fontsource, IM Fell English (OFL-1.1) — https://fontsource.org/fonts/im-fell-english/about
- Stanford, *Atlas Maior* record (CC BY-NC-SA 3.0) — https://purl.stanford.edu/ck224ny8258
