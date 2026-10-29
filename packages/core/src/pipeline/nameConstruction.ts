/**
 * How a name is set in its realm (ATLAS-301, « The gap to the reference », axes A, B, D, 29/10): **one construction, no
 * competition** — the reference maps write every realm's name the same way, and so does this.
 *
 * 1. **The line**: the gentle arc along the realm's length (`nameArc`) — for a compact realm, whose length is unsteady,
 *    its axis held to {@link COMPACT_SLANT} (the dev, 29/10: *« au moins sur un arc […] ou sur un arc mais en
 *    diagonale »*, against the horizontal it was written on). **Cut where it enters a neighbour or a name already
 *    written**, the longest stretch kept: a line crossing an enclave (Rum in Byzantium) or a neighbour (Pomerania's
 *    arc over the Liutizians) holds the name on its own ground. One line, never two.
 * 2. **The height** comes from the realm's thickness: a share of its median width across the line, over the middle of
 *    the land it crosses.
 * 3. **The length** comes from the spacing of the letters, stretched so the name covers a share of the line — the
 *    height and the length are two things, as on the reference maps, where the size was bound to the line's thinnest
 *    crossing and a short name sat small in a long country.
 * 4. **The fit** is a rule, not a score: the letters keep off the neighbours and the names already written; the sea is
 *    open to them. A name that does not fit is set smaller until it does, or is not written. **A realm is never refused
 *    for being thin**: its name starts at the smallest size at least, over the sea if need be — Venice, a string of
 *    Dalmatian islets 1.3 cells thick, was named nowhere (the dev, 29/10, 16:36).
 *
 * Its settings are shares and sizes ({@link ConstructionOptions}: the height's share, the cover, the most spacing, the
 * smallest and largest sizes); there is no weight to tune, so nothing moves elsewhere when one
 * country is looked at — the side effects of the seven weights it replaces (`files/plans/atlas/country-names.md`).
 */

import { readAt } from '../utils/math'

import { axisArc, spaceAspect } from './nameArc'
import { fits, lineLength, roomAcross } from './nameFit'

import type { Fitting, NameExtent } from './nameFit'
import type { NameLine } from './nameLine'

/** What shapes a name, beside the sizes. */
export interface ConstructionOptions {
  /** The letters' height, as a share of the realm's thickness across the line. */
  readonly heightShare: number
  /** The share of the line the name covers, its letters spaced out to reach it. */
  readonly cover: number
  /** The most the letters are spaced, in ems: a short name in a long realm stops there. */
  readonly trackingMost: number
  /** The smallest size worth writing, in cells. */
  readonly minSize: number
  /** The largest size written, in cells. */
  readonly maxSize: number
}

/** A name set in its realm. */
export interface Construction {
  /** The line it is written along, in the realm's crop. */
  readonly line: NameLine
  /** Its size, in cells. */
  readonly size: number
  /** The spacing added after each letter but the last, in ems. */
  readonly tracking: number
}

/** A name's measure as the construction reads it. */
export interface ConstructedName extends NameExtent {
  /** How many letters it has, spaces included: each gap between two takes the spacing. */
  readonly letters: number
}

/** Under this aspect, a realm is compact: its main axis is unsteady, and its name's slant is held to {@link COMPACT_SLANT}. */
export const COMPACT_ASPECT = 1.4

/**
 * The most a compact realm's axis slants from the horizontal, in radians — 45°: a diagonal, never standing. The arc
 * follows the realm's spine from that axis, so the name may end up a little steeper. Claude's choice, 29/10, to judge on
 * the map.
 */
export const COMPACT_SLANT = Math.PI / 4

/** The middle of the land a line crosses that its thickness is read over, as a share of that land's points. */
const THICKNESS_SPAN = 0.6

/** The most of the line a long name covers before its letters are made smaller. */
const COVER_MOST = 0.9

/** How much smaller a name is set each time it does not fit. */
const SHRINK = 0.92

/** Never read through a coast: a margin so low the land's edge never bounds a letter — only neighbours and names do. */
const SEA_OPEN = -Infinity

/**
 * The longest stretch of a line whose points all keep clear of the neighbours and of the names already written.
 * @param line - the line
 * @param room - the room across it at each point, `-1` where the point is not clear (`roomAcross`)
 * @returns the stretch, its lengths walked from its own start; fewer than two points when no two in a row are clear
 */
function clearStretch(line: NameLine, room: Float32Array): NameLine {
  let [best, bestEnd] = [0, 0]
  let start = 0
  for (let at = 0; at <= room.length; at += 1) {
    if (at < room.length && readAt(room, at) >= 0) continue
    if (at - start > bestEnd - best) [best, bestEnd] = [start, at]
    start = at + 1
  }
  const origin = readAt(line.lengths, best)
  return {
    points: line.points.slice(best, bestEnd),
    lengths: line.lengths.slice(best, bestEnd).map((walked) => walked - origin),
  }
}

/**
 * The line a realm's name is written along.
 * @param fitting - the realm and its distances, its neighbours and the names already written
 * @returns the arc along it — its axis held to {@link COMPACT_SLANT} when compact — cut to its longest stretch clear
 *   of the neighbours and the names; `null` for a realm that gives none
 */
export function nameLineOf(fitting: Fitting): NameLine | null {
  const { space } = fitting
  const arc =
    spaceAspect(space.mask, space.width) < COMPACT_ASPECT
      ? axisArc(space.mask, space.width, COMPACT_SLANT)
      : axisArc(space.mask, space.width)
  if (arc === null) return null
  const clear = clearStretch(arc, roomAcross(fitting, arc, SEA_OPEN, 0))
  return clear.points.length < 2 ? null : clear
}

/**
 * A realm's thickness along a line: twice the median room across it, read over the middle of the land the line crosses
 * — the line's points on land, in order, their ends set aside, where the realm thins to its coasts. The middle of the
 * land, not of the line: Denmark's line runs from Jutland over Funen and the Belts to Zealand, and the line's middle,
 * on the islands, read a thickness of 3 cells for a land 11 to 16 thick (the dev, 29/10: *« le nom du pays est tout
 * petit »*). Measured on all of 1100: Denmark 1.9 → 5.4, no other name moved more than a tenth.
 * @param fitting - the realm and its distances
 * @param line - the line
 * @returns the thickness, in cells; `0` when the line crosses no land
 */
export function thicknessAlong(fitting: Fitting, line: NameLine): number {
  const { width, height } = fitting.space
  const room = roomAcross(fitting, line, 0, Math.max(width, height))
  const onLand = Array.from(room).filter((across) => across >= 0)
  const ends = Math.floor((onLand.length * (1 - THICKNESS_SPAN)) / 2)
  const rooms = onLand.slice(ends, onLand.length - ends)
  if (rooms.length === 0) return 0
  rooms.sort((a, b) => a - b)
  return 2 * readAt(rooms, Math.floor(rooms.length / 2))
}

/**
 * The spacing that brings a name to cover its share of a line.
 * @param name - the name's measure, at a size of one
 * @param size - its size, in cells
 * @param target - the length to cover, in cells
 * @param most - the most spacing allowed, in ems
 * @returns the spacing, in ems, between nought and `most`
 */
function trackingFor(name: ConstructedName, size: number, target: number, most: number): number {
  if (name.letters < 2) return 0
  const spare = target - name.length * size
  return Math.min(most, Math.max(0, spare / (size * (name.letters - 1))))
}

/**
 * Set a name in its realm.
 * @param fitting - the realm and its distances, its neighbours and the names already written
 * @param name - the name's measure, at a size of one
 * @param options - the height's share, the cover, the most spacing and the sizes
 * @returns the line, the size and the spacing; `null` when the realm gives no line, no thickness, or the name fits
 *   nowhere at the smallest size
 */
export function constructName(
  fitting: Fitting,
  name: ConstructedName,
  options: ConstructionOptions
): Construction | null {
  const arc = nameLineOf(fitting)
  if (arc === null) return null
  const thickness = thicknessAlong(fitting, arc)
  const total = lineLength(arc)
  // The height from the thickness, the smallest size at least; smaller only when the name, unspaced, would outrun the
  // line — and then not written under the smallest size.
  let size = Math.min(
    options.maxSize,
    Math.max(options.minSize, (options.heightShare * thickness) / name.height),
    (COVER_MOST * total) / name.length
  )
  if (!(size >= options.minSize)) return null
  // Walked a cell past the tallest half-height tried: the room is kept in 32 bits, so a walk stopped exactly at the
  // half-height would read a hair under it and refuse a name that fits.
  const room = roomAcross(fitting, arc, SEA_OPEN, (name.height * size) / 2 + 1)
  while (size >= options.minSize) {
    const tracking = trackingFor(name, size, options.cover * total, options.trackingMost)
    const spaced = { length: name.length + tracking * (name.letters - 1), height: name.height }
    if (fits(fitting, arc, room, spaced, size, SEA_OPEN)) return { line: arc, size, tracking }
    size *= SHRINK
  }
  return null
}
