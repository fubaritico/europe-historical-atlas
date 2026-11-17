# Request to fubaritico-ds — a button you feel pressing, and a copy you see happen

> From the europe-historical-atlas Cartographer, 2026-11-17 (after CARTO-465, the colour picker's copy and paste of 0.10.0).
> To hand to the design system's Claude. **Priority: medium** — the dev, trying copy and paste for the first time: _"I did
> not feel I was clicking on them; something is missing in what the user feels."_ Nothing is blocked: both buttons work
> (he copied Franconia's colour onto the archbishopric of Cologne).

## What 0.10.0 does today (read in `dist/`, not assumed)

- **The copy and paste buttons** are `ColorPickerActionButton` (`components/ColorPicker/ColorPickerActionButton.js`): an
  `IconButton`, `variant="outline"`, class `ui-color-picker__action`, icons `DocumentDuplicate` / `ClipboardDocument`.
- **A button has a hover state and no pressed state.** `styles.css` has `.ui-button:hover { background-color:
var(--ui-button-bg-hover); color: var(--ui-button-fg-hover) }`, and no `:active` rule anywhere for `.ui-button` or
  `.ui-icon-button`. The `--ui-button-pressed-*` tokens are for `aria-pressed` toggles, not for the press itself. So
  between pointer-down and pointer-up nothing moves: a click is felt only through what it causes.
- **A copy says nothing on screen.** `copy()` writes the hex, then `announce(labels.copied)` into the picker's live
  region — read by a screen reader, invisible to a sighted user. Copying changes nothing else on screen, so a sighted
  user has no sign it happened. A paste shows its result (the colour changes), but a paste that fails
  (`pasteInvalid`, `clipboardFailed`) is also only announced.

## What we ask

1. **A pressed state for every button** (`.ui-button`, so `IconButton` inherits it): an `:active` look between press
   and release — a darker fill, or a slight inset, through a token pair (`--ui-button-bg-active`,
   `--ui-button-fg-active`) so a white-label theme can set it. Every application gains it, not only the picker.
2. **A visible confirmation on copy and paste**, the same sentence the live region already says: for instance the icon
   becoming a check mark for about a second after a copy (and a mark of failure after a refused paste), with the label
   as a tooltip or a short line under the row. The announcement stays as it is.
3. **Nothing on our side is to be broken**: the Cartographer overrides `--ui-button-bg-hover` on secondary buttons and
   uses the icon buttons in its card headers (`editor-chrome.css`); a new token with a default the theme can ignore is
   enough.

## Not yours

The hover fill is faint in the Cartographer because of our own theme (`--hover: #403b35` over `--panel: #2b2926`), not
because of the design system. We will judge it once a pressed state exists.
