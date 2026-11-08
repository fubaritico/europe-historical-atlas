import { join, resolve } from 'node:path'

import { parseBarPosition } from './screen.mjs'

/**
 * What the command lines say, read and checked — pure functions, so the only input validation of the scripts is
 * tested. A value that cannot be read throws with the option and the text: a measure run on a misread box hides cities
 * without a word.
 */

/** The year folders, relative to a checkout. */
export const YEARS_DIR = 'packages/atlas/public/years'

/**
 * Read a list of numbers written with commas, every field filled and finite.
 * @param {string} text - the value
 * @param {number} count - how many numbers are wanted
 * @param {string} what - the option, for the error
 * @returns {number[]} the numbers
 */
export function parseNumbers(text, count, what) {
  const fields = text.split(',')
  const numbers = fields.map((field) => (field.trim() === '' ? Number.NaN : Number(field)))
  if (fields.length !== count || !numbers.every(Number.isFinite)) {
    throw new Error(`${what} wants ${count} numbers separated by commas: ${text}`)
  }
  return numbers
}

/**
 * Read a box written `west,south,east,north`.
 * @param {string | undefined} text - the option's value
 * @returns {[number, number, number, number] | undefined} the box, or none when the option is absent
 */
export function parseBox(text) {
  if (text === undefined) return undefined
  const [west, south, east, north] = parseNumbers(text, 4, '--box')
  // No box here crosses the antimeridian: Europe lies between 45° W and 80° E.
  if (west >= east || south >= north)
    throw new Error(`--box wants west < east and south < north: ${text}`)
  return [west, south, east, north]
}

/**
 * Read a hover written `x,y,<the status bar's position>`.
 * @param {string} text - the option's value
 * @returns {{ x: number, y: number, at: [number, number] }} the hover
 */
export function parseHover(text) {
  const [x, y, ...rest] = text.split(',')
  const [px, py] = parseNumbers(`${x},${y}`, 2, 'a hover')
  return { x: px, y: py, at: parseBarPosition(rest.join(',')) }
}

/**
 * The year folder named on a command line.
 * @param {string} map - a folder name of `years/` (`1100`) or a path (anything with a `/`)
 * @param {string} root - the checkout the names are read in
 * @returns {string} the folder's path
 */
export function yearFolder(map, root) {
  return map.includes('/') ? resolve(map) : join(root, YEARS_DIR, map)
}

/**
 * A position as the measures print it — three decimals, about 100 m, the precision a plan and `screen.mjs` take back.
 * @param {readonly [number, number]} point - longitude and latitude
 * @returns {string} `lon,lat`
 */
export function formatLonLat(point) {
  return `${point[0].toFixed(3)},${point[1].toFixed(3)}`
}
