# 10 — Language and accessibility

> [Index](s00-index.md) · **mostly no plan**: the language's rule is the dev's (2026-10-21, `plan.md` P8), the rest
> accumulated from reviews — `rules/known-issues/atlas.md` keeps an A11Y backlog that waits for the HTML overlay. The atlas
> is **a WebGL canvas with almost no DOM**: a splash, a progress panel, the notices. What a screen reader can reach is
> those three, and nothing of the map.
>
> **Built**: the language with ATLAS-159 (the progress text and the notices, French and English), « réduire les
> animations » in September with the navigation, the roles with the splash and the notices. **Walked**: the French by the
> dev every day; the English, the reduced motion and the screen reader never by him — read from the code and the tests.
> The code: `core/i18n/locale.ts`, `atlas/src/i18n/`, `utils/motion.ts`, `ui/`.

## The language

```gherkin
Scenario: a French reader
  Given a browser whose first language is French — fr, fr-FR, fr-CA
  When I open the atlas
  Then the progress text and the notices are in French
```

```gherkin
Scenario: any other reader
  Given a browser whose first language is not French — English, German, Spanish…
  When I open the atlas
  Then the progress text and the notices are in English
```

> **French when the first preferred language is French, English otherwise** (the dev, 21/10) — the first only: a reader
> who prefers German then French gets English. No setting chooses it yet (ATLAS-266, Idées).

```gherkin
Scenario: what is not translated
  Given any reader
  Then the splash and the sheet's title are in English: « EUROPE », « HISTORICAL ATLAS »
  And the degrees' letters and the compass rose's winds are French: « 30°O », « NO »
  And the cities' names are their French names: « Mayence », « Constantinople »
  And the countries' names are as entered in the Cartographer, in English: « Kingdom of France »
```

> **Four languages of decision, not one** — [s99](s99-holes.md) A-05 (and A-03 for the cities). The countries' names are
> the year's data, entered in English (`years/1100/registry.json`); the CMS carries an English name for each place and
> event, empty today.

## « Réduire les animations »

```gherkin
Scenario: what the setting changes
  Given the system's « réduire les animations » on
  When I open the atlas and use it
  Then the splash goes with no fade, the bar jumps rather than glides, the year comes in at once (s01)
  And the map stops the instant my input does, with no glide (s02)
  And a flight arrives at once, with no arc (s03)
```

```gherkin
Scenario: what the setting does not change
  Given the same
  Then a change of level still fades over 0.6 s (s04), a city's name still fades in and out of reach (s06)
  And the swords still sway and the trebuchet still throws (s07)
```

> **Read once, when the atlas opens** (`utils/motion.prefersReducedMotion`): switched on later, it takes a reload.
> [s99](s99-holes.md) A-02; ATLAS-300 for the icons.

## The keyboard

```gherkin
Scenario: the map is driven by the keyboard
  Given the atlas open
  Then the arrows pan, ‹+› ‹-› ‹page up› ‹page down› zoom, ‹escape› leaves a focus (s02, s03)
  But nothing enters the focus from the keyboard
  And a degraded notice's « Fermer » is reached by ‹tab›
```

> **The keys are bound on the whole window** and the map has no focus of its own — to scope to a focusable canvas when the
> HTML overlay lands (A11Y backlog). **No keyboard way into the focus** (A11Y-301, ATLAS-163), left open by decision.

## The screen reader

```gherkin
Scenario: what a screen reader hears
  Given VoiceOver on
  When I open the atlas
  Then it hears the splash as a status, named by its title, the silhouette hidden
  And the progress panel as a status, the bar as a progress bar with its value
  And a blocking notice at once, as an alert; a degraded one between tasks, as a status, its close button named « Fermer »
  But the map itself has no role and no name: nothing of the countries, the cities or the events reaches it
```

> **The canvas is a bare WebGL surface** — no accessible name, no keyboard-reachable list of what it shows. That list is
> the remedy, at the HTML overlay (`rules/known-issues/atlas.md`, A11Y backlog (b)). Not walked with a screen reader.

## The contrast

- **The borders** clear 3:1 against every fill by their casing (A11Y-101) — computed, not measured on screen.
- **The countries' names close up** are about 1.7:1 under their watermark — the dev's choice (A11Y-001).
- **The coastal contrast** drops to ~2.7:1 with the relief's layer at default strength (A11Y-005) — an aesthetic call.

## The dev panel

```gherkin
Scenario: the panel exists under pnpm dev only
  Given the atlas served by pnpm dev
  Then a panel « europe-map · dev » and a frame-rate counter can be shown
  But on the published site neither exists
```
