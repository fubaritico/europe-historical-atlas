import en from './en.json'
import fr from './fr.json'

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A message of {@link CLIPBOARD_MESSAGES}: what copying says (CARTO-345). `name` is a polity's name verbatim, `map`
 * the map's folder name, `paste` the paste shortcut as the system writes it (`core/i18n/shortcuts`), `count` how many.
 *
 * Its messages, and the values they take:
 * - `copiedPolities` — Polities copied: `count`, `name` (of the one, when one), `map`, `paste`.
 * - `copiedPoints` — Points copied: `count` points, `name` of the polity aimed at, `map`, `paste`.
 * - `copiedAlone` — Points selected left out, no neighbour of theirs selected: `count`.
 * - `heldPolities` — Polities on the clipboard as a map opens: `count`, `name`, `map`.
 * - `heldPoints` — Points on the clipboard as a map opens: `name`, `map`.
 * - `nothingSelected` — ‹cmd+C› with nothing to copy.
 * - `pointsAlone` — Points selected, none with a selected neighbour: nothing copied.
 * - `notKept` — The tab's storage refused the copy.
 * - `pasted` — Polities pasted: `polities` how many, `name` (of the one, when one), `map` they came from, `count`
 *   points, `welded` of them.
 * - `pastedSovereign` — A vassal pasted sovereign, its suzerain not in the map: `suzerain`'s name.
 * - `nameTaken` — A polity not pasted, its `name` already in the map.
 * - `homageTooDeep` — A polity not pasted, its `suzerain` seating it too deep: `name`, `suzerain`.
 * - `nothingToPaste` — ‹cmd+V› with an empty clipboard.
 * - `pointsNoTarget` — ‹cmd+V› with points on the clipboard and no polity selected: `paste`, the shortcut.
 * - `pastedPoints` — Points pasted onto a polity: `name`, `count` points, `welded` of them.
 * - `pastedOutlines` — How many whole outlines were added: `count`.
 * - `pastedMerged` — How many pieces were merged into the outline: `count`.
 * - `pastedOpen` — How many pieces were left open, nothing drawn: `count`.
 * - `pieceLeftOut` — A piece ⟨retracer⟩ refused: its `reason`, in its own words.
 * - `nothingPasted` — Every piece left out: `name`.
 * - `followed` — The neighbours whose outline took a piece too: `names`, joined.
 * - `pastePointsStep` — The history's name of a paste of points: `name`.
 * - `selectAllNoTarget` — ‹cmd+A› with no polity selected.
 * - `pasteStep` — The history's name of a paste: `count`, `name` (of the one, when one).
 */
export type ClipboardMessageKey = keyof typeof en

/** {@link ClipboardMessageKey}, in French and English, one JSON each, both bundled. */
export const CLIPBOARD_MESSAGES: Catalogue<ClipboardMessageKey> = { fr, en }
