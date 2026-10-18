import { formatLonLat } from '../view/coordinateLabel'

/**
 * The status bar: the action and its subject on one side, what is under the pointer on the other — both
 * written into the DOM by hand.
 *
 * **Two zones, side by side, never one slot taken in turn** — the dev's call, 2026-10-08: *"je ne vois
 * pas pourquoi l'un prendrait la place de l'autre."* Each has its own node, so neither writer can clear
 * the other's text.
 *
 * **Its own module for two reasons that agree.** Fast Refresh refuses a file that exports both
 * components and other things (`react-refresh/only-export-components`), and `MapArea` had just walked
 * out of the 50-line readability budget. Both pushed the same way.
 */

/**
 * Write where the pointer is, straight into the DOM.
 *
 * **Imperative on purpose, and it is the decision taken for step 4 rather than a shortcut.** A pointer
 * emits a move per device sample; routing that through `useState` would reconcile the whole area at the
 * sampling rate, which is what kills canvas applications (`rules/troubleshooting.md`). The node is
 * written directly, so React never hears about it.
 *
 * Outside the component so it can be read — and so `MapArea` stays inside the readability budget, which
 * it had just left.
 * @param node - the status bar's element, or `null` before it is mounted
 * @param lonLat - the position in degrees, or `null` off the map
 */
export function writePosition(node: HTMLElement | null, lonLat: [number, number] | null): void {
  if (node === null) return
  // Off the map the bar goes quiet rather than holding the last place the pointer was over — a stale
  // coordinate reads exactly like a live one.
  node.textContent = lonLat === null ? '' : formatLonLat(lonLat)
}

/**
 * Write the action sentence — *"Drawing in Reaume de France"* — or clear it.
 *
 * Written only when it changes (the controller compares), so this is not called at the pointer's rate.
 * @param node - the action zone, or `null` before it is mounted
 * @param sentence - the sentence, or `null` when no action has a subject
 */
export function writeAction(node: HTMLElement | null, sentence: string | null): void {
  if (node === null) return
  node.textContent = sentence ?? ''
}

/**
 * A zero-width space, toggled at the end of a result written twice in a row: invisible, meant to be silent,
 * and enough to make the text differ (CARTO-121). Written as an escape — the raw character would read as
 * `''` and an editor could strip it unseen. Whether every screen reader re-reads on it is not measured here:
 * jsdom has no live regions, so the tests assert the text change, and VoiceOver is the dev's check.
 */
export const REPEAT_MARK = '\u200B'

/**
 * Write what a gesture did — *"inserted 412 vertices from the coastline"* — or clear it.
 *
 * Its own zone beside the action, so neither ever takes the other's place (`s02`).
 *
 * **The same message twice is still said twice.** The zone is the bar's one `role="status"`, and a live
 * region whose text does not change may not be read again — the second ‹cmd+↑› on a polity already on top
 * would be silent. So a repeat toggles {@link REPEAT_MARK} at its end: the text changes, the screen does not.
 * Synchronous on purpose — clearing and rewriting after a delay is the usual remedy, and it would bring a
 * timer and a race with the next message.
 * @param node - the result zone, or `null` before it is mounted
 * @param message - the result, or `null` to clear it
 */
export function writeResult(node: HTMLElement | null, message: string | null): void {
  if (node === null) return
  const text = message ?? ''
  node.textContent = text !== '' && node.textContent === text ? text + REPEAT_MARK : text
}

/**
 * Write what is under the pointer — *"Royaume de France – Royaume de Bourgogne · sovereign"* — or clear it.
 *
 * Written only when it changes (the controller compares), never at the pointer's rate.
 * @param node - the feature zone, or `null` before it is mounted
 * @param feature - the sentence, or `null` over nothing
 */
export function writeFeature(node: HTMLElement | null, feature: string | null): void {
  if (node === null) return
  node.textContent = feature ?? ''
}
