import { describe, expect, it } from 'vitest'

import { saveYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import {
  cityAlertReport,
  formatCityAlerts,
  openMapFolder,
  parseCityAlertArgs,
  pipedContent,
} from './cityAlerts'

import type { CityMark } from '../state/citiesSlice'
import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'

/**
 * France over 0–2° E and the Empire over 2–4° E, 46–48° N, each with its Wikidata id.
 * @returns the map
 */
function map() {
  const document = sharedBorderDocument()
  const [france, empire] = document.polities
  if (france === undefined || empire === undefined) throw new Error('fixture changed')
  france.wikidata = 'Q70972'
  empire.wikidata = 'Q12548'
  return document
}

/**
 * A date covering one year.
 * @param year - the year
 * @returns the date
 */
const inYear = (year: number) =>
  ({
    kind: 'instant',
    at: { year, month: null, day: null, calendar: null, circa: false, margin: null },
  }) as const

/** A count's chain up to the King of France, drawn. */
const UNDER_FRANCE: ContentChainReading[] = [
  {
    titles: [
      { name: 'Comte — comté, 1100', wikidata: 'Q100' },
      { name: 'Philippe Ier — royaume de France, 1100', wikidata: 'Q70972' },
    ],
    end: 'sovereign',
  },
]

/** A count's chain through a duchy the map has not drawn. */
const THROUGH_A_DUCHY: ContentChainReading[] = [
  {
    titles: [
      { name: 'Comte — comté, 1100', wikidata: 'Q100' },
      { name: 'Duc — duché, 1100', wikidata: 'Q200' },
      { name: 'Philippe Ier — royaume de France, 1100', wikidata: 'Q70972' },
    ],
    end: 'sovereign',
  },
]

/**
 * A city of 1100.
 * @param id - its sheet
 * @param name - its name
 * @param lonLat - where it is
 * @param chain - its chain, or none
 * @returns the city
 */
function city(
  id: string,
  name: string,
  lonLat: [number, number],
  chain: ContentChainReading[] | null
): CityMark {
  return {
    id,
    name,
    lon: lonLat[0],
    lat: lonLat[1],
    date: inYear(1100),
    holder: null,
    chain,
    holderSources: [],
  }
}

const RIGHT = city('1', 'Orléans', [1, 47], UNDER_FRANCE)
const ACROSS = city('2', 'Metz', [3, 47], UNDER_FRANCE)
const UNDRAWN = city('3', 'Bourges', [1, 46.5], THROUGH_A_DUCHY)
const UNENTERED = city('4', 'Auxerre', [1.5, 47.5], null)

/** A chain that stops for want of a link, without the country under the city — never reaching a sovereign. */
const STOPPED: ContentChainReading[] = [
  { titles: [{ name: 'Comte — comté, 1100', wikidata: 'Q100' }], end: 'unknown' },
]

/**
 * The map with the Empire drawn without its Wikidata id.
 * @returns the map
 */
function mapWithAnonymousEmpire() {
  const document = map()
  const empire = document.polities[1]
  if (empire === undefined) throw new Error('fixture changed')
  empire.wikidata = null
  return document
}

describe('parseCityAlertArgs', () => {
  describe('happy path', () => {
    it('reads the map, with no box', () => {
      expect(parseCityAlertArgs(['--map', '1100'])).toEqual({ map: '1100', box: null })
    })
  })

  describe('variants', () => {
    it('reads both written with an equals sign', () => {
      expect(parseCityAlertArgs(['--map=1100', '--box=3,48,5,50'])).toEqual({
        map: '1100',
        box: { west: 3, south: 48, east: 5, north: 50 },
      })
    })

    it('reads the box as a separate argument, in any order, spaces allowed', () => {
      expect(parseCityAlertArgs(['--box', '-1.5, 43, 2 ,45', '--map', '1100-essai']).box).toEqual({
        west: -1.5,
        south: 43,
        east: 2,
        north: 45,
      })
    })
  })

  describe('managed errors', () => {
    it('refuses a missing map, with the usage', () => {
      expect(() => parseCityAlertArgs([])).toThrow(/--map manque — usage/)
    })

    it('refuses a name that could climb out of the maps’ folder', () => {
      expect(() => parseCityAlertArgs(['--map', '../x'])).toThrow(/n’est pas un nom de carte/)
    })

    it('refuses an unknown argument rather than ignoring it', () => {
      expect(() => parseCityAlertArgs(['--map', '1100', '--bbox=1,2,3,4'])).toThrow(
        /argument inconnu : --bbox=1,2,3,4/
      )
    })

    it('refuses an option with no value', () => {
      expect(() => parseCityAlertArgs(['--map'])).toThrow(/--map attend une valeur/)
    })

    it('refuses a box of three numbers', () => {
      expect(() => parseCityAlertArgs(['--map', '1100', '--box=1,2,3'])).toThrow(/quatre nombres/)
    })

    it('refuses a box whose west is east of its east', () => {
      expect(() => parseCityAlertArgs(['--map', '1100', '--box=5,48,3,50'])).toThrow(
        /l’ouest doit être avant l’est/
      )
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a box holding a word, never reading it as zero', () => {
      expect(() => parseCityAlertArgs(['--map', '1100', '--box=a,48,5,50'])).toThrow(
        /quatre nombres/
      )
    })
  })

  describe('edge cases', () => {
    it('refuses an empty part of the box, never reading it as the meridian', () => {
      expect(() => parseCityAlertArgs(['--map', '1100', '--box=,48,5,50'])).toThrow(
        /quatre nombres/
      )
    })

    it('takes a year before Christ as a map’s name', () => {
      expect(parseCityAlertArgs(['--map', '-500']).map).toBe('-500')
    })

    it('refuses a box of no width', () => {
      expect(() => parseCityAlertArgs(['--map', '1100', '--box=3,48,3,50'])).toThrow(
        /l’ouest doit être avant l’est/
      )
    })
  })
})

describe('cityAlertReport', () => {
  describe('happy path', () => {
    it('keeps the cities whose dot is on alert, and counts every city judged', () => {
      const report = cityAlertReport(map(), [RIGHT, ACROSS, UNDRAWN, UNENTERED], null)

      expect(report.judged).toBe(4)
      expect(report.alerted.map(({ city: { id }, verdict: { kind } }) => [id, kind])).toEqual([
        ['2', 'misplaced'],
        ['3', 'toDeclare'],
        ['4', 'notEntered'],
      ])
    })
  })

  describe('variants', () => {
    it('judges only the cities inside the box', () => {
      const report = cityAlertReport(map(), [RIGHT, ACROSS, UNDRAWN], {
        west: 2.5,
        south: 46,
        east: 4,
        north: 48,
      })

      expect([report.judged, report.alerted.map(({ city: { id } }) => id)]).toEqual([1, ['2']])
    })

    it('lists the yellow alerts before the red ones, whatever the names', () => {
      const incomplete = city('7', 'Zara', [1, 47], STOPPED)
      const textHolder = {
        ...city('8', 'Arles', [1, 47], null),
        holder: { name: 'X', wikidata: null },
      }
      const report = cityAlertReport(
        map(),
        [UNENTERED, textHolder, UNDRAWN, incomplete, ACROSS],
        null
      )

      expect(report.alerted.map(({ kind }) => kind)).toEqual([
        'misplaced',
        'incomplete',
        'toDeclare',
        'cannotCompare',
        'notEntered',
      ])
    })

    it('says incomplete a chain that stops short of the country under the city', () => {
      const report = cityAlertReport(map(), [city('7', 'Zara', [1, 47], STOPPED)], null)

      expect(report.alerted.map(({ kind }) => kind)).toEqual(['incomplete'])
    })

    it('sorts the cities of one alert by name', () => {
      const second = city('5', 'Aix', [3.5, 47], UNDER_FRANCE)
      const report = cityAlertReport(map(), [ACROSS, second], null)

      expect(report.alerted.map(({ city: { name } }) => name)).toEqual(['Aix', 'Metz'])
    })
  })

  describe('managed errors', () => {
    it('leaves out a city of another year, as the canvas does', () => {
      const later = { ...ACROSS, id: '6', date: inYear(1200) }

      expect(cityAlertReport(map(), [later], null)).toEqual({ judged: 0, alerted: [] })
    })
  })

  // L4: N/A — pure, synchronous; a malformed map or content is refused by core's readers before it reaches here.

  describe('edge cases', () => {
    it('judges a city on the box’s edge as inside it', () => {
      const report = cityAlertReport(map(), [ACROSS], { west: 3, south: 47, east: 4, north: 48 })

      expect(report.judged).toBe(1)
    })

    it('says nothing is on alert on a map with no city', () => {
      expect(cityAlertReport(map(), [], null)).toEqual({ judged: 0, alerted: [] })
    })
  })
})

describe('formatCityAlerts', () => {
  const text = formatCityAlerts(
    cityAlertReport(map(), [RIGHT, ACROSS, UNDRAWN, UNENTERED], null),
    '1100'
  )

  describe('happy path', () => {
    it('heads the list with the count on alert, then each alert’s count', () => {
      expect(text.split('\n').slice(0, 4)).toEqual([
        'Carte 1100 : 3 ville(s) en alerte sur 4.',
        '  1 misplaced — jaune — le pays dessiné sous elle n’est pas dans sa chaîne',
        '  1 toDeclare — rouge — le titre vérifié n’est pas dessiné sur la carte',
        '  1 notEntered — rouge — aucun détenteur saisi dans le CMS',
      ])
    })

    it('tells a misplaced city by its sheet, the country under it, the title checked and its chain', () => {
      expect(text).toContain(
        [
          'Metz — fiche 2 — misplaced : jaune — le pays dessiné sous elle n’est pas dans sa chaîne',
          '  position : 3, 47',
          '  sous elle : Sacrum Imperium (Q12548)',
          '  niveau vérifié : Philippe Ier — royaume de France, 1100 — sur la carte : Reaume de France',
          '  chaîne 1, jusqu’au souverain : Comte — comté, 1100 (Q100) → Philippe Ier — royaume de France, 1100 (Q70972)',
        ].join('\n')
      )
    })
  })

  describe('variants', () => {
    it('says a title checked that the map has not drawn', () => {
      expect(text).toContain('  niveau vérifié : Duc — duché, 1100 — sur la carte : non dessiné')
    })

    it('says a city whose sheet names no title', () => {
      expect(text).toContain('Auxerre — fiche 4 — notEntered')
      expect(text).toContain('  chaîne : aucune (la fiche ne nomme pas de titre)')
    })
  })

  describe('the cause of a city with nothing to compare', () => {
    it('blames the country drawn under it when its chain names titles', () => {
      const under = city('9', 'Metz', [3, 47], STOPPED)
      const alone = formatCityAlerts(
        cityAlertReport(mapWithAnonymousEmpire(), [under], null),
        '1100'
      )

      expect(alone).toContain(
        'Metz — fiche 9 — cannotCompare : rouge — le pays dessiné sous elle n’a pas d’identifiant Wikidata'
      )
    })

    it('blames the holder entered as text when the sheet names no title, and says it', () => {
      const textHolder = {
        ...city('8', 'Arles', [1, 47], null),
        holder: { name: 'Provence', wikidata: null },
      }
      const alone = formatCityAlerts(cityAlertReport(map(), [textHolder], null), '1100')

      expect(alone).toContain(
        'Arles — fiche 8 — cannotCompare : rouge — le détenteur saisi en texte n’a pas d’identifiant Wikidata'
      )
      expect(alone).toContain('  détenteur saisi en texte : Provence (sans identifiant)')
    })
  })

  it('says a chain that loops', () => {
    const looping = city(
      '10',
      'Liège',
      [1, 47],
      [{ titles: [{ name: 'Évêque', wikidata: 'Q300' }], end: 'loop' }]
    )
    const alone = formatCityAlerts(cityAlertReport(map(), [looping], null), '1100')

    expect(alone).toContain('  chaîne 1, arrêtée sur une boucle de maillons : Évêque (Q300)')
  })

  // L3: N/A — nothing to refuse: the text is made of a report already computed.
  // L4: N/A — pure and synchronous.

  describe('edge cases', () => {
    it('says ground nobody claims, and a title with no Wikidata id', () => {
      const outside = city(
        '7',
        'Nantes',
        [-1.5, 47.2],
        [{ titles: [{ name: 'Comte de Nantes', wikidata: null }], end: 'unknown' }]
      )
      const alone = formatCityAlerts(cityAlertReport(map(), [outside], null), '1100')

      expect(alone).toContain('  sous elle : aucun pays (terre que personne ne revendique)')
      expect(alone).toContain(
        '  chaîne 1, arrêtée faute de maillon : Comte de Nantes (sans identifiant)'
      )
    })

    it('says only the head when no city is on alert', () => {
      expect(formatCityAlerts({ judged: 2, alerted: [] }, '1100')).toBe(
        'Carte 1100 : 0 ville(s) en alerte sur 2.\n'
      )
    })
  })
})

/**
 * A reader over a map's three files, as text.
 * @param files - each file's content, by its name
 * @returns the reader
 */
const readerOf =
  (files: Record<string, unknown>) =>
  (file: string): Promise<string> =>
    file in files
      ? Promise.resolve(JSON.stringify(files[file]))
      : Promise.reject(new Error(`ENOENT: ${file}`))

describe('openMapFolder', () => {
  const saved = saveYearDocument(map())
  const FILES = {
    'registry.json': saved.registry,
    'polities.json': saved.polities,
    'borders.json': saved.borders,
  }

  describe('happy path', () => {
    it('opens the map its three files hold', async () => {
      const document = await openMapFolder('years/1100', readerOf(FILES))

      expect([document.year, document.polities.map(({ wikidata }) => wikidata)]).toEqual([
        1100,
        ['Q70972', 'Q12548'],
      ])
    })
  })

  // L2: N/A — one way to open a map: its three files.

  describe('managed errors', () => {
    it('refuses three files that disagree on their year, naming the folder', async () => {
      const files = { ...FILES, 'borders.json': { ...saved.borders, year: 1200 } }

      await expect(openMapFolder('years/1100', readerOf(files))).rejects.toThrow(/years\/1100/)
    })
  })

  describe('unmanaged errors', () => {
    it('hands on a file the reader cannot read', async () => {
      const { 'borders.json': _left, ...files } = FILES

      await expect(openMapFolder('years/1100', readerOf(files))).rejects.toThrow(
        'ENOENT: borders.json'
      )
    })

    it('refuses a file that is not JSON', async () => {
      const read = (file: string) =>
        file === 'polities.json' ? Promise.resolve('{ not json') : readerOf(FILES)(file)

      await expect(openMapFolder('years/1100', read)).rejects.toThrow(SyntaxError)
    })
  })

  describe('edge cases', () => {
    it('refuses a file of the wrong shape, naming it', async () => {
      const files = { ...FILES, 'registry.json': { nothing: true } }

      await expect(openMapFolder('years/1100', readerOf(files))).rejects.toThrow(/registry\.json/)
    })
  })
})

describe('pipedContent', () => {
  describe('happy path', () => {
    it('reads the JSON piped in', () => {
      expect(pipedContent('{"events":[]}')).toEqual({ events: [] })
    })
  })

  describe('managed errors', () => {
    // Review QUAL-003, 2026-11-16: a failed print reached the command as « Unexpected end of JSON input »
    it.each(['', '  \n'])('says the CMS sent nothing for an empty pipe (%j)', (piped) => {
      expect(() => pipedContent(piped)).toThrow('le CMS n’a rien envoyé')
    })
  })

  describe('unmanaged errors', () => {
    it('lets a pipe that is not JSON fail as JSON', () => {
      expect(() => pipedContent('not json')).toThrow(SyntaxError)
    })
  })

  // L2, L5: N/A — one input, read whole
})
