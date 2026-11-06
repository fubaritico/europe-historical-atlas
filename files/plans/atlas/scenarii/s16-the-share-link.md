# 16 — The share link

> [Index](s00-index.md) · **the interface over the map** (ATLAS-329), written 2026-11-06. **Not built** (ATLAS-138). The
> dev's call: a **share** icon in the button bar, designed by us, not asked of Claude Design.
>
> **What the code does today** (read 2026-11-06): the view — the ground target and the zoom, nothing else — is kept in the
> tab's `sessionStorage`, in production too ([s02](s02-navigate.md), `controls/mapCameraStore.ts`, `app/viewport.ts:186`):
> it survives a reload and dies with the tab. **The year is kept nowhere**, nor the focus, and **nothing is written in the
> address**. This scenario is what changes that.

## The button

```gherkin
Scenario: sharing what I see
  Given the atlas open on 1100, zoomed on the kingdom of France
  When I click the share button in the bar at the bottom right, beside the snapshot (s14)
  Then the address of this exact map is copied to the clipboard
  And a short message says so beside the button: « Lien copié »
  And the map on screen does not move
```

## What the address holds

```gherkin
Scenario: the address reopens the same map
  Given an address copied from the share button
  When someone opens it, in another browser, on another machine
  Then the atlas opens on the same year, at the same place and the same zoom
  And with the same country in focus, if one was

Scenario: the address follows the map
  When I move, zoom, change the year or enter a focus
  Then the address in the browser's bar follows, without filling the browser's history with every move
  And a reload reopens what the address says — the address wins over the view kept in the tab
```

> The address holds the year, the view and the country in focus, never more. Its form — readable (`?year=1100&…`) or
> compact — is [s99](s99-holes.md) A-22.

## An address that cannot be read

```gherkin
Scenario: a damaged address
  Given an address whose year, view or country cannot be read
  When I open it
  Then an error dialog says the link could not be read entirely, and what was kept
  And the atlas opens on what could be read — the default for the rest
  And the console keeps the error
```

> **The dev's rule of 2026-11-06**: an error reaches the screen in a dialog, and the console keeps it
> (`.claude/rules/error-handling.md`, « An error reaches the screen »). Same case as a saved view that cannot be read
> (ATLAS-328).

```gherkin
Scenario: a year the atlas does not have
  Given an address naming 1450, a year with no map
  When I open it
  Then the error dialog says the atlas has no map for 1450
  And the atlas opens on its default year, the view kept
```

## The keyboard and the screen reader

```gherkin
Scenario: from the keyboard and a screen reader
  Given the share button reached by ‹tab›
  When I press ‹enter›
  Then the address is copied
  And a screen reader hears « Lien de la carte copié »

Scenario: reduced motion
  Given the system's « réduire les animations » on
  Then « Lien copié » appears and goes without a fade
```

> **The icon** is ours, drawn with the other buttons of the bar (s13), not asked of Claude Design (the dev, 06/11). On a
> phone, the system's own share sheet instead of the clipboard: [s99](s99-holes.md) A-23.
