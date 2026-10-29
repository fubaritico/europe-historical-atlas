import { describe, expect, it, vi } from 'vitest'

import { MAX_HOMAGE_DEPTH } from '@europe-historical-atlas/core/data/paintOrder'
import { addPolity, updatePolity } from '@europe-historical-atlas/core/editor/documentEdits'
import { createYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import {
  EMPTY_DRAFT,
  RANKS,
  draftOf,
  rankChoices,
  readDraft,
  suzerainChoices,
  withId,
  withName,
} from './polityDraft'

import type { PolityDraft } from './polityDraft'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

const NONE: ReadonlySet<string> = new Set()

function draft(overrides: Partial<PolityDraft>): PolityDraft {
  return { ...EMPTY_DRAFT, ...overrides }
}

describe('polityDraft', () => {
  describe('happy path', () => {
    it('proposes an id from the name as it is typed', () => {
      expect(withName(EMPTY_DRAFT, 'Reaume de France', []).id).toBe('reaume-de-france')
    })

    it('reads a filled form into the polity to create', () => {
      const reading = readDraft(
        draft({
          name: 'Kingdom of France',
          id: 'fr-couronne',
          rank: 'kingdom',
          status: 'country',
          existsFrom: '987',
          wikidata: 'Q70972',
        }),
        NONE
      )
      expect(reading).toEqual({
        ok: true,
        polity: {
          id: 'fr-couronne',
          name: 'Kingdom of France',
          rank: 'kingdom',
          status: 'country',
          suzerain: null,
          existsFrom: 987,
          existsTo: null,
          colour: null,
          wikidata: 'Q70972',
        },
      })
    })
  })

  describe('variants', () => {
    // CARTO-307: the name the atlas writes, typed beside the long one.
    it('writes the short name typed, trimmed', () => {
      const reading = readDraft(
        draft({ name: 'Kingdom of France', id: 'france', shortName: '  France ' }),
        NONE
      )
      expect(reading.ok && reading.polity.shortName).toBe('France')
    })

    it('leaves the short name out of the polity when none is typed — absent, never empty', () => {
      const reading = readDraft(draft({ name: 'France', id: 'france', shortName: '   ' }), NONE)
      expect(reading.ok && 'shortName' in reading.polity).toBe(false)
    })

    // s02 — "explicit when given": the picker's HSVA becomes the file's #rrggbb.
    it("writes a chosen colour as the file's six-digit hex", () => {
      const reading = readDraft(
        draft({ name: 'France', id: 'france', colour: { h: 210, s: 50, v: 80, a: 1 } }),
        NONE
      )
      expect(reading.ok && reading.polity.colour).toBe('#6699cc')
    })

    it('steps past an id the year already holds', () => {
      expect(withName(EMPTY_DRAFT, 'Reaume de France', ['reaume-de-france']).id).toBe(
        'reaume-de-france-2'
      )
    })

    // H-31: proposed, then the author's. The trap is a name keystroke wiping the id they wrote.
    it('stops proposing once the author has written the id', () => {
      const edited = withId(withName(EMPTY_DRAFT, 'Reaume', []), 'fr-couronne')
      expect(withName(edited, 'Reaume de France', []).id).toBe('fr-couronne')
    })

    it('proposes again after the author empties the id', () => {
      const cleared = withId(withId(EMPTY_DRAFT, 'fr-couronne'), '')
      expect(withName(cleared, 'Reaume de France', []).id).toBe('reaume-de-france')
    })

    it('reads a year before the era and a suzerain', () => {
      const reading = readDraft(
        draft({ name: 'Gaul', id: 'gaul', existsFrom: '-58', suzerain: 'rome' }),
        NONE
      )
      expect(reading.ok && reading.polity.existsFrom).toBe(-58)
      expect(reading.ok && reading.polity.suzerain).toBe('rome')
    })

    it('trims what was typed', () => {
      const reading = readDraft(
        draft({ name: '  Aquitaine ', id: ' aquitaine ', wikidata: ' ' }),
        NONE
      )
      expect(reading.ok && reading.polity.name).toBe('Aquitaine')
      expect(reading.ok && reading.polity.id).toBe('aquitaine')
      expect(reading.ok && reading.polity.wikidata).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('refuses an id the year already holds, and says so beside the id', () => {
      const reading = readDraft(draft({ name: 'France', id: 'france' }), new Set(['france']))
      expect(reading).toEqual({ ok: false, errors: { id: 'idTaken' } })
    })

    it('refuses an empty name and an empty id', () => {
      expect(readDraft(EMPTY_DRAFT, NONE)).toEqual({
        ok: false,
        errors: { name: 'nameMissing', id: 'idMissing' },
      })
    })

    it('refuses a year that is not a whole number, field by field', () => {
      const reading = readDraft(
        draft({ name: 'France', id: 'france', existsFrom: '98a', existsTo: '1.5' }),
        NONE
      )
      expect(reading).toEqual({
        ok: false,
        errors: { existsFrom: 'notAYear', existsTo: 'notAYear' },
      })
    })
  })

  describe('unmanaged errors', () => {
    // Loud propagation: a broken colour stops the reading rather than writing a plausible one.
    it('lets a colour that is not a number throw rather than write one', () => {
      const broken = draft({ name: 'France', id: 'france', colour: { h: 0, s: NaN, v: 50, a: 1 } })
      expect(() => readDraft(broken, NONE)).toThrow(RangeError)
    })

    // s00: the rules are defaults. An end before the beginning is odd, and the author's to decide.
    it('does not refuse an end before the beginning', () => {
      expect(
        readDraft(draft({ name: 'X', id: 'x', existsFrom: '1200', existsTo: '1100' }), NONE).ok
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    // H-31: a non-latin name proposes nothing rather than a romanisation — the id is then the author's.
    it('proposes no id for a name with nothing to slug', () => {
      expect(withName(EMPTY_DRAFT, 'Βασιλεία', []).id).toBe('')
    })

    // The format has six digits and no alpha: a translucent value is written opaque, never as #rrggbbaa,
    // which the reader would refuse at the next open.
    it('writes a translucent colour opaque, in six digits', () => {
      const reading = readDraft(
        draft({ name: 'France', id: 'france', colour: { h: 210, s: 50, v: 80, a: 0.5 } }),
        NONE
      )
      expect(reading.ok && reading.polity.colour).toBe('#6699cc')
    })

    it('leaves the colour to the palette', () => {
      const reading = readDraft(draft({ name: 'France', id: 'france' }), NONE)
      expect(reading.ok && reading.polity.colour).toBeNull()
    })
  })
})

/**
 * A polity with every field set, owing nobody unless told.
 * @param id - its id
 * @param suzerain - whom it owes
 * @returns the polity
 */
function polity(id: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name: `Name of ${id}`,
    rank: 'kingdom',
    status: null,
    suzerain,
    existsFrom: 987,
    existsTo: null,
    colour: '#3355aa',
    wikidata: 'Q70972',
  }
}

describe('draftOf', () => {
  describe('happy path', () => {
    // s07 — "the same form as creation opens, filled with its current values".
    it('fills the form with the polity’s values, the id kept as the author’s', () => {
      const filled = draftOf(polity('fr'))
      expect(filled).toMatchObject({
        name: 'Name of fr',
        id: 'fr',
        idEdited: true,
        rank: 'kingdom',
        existsFrom: '987',
        existsTo: '',
        wikidata: 'Q70972',
      })
    })
  })

  describe('variants', () => {
    it('reads back the same polity it was filled from', () => {
      const original = polity('fr')
      const reading = readDraft(draftOf(original), NONE)
      expect(reading).toEqual({ ok: true, polity: original })
    })

    it('reads back a polity with a short name, and fills the field with it', () => {
      const original = { ...polity('fr'), shortName: 'France' }
      expect([draftOf(original).shortName, readDraft(draftOf(original), NONE)]).toEqual([
        'France',
        { ok: true, polity: original },
      ])
    })

    it('opens "automatic" for a polity with no colour of its own', () => {
      expect(draftOf({ ...polity('fr'), colour: null }).colour).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('opens "automatic" for a colour that is no hex, and says so', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(draftOf({ ...polity('fr'), colour: 'blue' }).colour).toBeNull()
      expect(error).toHaveBeenCalledWith(expect.stringContaining('"blue", which is no hex'))
      error.mockRestore()
    })
  })

  // L4: N/A — the polity comes from a document the readers already checked.
  // L5: the year 0 and negative years are readDraft's, tested above.
})

/**
 * A chain of homage `<prefix>0` ← `<prefix>1` ← … ← `<prefix><depth>`.
 * @param prefix - the ids' prefix
 * @param depth - the depth of its last polity
 * @returns the polities, top first
 */
function chainOf(prefix: string, depth: number): YearPolity[] {
  return Array.from({ length: depth + 1 }, (_, level) =>
    polity(`${prefix}${String(level)}`, level === 0 ? null : `${prefix}${String(level - 1)}`)
  )
}

describe('suzerainChoices', () => {
  const year = [polity('fr'), polity('normandy', 'fr'), polity('bayeux', 'normandy'), polity('hre')]

  describe('happy path', () => {
    it('offers every polity of the year to a new one', () => {
      expect(suzerainChoices(year, null).map((choice) => choice.value)).toEqual([
        'fr',
        'normandy',
        'bayeux',
        'hre',
      ])
    })
  })

  describe('variants', () => {
    // A loop of homage would be refused by the document: the list does not offer it.
    it('leaves out the polity edited and its vassals at any depth', () => {
      expect(suzerainChoices(year, 'fr').map((choice) => choice.value)).toEqual(['hre'])
    })

    it('labels each choice with its name', () => {
      expect(suzerainChoices(year, 'bayeux')[0]).toEqual({ value: 'fr', label: 'Name of fr' })
    })

    // A chain deeper than the limit would be refused by the document: the list does not offer it.
    it('leaves out a suzerain that would push a vassal below the polity edited past the limit', () => {
      // v0 under c4 sits at 5; its vassal v4 would sit at 9.
      const chains = [...chainOf('c', 4), ...chainOf('v', 4)]
      const offered = suzerainChoices(chains, 'v0').map((choice) => choice.value)
      expect(offered).toEqual(['c0', 'c1', 'c2', 'c3'])
    })

    it('leaves out, for a new polity, the suzerain at the limit and offers the one just above', () => {
      const offered = suzerainChoices(chainOf('c', MAX_HOMAGE_DEPTH), null).map((c) => c.value)
      expect(offered).toContain(`c${String(MAX_HOMAGE_DEPTH - 1)}`)
      expect(offered).not.toContain(`c${String(MAX_HOMAGE_DEPTH)}`)
    })
  })

  // L3: N/A — a filter over the year's polities.

  describe('unmanaged errors', () => {
    // The form never offers what the document refuses, nor hides what it accepts (review ARCH-001).
    it('offers exactly the suzerains the document accepts, for every polity of the year', () => {
      const doc = createYearDocument(1100)
      doc.polities = year
      for (const edited of year) {
        const offered = new Set(suzerainChoices(year, edited.id).map((choice) => choice.value))
        for (const candidate of year) {
          const accepted = updatePolity(structuredClone(doc), { ...edited, suzerain: candidate.id })
          expect([candidate.id, offered.has(candidate.id)]).toEqual([candidate.id, accepted])
        }
      }
    })

    it('offers exactly the suzerains the document accepts on deep chains, editing and creating', () => {
      const chains = [...chainOf('c', MAX_HOMAGE_DEPTH), ...chainOf('v', 3)]
      const doc = createYearDocument(1100)
      doc.polities = chains
      for (const edited of chains) {
        const offered = new Set(suzerainChoices(chains, edited.id).map((choice) => choice.value))
        for (const candidate of chains) {
          const accepted = updatePolity(structuredClone(doc), { ...edited, suzerain: candidate.id })
          expect([edited.id, candidate.id, offered.has(candidate.id)]).toEqual([
            edited.id,
            candidate.id,
            accepted,
          ])
        }
      }
      const offeredNew = new Set(suzerainChoices(chains, null).map((choice) => choice.value))
      for (const candidate of chains) {
        const accepted = addPolity(structuredClone(doc), polity('new', candidate.id))
        expect([candidate.id, offeredNew.has(candidate.id)]).toEqual([candidate.id, accepted])
      }
    })
  })

  describe('edge cases', () => {
    it('stops on a loop already in the year', () => {
      const looped = [polity('a', 'b'), polity('b', 'a'), polity('c')]
      expect(suzerainChoices(looped, 'a').map((choice) => choice.value)).toEqual(['c'])
    })
  })
})

const ranked = (...ranks: (string | null)[]) => ranks.map((rank) => ({ rank }))

describe('rankChoices', () => {
  describe('happy path', () => {
    it('offers the usual ranks, tribe among them', () => {
      expect(rankChoices([])).toEqual([
        'empire',
        'kingdom',
        'principality',
        'duchy',
        'county',
        'tribe',
      ])
    })
  })

  describe('variants', () => {
    it('adds every other rank the year uses, in alphabetical order', () => {
      expect(rankChoices(ranked('lordship', 'emirate', 'kingdom')).slice(RANKS.length)).toEqual([
        'emirate',
        'lordship',
      ])
    })

    it('offers a rank used by two polities once', () => {
      expect(rankChoices(ranked('march', 'march')).slice(RANKS.length)).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    // L3: N/A — nothing is refused; any rank of the file is a choice.
    it('adds nothing for a polity with no rank', () => {
      expect(rankChoices(ranked(null))).toHaveLength(RANKS.length)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — a pure read over an array.
    it('adds nothing for an empty rank', () => {
      expect(rankChoices(ranked(''))).toHaveLength(RANKS.length)
    })
  })

  describe('edge cases', () => {
    it('does not offer an usual rank twice when the year uses it', () => {
      expect(rankChoices(ranked('tribe')).filter((rank) => rank === 'tribe')).toHaveLength(1)
    })
  })
})
