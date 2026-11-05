import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link CLIPBOARD_MESSAGES}: what copying says (CARTO-345). `name` is a polity's name verbatim, `map`
 * the map's folder name, `paste` the paste shortcut as the system writes it (`core/i18n/shortcuts`), `count` how many.
 *
 * Its messages, and the values they take:
 * - `copiedPolities` — Polities copied: `count`, `name` (of the one, when one), `map`, `paste`.
 * - `copiedStretch` — A stretch copied: `name` of its polity, `count` points, `map`, `paste`.
 * - `heldPolities` — Polities on the clipboard as a map opens: `count`, `name`, `map`.
 * - `heldStretch` — A stretch on the clipboard as a map opens: `name`, `map`.
 * - `nothingSelected` — ‹cmd+C› with nothing to copy.
 * - `notARun` — Anchors selected that are not one run of a ring.
 * - `notKept` — The tab's storage refused the copy.
 * - `pasted` — Polities pasted: `polities` how many, `name` (of the one, when one), `map` they came from, `count`
 *   points, `welded` of them.
 * - `pastedSovereign` — A vassal pasted sovereign, its suzerain not in the map: `suzerain`'s name.
 * - `nameTaken` — A polity not pasted, its `name` already in the map.
 * - `homageTooDeep` — A polity not pasted, its `suzerain` seating it too deep: `name`, `suzerain`.
 * - `nothingToPaste` — ‹cmd+V› with an empty clipboard.
 * - `stretchNoTarget` — ‹cmd+V› with a stretch on the clipboard and no polity selected: `paste`, the shortcut.
 * - `pastedOutline` — A whole outline pasted onto a polity: `name`, `count` points, `welded` of them.
 * - `pastedStretch` — A part of an outline merged into a polity's: `name`, `count` points.
 * - `stretchFollowed` — The neighbours whose outline took the stretch too: `names`, joined.
 * - `stretchNoOutline` — A part of an outline onto a polity with nothing drawn: `name`.
 * - `stretchTooFar` — An end too far from the polity's outline: `km`, `name`.
 * - `stretchSameEnd` — Both ends on one point of the outline: `name`.
 * - `stretchRefused` — ⟨retracer⟩ refused the merge: its `reason`, in its own words.
 * - `pasteStretchStep` — The history's name of a stretch's paste: `name`.
 * - `pasteStep` — The history's name of a paste: `count`, `name` (of the one, when one).
 */
export type ClipboardMessageKey = keyof typeof en

/** {@link ClipboardMessageKey}, in French and English, one JSON each, both bundled. */
export const CLIPBOARD_MESSAGES: Catalogue<ClipboardMessageKey> = { fr, en }
