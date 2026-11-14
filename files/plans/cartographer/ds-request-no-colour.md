# Request to fubaritico-ds — a colour field that can say "no colour"

> From the europe-historical-atlas Cartographer, 2026-11-14 (CARTO-445). To hand to the design system's Claude.
> **Priority: normal** — the Cartographer's form waits on it; the atlas side is built.

## What the Cartographer does with `ColorField`

`@fubaritico/react` **0.9.0**, `ColorField` with `nullable`, in the polity form: a polity's colour is either a colour
the author picked, or `null` — **"automatic"**, the map's palette chooses one no neighbour uses. The automatic state is
the picker's own toggle (`ColorPickerAutoToggle`, `toggleAuto()`; leaving it restores the last colour).

## What is new

The dev, 2026-11-14: a polity can be drawn **with no fill at all** — its borders and its name only, the relief bare
under it. It says that its history is not told (too far, no direct dealings with Europe: India, sub-Saharan Africa).
So the field needs a **third state** beside a colour and "automatic": **"no colour"**.

Today the docs of `nullable` and of the toggle call `null` *"automatic / no colour"* — for us those are two different
things, and that wording is the one point to untangle.

## What we ask

1. **A third, explicit state**, offered by a prop (for example `allowNone`), off by default so nothing changes for
   current users. Its value must be distinct from both a colour and `null` (for example the string `'none'`, or a
   tagged value — your call, as long as `onChange` / `onChangeComplete` / `value` carry it and it round-trips).
2. **How the author reaches it**, inside the popover beside the automatic toggle: a second toggle, or the two as one
   three-way choice (*Colour · Automatic · No colour*). Leaving "no colour" restores the last colour, as leaving
   "automatic" does.
3. **The swatch says it**: the trigger's swatch for "no colour" must not look like "automatic" nor like an empty
   default — our proposal, **an empty square with a thin outline** (a diagonal stroke is the other usual mark).
4. **Labels** through `labels`, as the others: an accessible name for the new toggle and a sentence describing the
   state (`describeColor`), in French and English on our side.
5. The hex input: disabled, or empty with a placeholder, while "no colour" is on — your call.

## How we will know

- `<ColorField nullable allowNone value="none" />` shows the "no colour" swatch, and the popover shows that state
  pressed.
- From a colour, choosing "no colour" calls `onChange('none')`; leaving it gives back the last colour; "automatic"
  still gives `null`.
- Without `allowNone`, nothing changes.
- Released as a minor (`0.10.0` or later); we bump our `@fubaritico/*` lines together, then the polity form writes
  `colour: "none"` into the year file — the format already accepts it.
