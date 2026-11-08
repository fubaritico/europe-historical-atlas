/**
 * The Cartographer's screen and the map's degrees: its view is Mercator — x linear in longitude, y linear in
 * `ln(tan(π/4 + φ/2))` — so two hovers read in the status bar fix the whole screen.
 */

/**
 * Read a position as the status bar writes it, in French or English: `4°13′O 39°46′N`, `0°39′E 38°50′N`, `1°21′W …`.
 * @param {string} text - the bar's position
 * @returns {[number, number]} longitude and latitude in degrees
 */
export function parseBarPosition(text) {
  const parts = [...text.matchAll(/(\d+)°(\d+)′\s*([NSEOW])/g)]
  if (parts.length !== 2) throw new Error(`not a position of the status bar: ${text}`)
  const value = ([, degrees, minutes, side]) =>
    (Number(degrees) + Number(minutes) / 60) * ('SOW'.includes(side) ? -1 : 1)
  const [first, second] = parts
  return 'NS'.includes(first[3]) ? [value(second), value(first)] : [value(first), value(second)]
}

/**
 * Mercator's vertical coordinate.
 * @param {number} latitude - in degrees
 * @returns {number} `ln(tan(π/4 + φ/2))`
 */
export function mercatorY(latitude) {
  return Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))
}

/**
 * The screen of two hovers.
 * @param {{ x: number, y: number, at: [number, number] }} first - a screen point and the position the bar read there
 * @param {{ x: number, y: number, at: [number, number] }} second - another, far from the first on both axes
 * @returns {(lonLat: readonly [number, number]) => [number, number]} degrees to screen pixels
 */
export function calibrate(first, second) {
  const sx = (second.x - first.x) / (second.at[0] - first.at[0])
  const sy = (second.y - first.y) / (mercatorY(second.at[1]) - mercatorY(first.at[1]))
  if (!Number.isFinite(sx) || !Number.isFinite(sy))
    throw new Error('the two hovers must differ on both axes')
  return ([lon, lat]) => [
    first.x + (lon - first.at[0]) * sx,
    first.y + (mercatorY(lat) - mercatorY(first.at[1])) * sy,
  ]
}
