# 13 — The navigation pad

> [Index](s00-index.md) · **the interface over the map** (ATLAS-329, ATLAS-149), written 2026-11-02 for Claude Design.
> **Not built.** The dev's words: *"a small button to show a navigation pad similar to the one on the side of a keyboard
> […] the middle button would send back to an initial state; the four arrows, the plus, the minus — all of it in a
> nine-key pad"*, shown by a toggle *"above the bar of buttons, which would be at the bottom right."*
>
> Every command sends what the keyboard already sends ([s02](s02-navigate.md)) — the pad adds a way in, never a behaviour.

## The bar, and the toggle

```gherkin
Scenario: the bar of buttons
  Given the atlas open
  Then the interface's buttons sit in one bar at the bottom right of the screen — the language (s11), the help (s12), the
    navigation pad's toggle
  When I click the pad's toggle
  Then the pad appears above the bar
  When I click it again
  Then the pad goes
```

## The pad — nine keys

```
 ┌───┬───┬───┐
 │ + │ ↑ │ − │
 ├───┼───┼───┤
 │ ← │ ⌂ │ → │
 ├───┼───┼───┤
 │ ? │ ↓ │ ? │   ← the two lower corners: contextual, not decided (A-19)
 └───┴───┴───┘
```

```gherkin
Scenario: the arrows move the map as the keyboard's do
  When I press ‹→› on the pad briefly
  Then the map moves a step east
  When I hold it
  Then the map slides east, as when ‹→› is held, and glides a little when I let go

Scenario: plus and minus zoom by one step
  When I press ‹+› on the pad
  Then the map zooms in by one notch, as with the ‹+› key
  And ‹−› zooms out by one

Scenario: the middle key goes back to the start
  Given the map moved and zoomed
  When I press ‹⌂›
  Then the camera flies back to the view the atlas opens on — the whole sheet
  And if a focus was on, it is left
```

> The way back's flight follows the reduced-motion setting like every other (s03): at once when it is on.

## The two lower corners — contextual

```gherkin
Scenario: the corners change with the situation
  Given a situation that offers a move — in a focus, or between places already looked at
  Then a lower corner shows that move, its icon and its name on hover
  And with nothing to offer, the corner stays empty
```

> **Not decided** ([s99](s99-holes.md) A-19). Two leads, the dev's: **« revenir »** when in a focus (‹escape› for who has
> no keyboard), and **going from one zoomed place to the next**. The focus itself is to become a country's focus
> (ATLAS-148) — a large work; the corners wait for it.

## The keyboard and the screen reader

```gherkin
Scenario: from the keyboard
  Given the pad shown
  Then each key is reached by ‹tab›, in reading order, and pressed by ‹enter› or ‹space›

Scenario: a screen reader
  Given VoiceOver on
  Then the toggle is a button « Navigation », announcing whether the pad is shown
  And each key is named by what it does: « Déplacer vers le nord », « Zoomer », « Revenir à la vue de départ »
```
