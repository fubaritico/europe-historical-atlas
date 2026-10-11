import { describe, expect, it } from 'vitest'

import { DRAFT_ERRORS, EMPTY_DRAFT, readDraft, withId, withName } from './polityDraft'

import type { PolityDraft } from './polityDraft'

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
      expect(reading).toEqual({ ok: false, errors: { id: DRAFT_ERRORS.idTaken } })
    })

    it('refuses an empty name and an empty id', () => {
      expect(readDraft(EMPTY_DRAFT, NONE)).toEqual({
        ok: false,
        errors: { name: DRAFT_ERRORS.nameMissing, id: DRAFT_ERRORS.idMissing },
      })
    })

    it('refuses a year that is not a whole number, field by field', () => {
      const reading = readDraft(
        draft({ name: 'France', id: 'france', existsFrom: '98a', existsTo: '1.5' }),
        NONE
      )
      expect(reading).toEqual({
        ok: false,
        errors: { existsFrom: DRAFT_ERRORS.notAYear, existsTo: DRAFT_ERRORS.notAYear },
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
