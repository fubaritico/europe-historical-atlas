import { afterEach, describe, expect, it, vi } from 'vitest'

import { createLandMask } from '../data/landMask'
import { latitudeToVertical, longitudeToHorizontal } from '../geo/mercator'

import { exactBordersOf, pairKey } from './atlasBorders'
import { addAnchor, addPolity, closeRing } from './documentEdits'
import { createYearDocument, saveYearDocument } from './yearDocument'

import type { YearDocument } from './yearDocument'
import type { LandMask } from '../data/landMask'
import type { AuthoredYear, YearPolity } from '../data/yearFormat'

const bbox = { west: -50, south: -20, east: 150, north: 80 }
const SHORE = 'Shore (CC0)'
const sources = [
  { id: 0, name: 'reported by eye', licence: 'fact' },
  { id: 1, name: 'Shore', licence: 'CC0' },
]

function polity(id: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

function anchors(doc: YearDocument, points: [number, number][], source = 0): number[] {
  return points.map((point) => addAnchor(doc, point, source))
}

/** A mask over {@link bbox} answering the same everywhere. */
function uniformMask(land: boolean, source = SHORE): LandMask {
  return createLandMask({ width: 64, height: 64, scale: 1, bbox, source }, () => land)
}

function authored(doc: YearDocument): AuthoredYear {
  return { year: doc.year, ...saveYearDocument(doc) }
}

/** Two squares side by side sharing their middle edge, anchors 1 and 2. */
function sideBySide(suzerain: string | null = null): YearDocument {
  const doc = createYearDocument(1100, sources)
  anchors(doc, [
    [0, 10],
    [10, 10],
    [10, 0],
    [0, 0],
    [20, 10],
    [20, 0],
  ])
  addPolity(doc, polity('france'))
  addPolity(doc, polity('hre', suzerain))
  closeRing(doc, 'france', [0, 1, 2, 3])
  closeRing(doc, 'hre', [1, 4, 5, 2])
  return doc
}

/** One square standing alone, its anchors recorded under `source`. */
function alone(source = 0): YearDocument {
  const doc = createYearDocument(1100, sources)
  anchors(
    doc,
    [
      [0, 10],
      [10, 10],
      [10, 0],
      [0, 0],
    ],
    source
  )
  addPolity(doc, polity('france'))
  closeRing(doc, 'france', [0, 1, 2, 3])
  return doc
}

function uv([lon, lat]: [number, number]): { u: number; v: number } {
  return { u: longitudeToHorizontal(lon, bbox), v: latitudeToVertical(lat, bbox) }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exactBordersOf', () => {
  describe('happy path', () => {
    it('draws the limit two sovereigns share through its anchors, solid', () => {
      const { borders, patterns } = exactBordersOf(authored(sideBySide()), bbox, uniformMask(false))

      expect(borders.between).toEqual([{ pair: [0, 0], lines: [[uv([10, 10]), uv([10, 0])]] }])
      expect(borders.frontier).toEqual([])
      expect(patterns.get('0:0')).toBe('solid')
    })
  })

  describe('variants', () => {
    it('draws a vassal’s limit with its lord dashed — the dotted hand, until the atlas has a dot', () => {
      const { patterns } = exactBordersOf(authored(sideBySide('france')), bbox, uniformMask(false))

      expect(patterns.get('0:0')).toBe('dashed')
    })

    // The dev, 2026-10-18: « on ne peut pas considérer une tribu comme un état » — the kingdom's frontier.
    it('draws the border between a tribe and a kingdom as the kingdom’s frontier, never a cased border', () => {
      const doc = sideBySide()
      const hre = doc.polities.find((each) => each.id === 'hre')
      if (hre) hre.rank = 'tribe'

      const { borders } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(borders.between).toEqual([])
      // The kingdom on the west, on the frontier's left, north up: the run heads north.
      expect(borders.frontier).toEqual([[uv([10, 0]), uv([10, 10])]])
    })

    // So the atlas can lay a line beside a frontier on the unclaimed side (29/10).
    it('runs a frontier with its polity on the left, north up, whichever side the polity is on', () => {
      const doc = sideBySide()
      const france = doc.polities.find((each) => each.id === 'france')
      if (france) france.rank = 'tribe'

      const { borders } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      // The kingdom on the east now: the run heads south.
      expect(borders.frontier).toEqual([[uv([10, 10]), uv([10, 0])]])
    })

    it('draws no border between two tribes side by side — only their fading colour', () => {
      const doc = sideBySide()
      for (const polity of doc.polities) polity.rank = 'tribe'

      const { borders } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(borders.between).toEqual([])
    })

    it('draws no line along a tribe’s edge against unclaimed ground', () => {
      const doc = sideBySide()
      for (const polity of doc.polities) polity.rank = 'tribe'

      const { borders } = exactBordersOf(authored(doc), bbox, uniformMask(true))

      expect(borders.frontier).toEqual([])
    })

    it('dresses a stretch in its run override', () => {
      const doc = sideBySide()
      doc.runs.push({ run: [1, 2], hand: 'double', source: null, note: null })

      const { patterns } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(patterns.get('0:0')).toBe('double')
    })

    it('dresses a pair in its pair override', () => {
      const doc = sideBySide()
      doc.pairs.push({
        between: ['hre', 'france'],
        type: 'contested',
        hand: 'dashed',
        source: null,
        note: null,
      })

      const { patterns } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(patterns.get('0:0')).toBe('dashed')
    })

    it('draws a polity against unclaimed land as a frontier, not a cased border', () => {
      const { borders, patterns } = exactBordersOf(authored(alone()), bbox, uniformMask(true))

      expect(borders.between).toEqual([])
      expect(borders.frontier.length).toBeGreaterThan(0)
      expect(patterns.size).toBe(0)
    })

    it('draws nothing along anchors taken from the mask’s own coast, even where the mask reads land', () => {
      const { borders } = exactBordersOf(authored(alone(1)), bbox, uniformMask(true))

      expect(borders).toEqual({ between: [], frontier: [] })
    })

    it('files every cased group under a pair of its own', () => {
      const doc = sideBySide()
      anchors(doc, [
        [30, 10],
        [30, 0],
      ])
      addPolity(doc, polity('hungary'))
      closeRing(doc, 'hungary', [4, 6, 7, 5])

      const { borders, patterns } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(borders.between.map((group) => group.pair)).toEqual([
        [0, 0],
        [1, 1],
      ])
      expect([...patterns.keys()]).toEqual(['0:0', '1:1'])
    })

    it('files a border between two sovereigns at split level 0', () => {
      const { levels } = exactBordersOf(authored(sideBySide()), bbox, uniformMask(false))

      expect(levels.get('0:0')).toBe(0)
    })

    it('files a vassal’s limit with its lord at split level 1', () => {
      const { levels } = exactBordersOf(authored(sideBySide('france')), bbox, uniformMask(false))

      expect(levels.get('0:0')).toBe(1)
    })

    it('files two vassals of different lords at split level 0', () => {
      const doc = sideBySide()
      addPolity(doc, polity('aquitaine'))
      addPolity(doc, polity('poland'))
      const france = doc.polities.find((each) => each.id === 'france')
      const hre = doc.polities.find((each) => each.id === 'hre')
      if (france) france.suzerain = 'aquitaine'
      if (hre) hre.suzerain = 'poland'

      const { levels } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(levels.get('0:0')).toBe(0)
    })

    // ARCH-001: the tribe layer wears the tribe's own colour at every zoom, so nothing hides its borders —
    // they are frontiers, which every zoom shows, and the vassal hand does not apply across a tribe.
    it('draws a tribe vassal of a kingdom against its lord and its fellow vassal as their frontiers', () => {
      const doc = sideBySide('france')
      const hre = doc.polities.find((each) => each.id === 'hre')
      if (hre) hre.rank = 'tribe'
      anchors(doc, [
        [30, 10],
        [30, 0],
      ])
      addPolity(doc, polity('hungary', 'france'))
      closeRing(doc, 'hungary', [4, 6, 7, 5])

      const { borders, levels } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(borders.between).toEqual([])
      expect(levels.size).toBe(0)
      expect(borders.frontier).toHaveLength(2)
    })

    it('reads the split level from the homage it is handed', () => {
      const splitLevel = vi.fn(() => 3)
      const { levels } = exactBordersOf(
        authored(sideBySide()),
        bbox,
        uniformMask(false),
        () => undefined,
        { chainOf: () => [], ancestorAt: (id) => id, splitLevel, deepest: 3 }
      )

      expect(levels.get('0:0')).toBe(3)
      expect(splitLevel).toHaveBeenCalledWith('hre', 'france')
    })

    it('files no level for the frontier, which is shown at every zoom', () => {
      const { levels } = exactBordersOf(authored(alone()), bbox, uniformMask(true))

      expect(levels.size).toBe(0)
    })
  })

  describe('managed errors', () => {
    // The atlas's degraded mode when the mask failed: the raster derivation draws no frontier either.
    it('reads every unclaimed far side as sea without a land mask, so draws no frontier', () => {
      const { borders } = exactBordersOf(authored(alone()), bbox, null)

      expect(borders).toEqual({ between: [], frontier: [] })
    })

    // The elevation threshold's source names no licence: no anchor can have been recorded under it.
    it('lets the mask alone decide when its source names no licence', () => {
      const { borders } = exactBordersOf(
        authored(alone(1)),
        bbox,
        uniformMask(true, 'derived from elevation above sea level')
      )

      expect(borders.frontier.length).toBeGreaterThan(0)
    })
  })

  describe('declared gaps', () => {
    // The dev, 2026-10-15: co-vassals take the same stroke as a vassal against its lord — dashed in the
    // atlas, like that one, until it has a dot.
    it('draws a limit between two vassals of one lord in the vassal’s stroke', () => {
      const doc = sideBySide('lord')
      addPolity(doc, polity('lord'))
      doc.polities.forEach((each) => {
        if (each.id === 'france') each.suzerain = 'lord'
      })

      const { patterns } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(patterns.get('0:0')).toBe('dashed')
    })

    it('draws a dressed frontier in the frontier stroke, and says so once', () => {
      const warn = vi.fn()
      const doc = alone()
      doc.runs.push({ run: [0, 1, 2, 3, 0], hand: 'double', source: null, note: null })

      const { borders, patterns } = exactBordersOf(authored(doc), bbox, uniformMask(true), warn)

      expect(borders.frontier.length).toBeGreaterThan(0)
      expect(patterns.size).toBe(0)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('frontier'))
    })

    it('says nothing when no frontier was dressed', () => {
      const warn = vi.fn()

      exactBordersOf(authored(alone()), bbox, uniformMask(true), warn)

      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('draws a hand naming no pattern by its relation’s rule, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const doc = sideBySide()
      doc.runs.push({ run: [1, 2], hand: 'zigzag', source: null, note: null })

      const { patterns } = exactBordersOf(authored(doc), bbox, uniformMask(false))

      expect(patterns.get('0:0')).toBe('solid')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"zigzag"'))
    })
  })

  describe('edge cases', () => {
    it('draws nothing for a year with no claim', () => {
      const doc = createYearDocument(1100, sources)

      expect(exactBordersOf(authored(doc), bbox, uniformMask(true))).toEqual({
        borders: { between: [], frontier: [] },
        patterns: new Map(),
        levels: new Map(),
      })
    })

    it('projects against the frame it is given, not the mask’s', () => {
      const other = { west: -10, south: -10, east: 40, north: 40 }

      const { borders } = exactBordersOf(authored(sideBySide()), other, uniformMask(false))

      expect(borders.between[0]?.lines[0]?.[0]).toEqual({
        u: longitudeToHorizontal(10, other),
        v: latitudeToVertical(10, other),
      })
    })
  })
})

describe('pairKey', () => {
  it('joins the two indices with a colon', () => {
    expect(pairKey([3, 7])).toBe('3:7')
  })
})
