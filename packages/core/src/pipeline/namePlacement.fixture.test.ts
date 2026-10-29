import { describe, expect, it } from 'vitest'

import { untitledName } from '../data/shortName'

import { MAX_BEND } from './nameLine'
import { DEFAULT_NAME_PLACEMENT, REALM_RING, placeNames } from './namePlacement'
import { ownerRealms } from './nameRealm'
import { nameShape } from './testing/names1100'
import { spaceLength } from './testing/spaceLength'

import type { MeasureName, NamePlacementOptions, PlacedName } from './namePlacement'
import type { NameShape } from './testing/names1100'

/** A book face's letters at a size of one: a fixed advance, the ascent and descent of a mixed-case face. */
const ADVANCE = 0.55

const measure: MeasureName = (text) => ({
  advances: Array.from(text, () => ADVANCE),
  ascent: 0.72,
  descent: 0.22,
})

/** The construction as the atlas starts from it. */
const OPTIONS: NamePlacementOptions = DEFAULT_NAME_PLACEMENT

/**
 * Each country's short name, as the atlas writes it for a polity with no short name entered (`data/shortName`, the
 * formal name without its title), frozen here so a change of the rule cannot move the fixture's input unseen: a test
 * below holds the two together.
 */
const SHORT: Readonly<Record<string, string>> = {
  'empire-of-the-romans': 'Byzantine Empire',
  cumans: 'Cumans',
  'kingdom-of-the-franks': 'France',
  'kingdom-of-norway': 'Norway',
  'kingdom-of-hungary': 'Hungary',
  'duchy-of-brittany': 'Brittany',
  'roman-empire': 'Holy Roman Empire',
  'kingdom-of-england': 'England',
  'republic-of-novgorod': 'Novgorod',
}

/**
 * A frozen country's names, placed as the atlas places them.
 * @param shape - the country
 * @returns the names written for it
 */
function namesOf(shape: NameShape): readonly PlacedName[] {
  return placeNames(
    shape.owners,
    shape.width,
    shape.height,
    [{ owner: 0, text: shape.name, shorter: SHORT[shape.id] ?? shape.name }],
    measure,
    OPTIONS
  ).placed
}

/**
 * The length of the realm a name is written in, along its main axis.
 * @param shape - the country
 * @param piece - the realm
 * @returns its length, in cells
 */
function realmLength(shape: NameShape, piece: number): number {
  const realm = ownerRealms(shape.owners, shape.width, shape.height, {
    ...OPTIONS,
    ring: REALM_RING,
  }).get(0)?.[piece]
  return realm === undefined ? Number.NaN : spaceLength(realm.mask, realm.width)
}

/**
 * How far a name's letters run, from the first's left side to the last's right side, along their places.
 * @param name - the name
 * @returns the run, in cells
 */
function runOf(name: PlacedName): number {
  let run = name.size * ADVANCE
  for (let at = 1; at < name.glyphs.length; at += 1) {
    const [a, b] = [name.glyphs[at - 1], name.glyphs[at]]
    if (a !== undefined && b !== undefined) run += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return run
}

/**
 * Whether a name's letters keep to one line: no step between two letters longer than the widest spacing allows.
 * @param name - the name
 * @returns whether it is one line
 */
function oneLine(name: PlacedName): boolean {
  const widest = (ADVANCE + OPTIONS.trackingMost) * name.size + 1e-6
  return name.glyphs.every((glyph, at) => {
    const next = name.glyphs[at + 1]
    return next === undefined || Math.hypot(next.x - glyph.x, next.y - glyph.y) <= widest
  })
}

/**
 * How far a name turns from its first letter to its last, in radians.
 * @param name - the name
 * @returns the turn
 */
function turnOf(name: PlacedName): number {
  const first = name.glyphs[0]?.angle ?? 0
  const last = name.glyphs.at(-1)?.angle ?? 0
  return Math.abs(Math.atan2(Math.sin(last - first), Math.cos(last - first)))
}

/**
 * How far a name slants from the horizontal, from its first letter to its last, in radians.
 * @param name - the name, if written
 * @returns the slant, from nought to a right angle; `NaN` for no name
 */
function slantOf(name: PlacedName | undefined): number {
  const [first, last] = [name?.glyphs[0], name?.glyphs.at(-1)]
  if (first === undefined || last === undefined) return Number.NaN
  return Math.abs(Math.atan2(last.y - first.y, last.x - first.x))
}

/**
 * The countries, the realm each is judged in — its land, not a far realm the data gives it (Norway's Greenland) — and the
 * least share of that realm's length its name covers: three fifths, but a half for Byzantium, whose arc Rum, an enclave
 * in Anatolia, cuts (the name keeps off it since 29/10).
 */
const COUNTRIES = [
  ['empire-of-the-romans', 0, 0.5],
  ['cumans', 0, 0.6],
  ['kingdom-of-the-franks', 0, 0.6],
  ['kingdom-of-norway', 1, 0.6],
  ['kingdom-of-hungary', 0, 0.6],
  ['duchy-of-brittany', 0, 0.6],
  ['roman-empire', 0, 0.6],
  ['kingdom-of-england', 0, 0.6],
  ['republic-of-novgorod', 0, 0.6],
] as const

const size = (id: string): number =>
  namesOf(nameShape(id)).find(({ piece }) => piece === 0)?.size ?? 0

// « The gap to the reference » (`files/plans/atlas/country-names.md`, 29/10): nine countries of 1100 frozen, so every
// change of the construction is measured on the same shapes — what kept the work from going round in circles.
describe('the names of nine countries of 1100', () => {
  describe.each(COUNTRIES)('%s', (id, piece, least) => {
    const shape = nameShape(id)
    const names = namesOf(shape)
    const name = names.find((placed) => placed.piece === piece)

    it('is written in its own land', () => {
      expect(name).toBeDefined()
    })

    it('keeps to one line', () => {
      expect(name !== undefined && oneLine(name)).toBe(true)
    })

    it('covers its least share of its realm’s length', () => {
      expect(
        name === undefined ? 0 : runOf(name) / realmLength(shape, piece)
      ).toBeGreaterThanOrEqual(least)
    })

    it('bends no more than a line may', () => {
      expect(name === undefined ? Infinity : turnOf(name)).toBeLessThanOrEqual(MAX_BEND + 1e-6)
    })
  })

  it('freezes the short names the title rule gives today', () => {
    const shapes = COUNTRIES.map(([id]) => nameShape(id))
    expect(shapes.map(({ id }) => SHORT[id])).toEqual(shapes.map(({ name }) => untitledName(name)))
  })

  // Axis C: Byzantium named once across the Aegean, where the grid saw five pieces; Norway on its three large realms,
  // not on its 55 islets.
  it('names Byzantium once, across its seas', () => {
    expect(namesOf(nameShape('empire-of-the-romans'))).toHaveLength(1)
  })

  it('names Norway on its mainland, Iceland and Greenland only, none of its islets', () => {
    expect(namesOf(nameShape('kingdom-of-norway'))).toHaveLength(3)
  })

  // The dev, 29/10, afternoon: three compact countries written straight across and small — on a diagonal now.
  it.each(['roman-empire', 'kingdom-of-england', 'republic-of-novgorod'])(
    'writes %s on a diagonal, neither straight across nor standing',
    (id) => {
      const slant = slantOf(namesOf(nameShape(id)).find(({ piece }) => piece === 0))
      expect([slant >= Math.PI / 6, slant <= Math.PI / 4 + 0.05]).toEqual([true, true])
    }
  )

  // Axis B: the height follows the thickness — the wide steppe's name stands taller than the small duchy's.
  it('writes a thicker country’s name taller', () => {
    expect(size('cumans')).toBeGreaterThan(size('duchy-of-brittany'))
  })
})
