# 11 — The language button

> [Index](s00-index.md) · **the first scenario of the interface over the map** (ATLAS-329, `../interface-scenarios.md`),
> written 2026-11-02 for Claude Design. **Not built**: today the language follows the browser and nothing chooses it
> ([s10](s10-language-and-accessibility.md); ATLAS-266).
>
> The dev's words: *"you click a button, and rather than a drop-down menu […] the languages would arrive in an animated,
> pleasant way — I want to avoid the slightly stiff thing like a drop-down, but without overdoing it either."* He first saw
> it as a small window of flags floating in 3D; the form below — the button that unfolds, each language written in itself —
> is the one he accepted.

## The button at rest

```gherkin
Scenario: the button shows the language in use
  Given the atlas open
  Then a small button shows the language icon and the current language, « FR »
  And it sits over the map, part of the interface, never part of the sheet
```

> Where on the screen: [s99](s99-holes.md) A-15. The icon: the language icon readers recognise — a globe or « 文A » —
> never a flag (a flag names a country, and in a historical atlas a country of which date).

## Choosing a language

```gherkin
Scenario: the button unfolds
  When I click the language button
  Then the languages slide out of it and settle beside it, in about a quarter of a second
  And each is written in its own language: « Français », « English »
  And the one in use is marked as such

Scenario: I choose another language
  Given the button unfolded
  When I click « English »
  Then the interface's texts change to English at once
  And the options fold back into the button, which now shows « EN »

Scenario: I change my mind
  Given the button unfolded
  When I click anywhere else, or press ‹escape›
  Then the options fold back and nothing changes
```

> **What « the interface's texts » covers**: the words of the interface itself — buttons, panels, notices, the progress
> text. The map's own names do not change with it: the countries' names are the year's data, the cities' their French
> names (s10, A-05). Whether they follow one day is A-05's question, not this button's.

## Remembered

```gherkin
Scenario: the choice is kept
  Given I chose English
  When I come back to the atlas another day
  Then it opens in English, whatever my browser's language

Scenario: no choice made yet
  Given I never touched the button
  Then the atlas follows my browser, as in s10: French if my first language is French, English otherwise
```

> Where the choice is kept, and for how long: A-16.

## Without the animation, and from the keyboard

```gherkin
Scenario: reduced motion
  Given the system's « réduire les animations » on
  When I click the language button
  Then the options appear beside it at once, without sliding

Scenario: from the keyboard
  Given the language button reached by ‹tab›
  When I press ‹enter› or ‹space›
  Then the options unfold and the one in use has the focus
  And the arrows move between them, ‹enter› chooses, ‹escape› folds them back and returns the focus to the button

Scenario: a screen reader
  Given VoiceOver on
  When I reach the language button
  Then it hears a button named « Langue : français », that it opens a list
  And each option by its name, the one in use announced as selected
```

## A third language, and more spectacle later

```gherkin
Scenario: a language is added
  Given a third language translated
  Then it slides out of the button like the others, with no change to the button
```

> The options may one day become small banners waving in 3D, in the map's style — the dev's first idea — with nothing else
> changing: A-17.
