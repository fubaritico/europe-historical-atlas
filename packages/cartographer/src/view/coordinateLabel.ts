/**
 * Where the pointer is, written the way a map writes it.
 *
 * `s01` asks for `"2°21′E 48°51′N"` — degrees and minutes, with a hemisphere letter. Two decisions are
 * taken from the atlas rather than re-made, its margin labels having settled them on 2026-09-17:
 *
 * - **never a minus sign.** `-30°` is arithmetic; `30°O` is a place. A reader checking whether Lyon
 *   falls inside a frontier is reading a place.
 * - **the letters are French**, `E`/`O` and `N`/`S`, because the interface is. `O` for *ouest*, which is
 *   the one that differs from English and the one that would be silently wrong if copied.
 *
 * It is written here rather than shared with the atlas's `degreeLabel`: that one rounds to whole degrees
 * for a graduated margin, this one carries minutes for a live readout. Same subject, different jobs —
 * and unifying them would mean one function with a mode, which is how both end up awkward. If a third
 * caller appears, the shared piece moves to `core/geo`.
 */

/** A longitude and a latitude, in degrees, longitude first — as the document stores a point. */
export type LonLat = readonly [number, number]

/**
 * One coordinate as degrees and minutes, with its hemisphere.
 *
 * **The rounding is the whole difficulty.** Taking the whole degrees first and the minutes separately
 * produces `48°60′` at 48.9999, which is not a coordinate — and it happens on a line of latitude, so it
 * is exactly the kind of thing a reader sees once and never trusts again. The value is therefore
 * rounded **to the minute first**, and the degrees are derived from that total.
 * @param degrees - the signed value
 * @param positive - the letter for a positive value (`E` or `N`)
 * @param negative - the letter for a negative one (`O` or `S`)
 * @returns the label, e.g. `48°51′N`
 */
export function degreesAndMinutes(degrees: number, positive: string, negative: string): string {
  const hemisphere = degrees < 0 ? negative : positive
  const totalMinutes = Math.round(Math.abs(degrees) * 60)
  const whole = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  // Two digits, because `48°8′N` reads as a different precision from `48°51′N` and a column of them
  // would not line up.
  return `${String(whole)}°${String(minutes).padStart(2, '0')}′${hemisphere}`
}

/**
 * A position, written for the status bar.
 * @param lonLat - the position in degrees, longitude first
 * @returns the label, e.g. `2°21′E 48°51′N`
 */
export function formatLonLat(lonLat: LonLat): string {
  return `${degreesAndMinutes(lonLat[0], 'E', 'O')} ${degreesAndMinutes(lonLat[1], 'N', 'S')}`
}
