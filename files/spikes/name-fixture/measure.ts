/**
 * Measure the names' placement on the nine frozen countries of 1100 (ATLAS-301): for each, the name written in its own
 * land — its size, how much of the country's length it covers, how far it bends — and how many places the country is
 * named in. The numbers the construction is judged by, before and after a change.
 *
 * Run from the repository root: `packages/core/node_modules/.bin/tsx files/spikes/name-fixture/measure.ts`
 */

import { shortNameOf } from '../../../packages/core/src/data/shortName'
import { DEFAULT_NAME_PLACEMENT, placeNames } from '../../../packages/core/src/pipeline/namePlacement'
import { NAME_SHAPES } from '../../../packages/core/src/pipeline/testing/names1100'
import { spaceLength } from '../../../packages/core/src/pipeline/testing/spaceLength'

import type { NameMetrics, PlacedName } from '../../../packages/core/src/pipeline/namePlacement'

/** A letter's advance at a size of one, unspaced; a typical book face. */
const ADVANCE = 0.55

/**
 * Measure a text with one advance per letter.
 * @param text - the text
 * @returns its metrics
 */
function measure(text: string): NameMetrics {
  return { advances: Array.from(text, () => ADVANCE), ascent: 0.72, descent: 0.22 }
}

/**
 * What a placed name looks like: how long its letters run and how far it turns.
 * @param placed - the name
 * @returns its run, in cells, and its turn, in degrees
 */
function shapeOf(placed: PlacedName): { run: number; turn: number } {
  const { glyphs, size } = placed
  let run = size * ADVANCE
  for (let at = 1; at < glyphs.length; at += 1) {
    const [a, b] = [glyphs[at - 1], glyphs[at]]
    if (a !== undefined && b !== undefined) run += Math.hypot(b.x - a.x, b.y - a.y)
  }
  const first = glyphs[0]?.angle ?? 0
  const last = glyphs.at(-1)?.angle ?? 0
  const turn = (Math.abs(Math.atan2(Math.sin(last - first), Math.cos(last - first))) * 180) / Math.PI
  return { run, turn }
}

const rows = [...NAME_SHAPES.values()].map((shape) => {
  const land = Uint8Array.from(shape.owners, (owner) => (owner === 0 ? 1 : 0))
  const length = spaceLength(land, shape.width)
  const placement = placeNames(
    shape.owners,
    shape.width,
    shape.height,
    [{ owner: 0, text: shape.name, shorter: shortNameOf(shape) }],
    measure,
    DEFAULT_NAME_PLACEMENT
  )
  // The country's own land, not a far realm the data gives it: Norway's mainland, under 1100's Greenland.
  const own = shape.id === 'kingdom-of-norway' ? 1 : 0
  const main = placement.placed.find(({ piece }) => piece === own) ?? placement.placed[0]
  if (main === undefined) return { id: shape.id, text: '—', size: 0, cover: 0, turn: 0, named: 0 }
  const { run, turn } = shapeOf(main)
  return {
    id: shape.id,
    text: main.text,
    size: Number(main.size.toFixed(1)),
    cover: Number((run / length).toFixed(2)),
    turn: Math.round(turn),
    named: placement.placed.length,
  }
})
console.table(rows)
