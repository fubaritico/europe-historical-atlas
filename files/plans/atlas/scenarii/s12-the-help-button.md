# 12 — The help button

> [Index](s00-index.md) · **the interface over the map** (ATLAS-329, ATLAS-135), written 2026-11-02 for Claude Design.
> **Not built.** The dev's words: *"a question-mark help button, which will be both a recap of how you navigate […] and
> maybe a walkthrough explaining that there will be icons, that when you come closer you see the vassals — a little
> sequence like that, a little slideshow, quickly done, without pretension. In a modal."* And: *"the very first time we
> could show it by default"*; *"don't forget really all the gestures […] show the keys that are equivalent."*
>
> Every gesture below is the one built and written in [s02](s02-navigate.md) and [s03](s03-click-and-focus.md) — the help
> promises nothing the map does not do. The dev has navigation bugs to report; when they are fixed, this page follows.

## The button

```gherkin
Scenario: the help button
  Given the atlas open
  Then a « ? » button sits over the map, among the interface's buttons
  When I click it
  Then a window opens, centred horizontally and vertically, over the dimmed map
  And it has two parts: « Naviguer » and « Découvrir l'atlas »
```

> Where among the buttons: [s99](s99-holes.md) A-15, the same question as the language button.

## The very first visit

```gherkin
Scenario: the walkthrough opens by itself, once
  Given I open the atlas for the first time
  When the map has come in
  Then the window opens by itself on « Découvrir l'atlas », centred
  And I can go through it, or close it at once with « Passer »

Scenario: it does not come back
  Given I have seen or skipped it
  When I open the atlas again
  Then nothing opens by itself
  And the walkthrough is still there, behind the « ? »
```

> Opened after the map has come in, never over the splash — the reader must see what it talks about. How « seen » is kept:
> [s99](s99-holes.md) A-18.

## « Naviguer » — every gesture, with its key

```gherkin
Scenario: the recap of the gestures
  When I open « Naviguer »
  Then I see each way to move the map, the mouse's and the keyboard's side by side, the keys drawn as keys:

    | to …                         | with the mouse or the trackpad                          | with the keyboard           |
    | move across the map          | press the button and drag — the map follows, and glides | ‹←› ‹→› ‹↑› ‹↓›, held       |
    |                              | on when released                                        |                             |
    | move by the window's edges   | rest the pointer against an edge; in a corner, both ways | —                           |
    | zoom in, zoom out            | the wheel, or two fingers on the trackpad — by steps    | ‹+› ‹−›, or ‹page up› ‹page down› |
    | recentre on a place          | a click on it                                           | —                           |
    | look closely at a place      | a double-click on it — the focus                         | —                           |
    | leave the close look         | —                                                       | ‹échap›                     |
    | zoom the page itself         | the wheel with ‹ctrl› held                              | —                           |

  And a line says what the zoom shows as it closes in: the vassals, then the cities
```

> **Two gestures have no key today**, and the page says so rather than hide it: entering the focus (A11Y-301, ATLAS-163,
> left open by decision) and recentring. **The keys act only when no field is being typed in** (s02).

## « Découvrir l'atlas » — the walkthrough

```gherkin
Scenario: a short slideshow
  When I open « Découvrir l'atlas »
  Then I see one picture and one or two sentences at a time, four or five in all, with « Précédent », « Suivant », « Passer »
  And a row of dots tells me where I am
  And the last one ends with « Commencer », which closes the window

Scenario: what it shows, in order
  Then the slides say, in the reader's language:
    | 1 | the map in relief: one year of Europe's history, here 1100                                   |
    | 2 | zoom in: the vassals come in, then the cities, while the countries' names fade               |
    | 3 | the events: a flat icon from afar, a small figure in 3D close up — crossed swords for a battle |
    | 4 | a double-click on a place to look at it closely; ‹échap› to come back                        |
    | 5 | the « ? » to find all of this again                                                          |
```

> The pictures: captures of the atlas itself, taken when it is built, never drawn for the occasion. Nothing not built yet
> is shown — not the choice of the century, not the uncertainty's marks; a slide is added when its feature ships.

## Closing it, the keyboard, the screen reader

```gherkin
Scenario: closing the window
  When I click « Fermer », or outside the window, or press ‹escape›
  Then the window closes and the map is as I left it

Scenario: from the keyboard
  Given the window open
  Then the focus is inside it, and ‹tab› stays inside it
  And ‹←› ‹→› turn the slides in « Découvrir l'atlas »
  And when it closes the focus goes back to the « ? »

Scenario: a screen reader
  Given VoiceOver on
  When the window opens
  Then it hears a dialog named « Aide », then the part shown
  And each slide's sentences, and its position, « 2 sur 5 »
  And the recap's table as a table, each gesture with its keys

Scenario: reduced motion
  Given the system's « réduire les animations » on
  Then the window appears and the slides change with no movement
```
