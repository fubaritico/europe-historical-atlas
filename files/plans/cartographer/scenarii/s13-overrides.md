# 13 — Overriding what the tool derived

> [Index](s00-index.md) · **the dev's standing requirement**, stated 2026-09-22 and reiterated 2026-09-27:
> _"je veux pouvoir avoir la main sur les couleurs et les lignes. Je veux pouvoir surcharger."_
>
> Everything the tool derives — a border's hand, its weight, a polity's colour — is a **default**. This file
> is the set of gestures that beat it, the place they are all visible, and the way back.

## The two guarantees

1. **An explicit choice always wins**, over any derived rule, at any moment.
2. **Nothing recomputes it away.** Not a reopen, not a moved anchor, not a change of relation in the
   registry. Going back is a gesture too — [Clear], never something that happens by itself.

The second is the one that has to be bullet proof. A derivation that gets it wrong costs one click; a
recompute that silently restores a derived value over an authored one costs a wrong map nobody looks at
twice. That asymmetry is why the panel below exists.

## Precedence, in full

| what        | strongest              | then                    | weakest                     |
| ----------- | ---------------------- | ----------------------- | --------------------------- |
| **a line**  | a run of anchors       | a pair of polities      | the derived hand and weight |
| **a fill**  | a colour pinned a year | a colour in the registry | the palette by adjacency    |

## Selecting a line — there is nothing to add

> **The dev, 2026-09-27, and it removes a mechanic instead of adding one**: _"quand tu sélectionnes une
> ligne, tu sélectionnes avec une marquise. Même si ça sélectionne les points, ça sélectionne les lignes. Si
> tu veux styler la ligne, tu styles la ligne. Si tu veux déplacer les points, tu déplaces les points."_

```gherkin
Scenario: one marquee, two things to do with it
  Given ⟨edit⟩ is active
  When I marquee 20 anchors of the France–Empire limit
  Then those 20 anchors are selected
  And the 19 segments between them are selected with them
  And the status bar reads "20 anchors · 19 segments · France–Empire"
  When I drag one of them
  Then the points move, and the line follows because it is made of them
  When instead I choose [Pattern ▸ double]
  Then those 19 segments are drawn doubled, and no point has moved
```

> **The gesture decides, not a mode.** A marquee selects anchors; the segments between consecutive selected
> anchors come along, because a segment *is* its two endpoints. Dragging moves points. Reaching for the style
> bar dresses segments. **There is no second selection mechanic and no unit to define** — the selection is
> the unit, which is the question this file previously invented an answer to (a "maximal stretch with the
> same two owners"), now deleted.

```gherkin
Scenario: a marquee that catches two separate borders
  Given my marquee covers anchors of the France–Empire limit and of France's coastline
  Then both runs are selected
  And a style applies to both
  And the status bar names both, so I can see I caught more than I meant to
```

## Overriding a line

```gherkin
Scenario: give a line a pattern and a weight
  Given a stretch is selected
  When I choose [Pattern ▸ double] and [Weight ▸ heavy]
  Then that stretch is drawn doubled and heavy
  And the file records { run: [...], pattern: "double", weight: "heavy" }
  And it appears in {Overrides}
```

```gherkin
Scenario: give a line its own ink
  Given a stretch is selected
  When I pick an ink from the well
  Then that stretch is drawn in that ink, casing included
  And the casing keeps its own contrast rule, so the line still reads over any fill
```

> **The casing is not overridden away.** A border is drawn as a cream core inside a dark brown casing
> precisely because no single ink clears 3:1 against this palette (A11Y-101, `known-issues.md`). An authored
> ink replaces the **core**; the casing follows it to the opposite end of the lightness scale. Otherwise a
> hand-picked ink would be the one way to make a border unreadable, and it would look deliberate.

## Overriding a colour

```gherkin
Scenario: pin a polity's colour for the whole atlas
  Given "Kingdom of France" takes a palette colour
  When I open its card and pick a colour
  Then it is drawn in that colour
  And it keeps it in every year it appears in
  And the registry records the hex on the polity
```

```gherkin
Scenario: pin a colour for one year only
  Given the Kingdom of France is pinned blue in the registry
  And in 1500 that blue sits beside a neighbour it reads badly against
  When I pick a colour with [Only this year] checked
  Then 1500 uses it, and no other year changes
  And the year file records the hex, not the registry
```

> **Why the registry is the normal gesture and the year the exception.** A reader following France across
> twenty-one maps needs it to stay the same colour; a colour that drifts per year makes the atlas unreadable
> as a series. The per-year override exists for the clash the global colour cannot solve, and it is
> deliberately the noisier of the two to reach.

```gherkin
Scenario: a pinned colour that clashes with a neighbour
  Given "Kingdom of France" is pinned a colour close to the Empire's
  When I confirm the pin
  Then it is applied — nothing is refused
  And I am told "close to Holy Roman Empire, which it borders over 96 anchors"
  And the pre-publication check lists it until one of the two changes
```

> **Warned, not forbidden** — [s00](s00-index.md)'s rule. But the reason it must be warned at all is
> measured and already recorded: `assignRegionColors` avoids collisions **among the colours it chooses**, so
> every pin removes one polity from its reach. Pin enough of them and the anti-collision has nothing left to
> work with, and two neighbours come out identical with nothing to explain it.

## Where every override lives

```gherkin
Scenario: see everything I have overridden
  Given I have dressed four lines and pinned three colours
  When I open {Overrides}
  Then I see seven rows, grouped by kind
  And each row shows its target, what it overrides, and the derived value it replaced
  And each row carries [Clear] and [Show me] — which selects it on the canvas
  And the status bar reads "7 overrides"
```

> **This panel is what keeps an override from becoming invisible debt.** A hand set eight months ago, on a
> border whose relation has since changed, is indistinguishable from a derived one on the canvas — that is
> the whole point of the second guarantee, and it is also its cost. The list is where the cost is paid.

## Going back

```gherkin
Scenario: clear one override
  Given a stretch is drawn bold by hand
  When I press [Clear] on it, in the style bar or in {Overrides}
  Then it goes back to the value the rule derives
  And it leaves {Overrides}
  And this is one undo step
```

```gherkin
Scenario: clear every override of one kind
  Given {Overrides} lists four line overrides
  When I press [Clear all lines]
  Then I am asked to confirm, with the count
  And all four go back to their derived values, as one undo step
  And pinned colours are untouched
```

## When an override goes stale

```gherkin
Scenario: the anchors under a styled line are deleted
  Given a stretch of 20 anchors is drawn bold by hand
  When I delete 6 of them
  Then the override keeps the 14 that remain
  And it stays listed
  When I delete all 20
  Then the override is listed as orphaned, and is not dropped
  And [Clear] removes it
```

```gherkin
Scenario: a polity carrying overrides is merged into another
  Given "Spain" and "Spain (Habsburg)" are duplicates, one of them pinned gold
  When I merge them in the registry
  Then I am asked which of the two colours the survivor keeps
  And line overrides naming either of them are carried onto the survivor
  And none is dropped silently
```

> **Nothing silent, in either direction.** An override is a decision the author took; dropping it because
> its target moved would undo that decision without telling anyone, which is the exact failure the second
> guarantee forbids. Orphaned rows are ugly on purpose — an ugly row gets cleared, a missing one does not
> get noticed. The merge case is real: [s07](s07-manage-the-registry.md) exists because the 1700 payload
> carries **two** `Spain` entries.

## Holes

- **H-27 — is a weight an override or a rule?** The depth-derived weight ([s08](s08-vassalage.md)) and an
  authored weight occupy the same field. If an author sets a stretch heavy, then declares a suzerain that
  would lighten it, the authored value wins by the rules above — but the map now shows a first-degree line
  at full weight, which says something false about the hierarchy. Warn, like the colour clash, or let it be?
- **H-28 — does an override survive [Save as] into another year?** [s05](s05-derive-a-year.md) derives 1110
  from 1100 by copying the file. The anchors come along, so a `run` override still resolves — but a border
  hand authored for 1100's politics may be wrong for 1110's, and it will be invisible.
- **H-29 — per-year colour and the registry drifting apart.** Nothing stops a polity being pinned blue in
  the registry and red in nineteen of twenty-one years. The panel shows it; nothing decides whether that is
  a defect.

## Walked for real — France and Burgundy, 2026-10-13 (Claude, in the dev's Chrome)

```gherkin
Scenario: a stretch of the Saône dotted, the rest of the limit untouched
  Given France is aimed at and the white arrow is in hand, at 696 %
  When I marquee part of the Saône
  Then {Line} reads "32 segments · Royaume de France – Royaume de Bourgogne"
  When I choose [Dotted]
  Then that stretch is dotted and the limit north of it stays solid
  And ‹undo› reads "Undo dotted Royaume de France – Royaume de Bourgogne", and restores it
```

```gherkin
Scenario: a stretch over a dressed border, both listed, one cleared
  Given a stretch of the Saône dashed, then [Whole border] and [Double]
  Then {Overrides} lists "dashed · 36 segments · …" then "double · whole border · …"
  And the dashed stretch wins over the double border — a run beats a pair
  When I press [Clear] on the dashed one
  Then only the whole border is listed, and ‹undo› brings the stretch back
```

> **Found while building it, and fixed before it shipped**: a run override dressed **any** derived border
> sharing one anchor with it, so the eleven segments of the first scenario would have restyled the whole
> 61-anchor limit. The derivation now cuts each border where an override begins and ends.
>
> **Not offered yet**: a line's weight and ink — only its pattern. The `[Border hands]` table is a constant in
> `core` (`borderHands.ts`), not yet a panel.
