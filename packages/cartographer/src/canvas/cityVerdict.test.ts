import { describe, expect, it } from 'vitest'

import { addAnchor, closeRing } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { byChain, bySovereignLevel, cityAlert, cityVerdicts, paintedHolder } from './cityVerdict'

import type { CityVerdictKind, MapPolities } from './cityVerdict'
import type { CityMark } from '../state/citiesSlice'
import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'

const in1100 = {
  kind: 'instant',
  at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
} as const

/**
 * The two-polity fixture with a duchy drawn inside France, over 0.5–1.5° E, 46.5–47.5° N, painted after it.
 * @returns the document
 */
function withDuchy() {
  const document = sharedBorderDocument()
  const first = document.anchors.length
  for (const point of [
    [0.5, 47.5],
    [1.5, 47.5],
    [1.5, 46.5],
    [0.5, 46.5],
  ] as [number, number][])
    addAnchor(document, point, 0)
  document.polities.push({
    id: 'duchy',
    name: 'Duché',
    rank: 'duchy',
    status: 'country',
    suzerain: 'fr-couronne',
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: 'Q1',
  })
  closeRing(document, 'duchy', [first, first + 1, first + 2, first + 3])
  return document
}

/**
 * The duchy drawn with no Wikidata id, tied to the CMS's territory 42 — the Thuringia of 1100 (CARTO-450).
 * @returns the document
 */
function thuringia() {
  const document = withDuchy()
  const duchy = document.polities.find((polity) => polity.id === 'duchy')
  if (duchy !== undefined) {
    duchy.wikidata = null
    duchy.territory = 42
  }
  return document
}

/**
 * A chain through a territory of the CMS only.
 * @param territory - its number
 * @returns the chain
 */
const chain = (territory: number): ContentChainReading[] => [
  { titles: [{ name: 'Louis — Thuringe', wikidata: null, territory }], end: 'unknown' },
]

const CITY: CityMark = {
  id: 'c',
  name: 'C',
  lon: 1,
  lat: 47,
  date: in1100,
  holder: null,
  chain: null,
  holderSources: [],
}

// CARTO-193: the polity under a city is the one painted last, as on the canvas.
describe('cityVerdicts', () => {
  describe('happy path', () => {
    it('gives a city inside a duchy drawn over France to the duchy, painted last', () => {
      expect(cityVerdicts(withDuchy(), [CITY]).get('c')?.onMap).toEqual({
        id: 'duchy',
        name: 'Duché',
        wikidata: 'Q1',
      })
    })
  })

  // CARTO-450, the dev's rule of 2026-11-16: no Wikidata id on the map, the CMS's territory number
  describe('a polity tied to its CMS territory', () => {
    it('agrees with a city whose chain goes through the territory the polity under it is tied to', () => {
      const verdict = cityVerdicts(thuringia(), [{ ...CITY, chain: chain(42) }]).get('c')
      expect(verdict?.kind).toBe('agrees')
      expect(verdict?.onMap).toEqual({ id: 'duchy', name: 'Duché', wikidata: null, territory: 42 })
    })

    // Review QUAL-001: the holder entered as text has no territory, so a sheet with no title is compared by Wikidata alone
    it('cannot compare a sheet with no title whose holder has no Wikidata id, even over a tied polity', () => {
      const city = { ...CITY, holder: { name: 'Thuringe', wikidata: null } }
      expect(cityVerdicts(thuringia(), [city]).get('c')?.kind).toBe('cannotCompare')
    })

    it('finds incomplete a city whose chain names another territory', () => {
      expect(cityVerdicts(thuringia(), [{ ...CITY, chain: chain(43) }]).get('c')?.kind).toBe(
        'incomplete'
      )
    })
  })

  describe('variants', () => {
    it('agrees with sources naming the duchy by its id', () => {
      const verdict = cityVerdicts(withDuchy(), [
        { ...CITY, holder: { name: 'Duchy', wikidata: 'Q1' } },
      ])
      expect(verdict.get('c')?.kind).toBe('agrees')
    })

    // CARTO-435: a city with its chain is judged by it — before its holder, entered or not.
    it('judges a city by its chain when it has one, and hands the chain on with the verdict', () => {
      const chain = [{ titles: [{ name: 'Duc', wikidata: 'Q1' }], end: 'unknown' as const }]
      const agrees = cityVerdicts(withDuchy(), [{ ...CITY, chain }]).get('c')
      expect([agrees?.kind, agrees?.chain]).toEqual(['agrees', chain])
      const elsewhere = [{ titles: [{ name: 'Comte', wikidata: 'Q9' }], end: 'sovereign' as const }]
      const wrong = cityVerdicts(withDuchy(), [
        { ...CITY, holder: { name: 'Duchy', wikidata: 'Q1' }, chain: elsewhere },
      ]).get('c')
      // A chain ending on its own holder as sovereign: the map has not drawn that sovereign — to declare
      expect(wrong?.kind).toBe('toDeclare')
    })
  })

  // L3, L4: N/A — rings and a point.

  describe('edge cases', () => {
    it('gives a city of France outside the duchy to France', () => {
      expect(cityVerdicts(withDuchy(), [{ ...CITY, lon: 0.2 }]).get('c')?.onMap?.name).toBe(
        'Reaume de France'
      )
    })
  })
})

// CARTO-389, the dev, 2026-11-08: the point says which cities need a source (red) or the map to change (yellow).
describe('cityAlert', () => {
  describe('happy path', () => {
    it('raises « missing » for a city nobody has entered a holder for', () => {
      expect(cityAlert('notEntered')).toBe('missing')
    })
  })

  describe('variants', () => {
    it('raises « toCorrect » for a city on the wrong side, « missing » for a holder the map lacks', () => {
      expect([cityAlert('misplaced'), cityAlert('toDeclare')]).toEqual(['toCorrect', 'missing'])
    })

    it('raises nothing for a city where all is well', () => {
      expect(cityAlert('agrees')).toBeNull()
    })
  })

  // L3–L4: N/A — a total mapping of a closed union.

  describe('edge cases', () => {
    // The dev's rule of 2026-11-16: yellow not at the right place, red a problem in the data, plain at the right place.
    it('rings yellow a chain that stops short, red a polity with no Wikidata id — never plain', () => {
      expect([cityAlert('incomplete'), cityAlert('cannotCompare'), cityAlert('agrees')]).toEqual([
        'toCorrect',
        'missing',
        null,
      ])
    })
  })
})

// CARTO-435, the dev's rule of 2026-11-15: if the polity drawn under the city is not in its chain, it is wrong.
describe('byChain', () => {
  const MAINZ = { name: 'Ruthard — archevêché de Mayence', wikidata: 'Q1' }
  const EMPIRE = { name: 'Henri IV — Saint-Empire', wikidata: 'Q12548' }
  const ERFURT: ContentChainReading[] = [{ titles: [MAINZ, EMPIRE], end: 'sovereign' }]

  describe('happy path', () => {
    it('agrees with Erfurt in Mainz, which its chain goes through', () => {
      expect(byChain(ERFURT, { id: 'p', name: 'Mainz', wikidata: 'Q1' })).toBe('agrees')
    })
  })

  describe('variants', () => {
    it('agrees where any reading goes through the polity — the sources diverging', () => {
      const two: ContentChainReading[] = [
        ...ERFURT,
        { titles: [{ name: 'Thuringia', wikidata: 'Q2' }], end: 'sovereign' },
      ]
      expect(byChain(two, { id: 'p', name: 'Thuringia', wikidata: 'Q2' })).toBe('agrees')
    })

    it('says incomplete, not wrong, where the chain stops for want of a link', () => {
      const short: ContentChainReading[] = [{ titles: [MAINZ], end: 'unknown' }]
      expect(byChain(short, { id: 'p', name: 'Thuringia', wikidata: 'Q2' })).toBe('incomplete')
    })
  })

  describe('managed errors', () => {
    it('finds Erfurt wrong in Thuringia, though Thuringia answers to the Empire too', () => {
      expect(byChain(ERFURT, { id: 'p', name: 'Thuringia', wikidata: 'Q2' })).toBe('misplaced')
    })

    it('finds a city wrong over ground nobody claims', () => {
      expect(byChain(ERFURT, null)).toBe('misplaced')
    })
  })

  describe('unmanaged errors', () => {
    it('cannot look for a polity with no Wikidata id — never agrees by default', () => {
      expect(byChain(ERFURT, { id: 'p', name: 'Thuringia', wikidata: null })).toBe('cannotCompare')
    })
  })

  describe('edge cases', () => {
    it('finds wrong a chain whose links contradict one another, the polity not in it', () => {
      const loop: ContentChainReading[] = [{ titles: [MAINZ, EMPIRE, MAINZ], end: 'loop' }]
      expect(byChain(loop, { id: 'p', name: 'Thuringia', wikidata: 'Q2' })).toBe('misplaced')
    })
  })
})

// CARTO-450, the dev's rule of 2026-11-16: no Wikidata id, the CMS's territory number
describe('byChain — by the CMS territory, where Wikidata has no id', () => {
  const THURINGIA = { name: 'Louis — Thuringe', wikidata: null, territory: 42 }
  const EMPIRE = { name: 'Henri IV — Saint-Empire', wikidata: 'Q12548' }
  const UNDER: ContentChainReading[] = [{ titles: [THURINGIA, EMPIRE], end: 'sovereign' }]

  it('agrees with a city in the Thuringia drawn with territory 42, its chain through territory 42', () => {
    expect(
      byChain(UNDER, { id: 'thuringia', name: 'Thuringia', wikidata: null, territory: 42 })
    ).toBe('agrees')
  })

  it('finds wrong a polity tied to another territory', () => {
    expect(byChain(UNDER, { id: 'meissen', name: 'Meissen', wikidata: null, territory: 43 })).toBe(
      'misplaced'
    )
  })
})

/**
 * A city's verdict over the Kingdom of France drawn, with no holder by the sources.
 * @param kind - the verdict
 * @param chain - its chain
 * @returns the verdict
 */
function verdict(kind: CityVerdictKind, chain: ContentChainReading[] | null) {
  return {
    onMap: { id: 'fr', name: 'Kingdom of France', wikidata: 'Q70972' },
    bySources: null,
    kind,
    chain,
    expected: null,
    expectedOnMap: null,
  }
}

// The dev, 2026-11-16: *"well placed, it has the colour of the country it is in"* — in France, the points blue.
describe('paintedHolder', () => {
  const FRANCE = { name: 'Philippe Ier — royaume de France', wikidata: 'Q70972' }
  const BOURGES = { name: 'Eudes Arpin — vicomté de Bourges', wikidata: 'Q999' }
  const PONTHIEU = { name: 'Guy Ier — comté de Ponthieu', wikidata: 'Q60930' }
  const drawn = map(['Q70972', 'Q12548'])

  describe('happy path', () => {
    it('paints a city at the right place in the colour of the polity under it — its chain naming no colour', () => {
      const chain: ContentChainReading[] = [{ titles: [BOURGES, FRANCE], end: 'unknown' }]
      expect(paintedHolder(verdict('agrees', chain), drawn)).toBe('fr')
    })
  })

  describe('variants', () => {
    it('paints a misplaced city in the first title of its chain the map has drawn', () => {
      const chain: ContentChainReading[] = [{ titles: [BOURGES, FRANCE], end: 'unknown' }]
      const under = {
        ...verdict('misplaced', chain),
        onMap: { id: 'vermandois', name: 'Vermandois', wikidata: 'Q2' },
      }
      expect(paintedHolder(under, drawn)).toBe('polity-Q70972')
    })

    it("paints a city without a chain in the sources' holder, as before", () => {
      const city = {
        ...verdict('misplaced', null),
        bySources: { name: 'Empire', wikidata: 'Q12548' },
      }
      expect(paintedHolder(city, drawn)).toBe('polity-Q12548')
    })
  })

  describe('edge cases', () => {
    it('leaves the dot hollow when the map has drawn no title of the chain', () => {
      const chain: ContentChainReading[] = [{ titles: [PONTHIEU], end: 'unknown' }]
      expect(paintedHolder(verdict('incomplete', chain), drawn)).toBeNull()
    })
  })
})

/**
 * A map drawing these ids, the Empire its one empire — each polity's registry id `polity-<id>`, its name `map:<id>`.
 * @param drawn - the Wikidata ids its polities carry
 * @returns the map's polities
 */
function map(drawn: string[]): MapPolities {
  return {
    find: ({ wikidata }) =>
      wikidata !== null && drawn.includes(wikidata)
        ? {
            id: `polity-${wikidata}`,
            name: `map:${wikidata}`,
            rank: wikidata === 'Q12548' ? 'empire' : 'kingdom',
          }
        : null,
  }
}

/**
 * The polity under a city.
 * @param wikidata - its id, `null` for none
 * @returns it
 */
function on(wikidata: string | null) {
  return { id: wikidata ?? 'elsass', name: wikidata ?? 'Elsass', wikidata }
}

// The dev, 2026-11-16: with the sovereign ticked, the check goes to n-1 under a kingdom, n-2 under an empire.
describe('bySovereignLevel', () => {
  const FRANCE = { name: 'Philippe Ier — royaume de France', wikidata: 'Q70972' }
  const BOURGES = { name: 'Eudes Arpin — vicomté de Bourges', wikidata: 'Q999' }
  const BLOIS = { name: 'Étienne — comté de Blois', wikidata: 'Q5' }
  const NORMANDY = { name: 'Robert — duché de Normandie', wikidata: 'Q6' }
  const SWABIA = { name: 'Frédéric Ier — duché de Souabe', wikidata: 'Q693980' }
  const EMPIRE = { name: 'Henri IV — Saint-Empire', wikidata: 'Q12548' }

  describe('happy path', () => {
    it('agrees with a city in the duchy below the king, its chain count → duchy → king', () => {
      const reading = { titles: [BLOIS, NORMANDY, FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q6'), map(['Q6', 'Q70972']))).toMatchObject({
        kind: 'agrees',
        expected: NORMANDY.name,
      })
    })
  })

  // The dev, 2026-11-16: the message names the title checked with the name the map gives its polity
  describe('the map’s name of the title checked', () => {
    it('gives the name of the polity carrying the title checked, wherever the city lies', () => {
      const reading = { titles: [BLOIS, NORMANDY, FRANCE], end: 'sovereign' as const }
      const named: MapPolities = {
        find: ({ wikidata }) =>
          wikidata === 'Q6' || wikidata === 'Q70972'
            ? {
                id: wikidata,
                name: wikidata === 'Q6' ? 'Duchy of Normandy' : 'France',
                rank: 'kingdom',
              }
            : null,
      }
      expect(bySovereignLevel(reading, on('Q6'), named)).toEqual({
        kind: 'agrees',
        expected: NORMANDY.name,
        expectedOnMap: 'Duchy of Normandy',
      })
      expect(bySovereignLevel(reading, on('Q70972'), named).expectedOnMap).toBe('Duchy of Normandy')
    })

    it('gives none for a title with no Wikidata id', () => {
      const nameless = { name: 'Sans identifiant', wikidata: null }
      const reading = { titles: [BLOIS, nameless, FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q70972'), map(['Q70972'])).expectedOnMap).toBeNull()
    })
  })

  describe('variants', () => {
    it('agrees with a city in a county drawn below that duchy', () => {
      const reading = { titles: [BLOIS, NORMANDY, FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q5'), map(['Q5', 'Q6', 'Q70972'])).kind).toBe('agrees')
    })

    it('marks yellow a city in the kingdom but not in its duchy, drawn elsewhere', () => {
      const reading = { titles: [BLOIS, NORMANDY, FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q70972'), map(['Q6', 'Q70972'])).kind).toBe('misplaced')
    })

    it('checks two levels below an empire, and one where it has no second level', () => {
      const deep = { titles: [BLOIS, SWABIA, NORMANDY, EMPIRE], end: 'sovereign' as const }
      expect(bySovereignLevel(deep, on('Q693980'), map(['Q693980', 'Q6', 'Q12548'])).expected).toBe(
        SWABIA.name
      )
      const shallow = { titles: [SWABIA, EMPIRE], end: 'sovereign' as const }
      expect(bySovereignLevel(shallow, on('Q693980'), map(['Q693980'])).kind).toBe('agrees')
    })
  })

  describe('managed errors', () => {
    // *"Red, when the duchy does not exist"*: the level below the king not drawn
    it('asks to declare the level below the sovereign when the map has not drawn it', () => {
      const reading = { titles: [BLOIS, NORMANDY, FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q70972'), map(['Q70972']))).toMatchObject({
        kind: 'toDeclare',
        expected: NORMANDY.name,
      })
    })
  })

  describe('edge cases', () => {
    // The dev, 2026-11-16: the first link, the city and its holder, is never what is drawn
    it('checks the kingdom, not the holder, when the holder is the level below it', () => {
      const reading = { titles: [BOURGES, FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q70972'), map(['Q70972']))).toMatchObject({
        kind: 'agrees',
        expected: FRANCE.name,
      })
    })

    it('checks the empire, not the holder, when the holder answers to it directly', () => {
      const reading = { titles: [SWABIA, EMPIRE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q12548'), map(['Q12548']))).toMatchObject({
        kind: 'agrees',
        expected: EMPIRE.name,
      })
    })

    it('checks n-1, not the holder, under an empire when the holder is n-2', () => {
      const reading = { titles: [BLOIS, SWABIA, EMPIRE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q693980'), map(['Q693980', 'Q12548']))).toMatchObject({
        kind: 'agrees',
        expected: SWABIA.name,
      })
    })

    it('checks n-1 under a sovereign whose rank the map does not know, or with no Wikidata id', () => {
      const unknown: MapPolities = {
        find: ({ wikidata }) => (wikidata === 'Q6' ? { id: 'q6', name: 'Q6', rank: null } : null),
      }
      const deep = { titles: [BLOIS, SWABIA, NORMANDY, EMPIRE], end: 'sovereign' as const }
      expect(bySovereignLevel(deep, on('Q6'), unknown).expected).toBe(NORMANDY.name)
      const nameless = { name: 'Sans identifiant', wikidata: null }
      const noId = { titles: [BLOIS, SWABIA, NORMANDY, nameless], end: 'sovereign' as const }
      expect(bySovereignLevel(noId, on('Q6'), map(['Q6'])).expected).toBe(NORMANDY.name)
    })

    // The one case where the holder is checked: a city-state, Florence and its elected head
    it('checks the holder when it is itself the sovereign', () => {
      const reading = { titles: [FRANCE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on('Q70972'), map(['Q70972'])).kind).toBe('agrees')
    })

    it('never agrees on a polity with no Wikidata id', () => {
      const reading = { titles: [SWABIA, EMPIRE], end: 'sovereign' as const }
      expect(bySovereignLevel(reading, on(null), map(['Q12548'])).kind).toBe('misplaced')
    })
  })
})
