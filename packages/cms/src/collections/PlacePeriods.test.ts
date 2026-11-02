import { APIError } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  CITY_IMPORTANCES,
  TESTIMONY_SUBJECTS,
} from '@europe-historical-atlas/core/data/cityImportance'

import { relationId } from '../fields/relationId'

import { OVERLAP_PATH, PlacePeriods, refuseOverlap } from './PlacePeriods'
import { writeSheetTitle } from './writeSheetTitle'

import type { TestimonySubject } from '@europe-historical-atlas/core/data/cityImportance'
import type { CollectionBeforeValidateHook, Field } from 'payload'
import type { Mock } from 'vitest'

/** A sheet as Payload stores it, its date reduced to years. */
interface StoredSheet {
  id: number
  date: { start: { year: number }; end?: { year: number } }
}

/**
 * Run the hook as Payload would, with the place's saved sheets behind a mocked `find`.
 * @param data - what the form sends
 * @param saved - the sheets the place already has
 * @param originalDoc - the sheet being edited, absent for a new one
 * @returns the hook's answer and the mocked `find`
 */
function run(
  data: Record<string, unknown>,
  saved: StoredSheet[],
  originalDoc?: Record<string, unknown>,
  language = 'fr'
): { answer: Promise<unknown>; find: Mock; findByID: Mock } {
  const find = vi.fn().mockResolvedValue({ docs: saved })
  const findByID = vi.fn().mockResolvedValue({ id: 4, name: 'Rome' })
  const args = {
    data,
    originalDoc,
    req: { payload: { find, findByID }, i18n: { language }, locale: language },
  } as unknown as Parameters<CollectionBeforeValidateHook>[0]
  const answer: unknown = refuseOverlap(args)
  return { answer: Promise.resolve(answer), find, findByID }
}

/** The refusal the hook throws: its sentence, and the same sentence under a field. */
type Refusal = APIError<{ errors: { path: string; message: string }[] }>

/**
 * The refusal the hook threw.
 * @param answer - the hook's promise
 * @returns the error
 */
async function refusal(answer: unknown): Promise<Refusal> {
  try {
    await answer
  } catch (error) {
    if (error instanceof APIError) return error as Refusal
    throw error
  }
  throw new Error('the hook did not refuse')
}

describe('PlacePeriods', () => {
  describe('happy path', () => {
    it('lets a first sheet of a place through unchanged', async () => {
      const data = { place: 4, date: { start: { year: 1100 } } }
      const { answer } = run(data, [])
      await expect(answer).resolves.toBe(data)
    })

    it('refuses a second sheet of the same year, under the year the date begins with', async () => {
      const { answer } = run({ place: 4, date: { start: { year: 1100 } } }, [
        { id: 1, date: { start: { year: 1100 } } },
      ])
      expect((await refusal(answer)).data.errors[0]?.path).toBe(OVERLAP_PATH)
    })
  })

  describe('variants', () => {
    it('says the refusal in a sentence naming the place and the year, not Payload’s « field is invalid »', async () => {
      const { answer } = run({ place: 4, date: { start: { year: 1100 } } }, [
        { id: 1, date: { start: { year: 1100 } } },
      ])
      expect((await refusal(answer)).message).toBe(
        'Rome a déjà une fiche pour 1100. Une seule fiche par lieu et par année : modifiez celle qui existe, ou choisissez une autre année.'
      )
    })

    it('puts the same sentence under the year', async () => {
      const { answer } = run({ place: 4, date: { start: { year: 1100 } } }, [
        { id: 1, date: { start: { year: 1100 } } },
      ])
      const error = await refusal(answer)
      expect(error.data.errors[0]?.message).toBe(error.message)
    })

    it('says it in English when the admin is in English', async () => {
      const { answer } = run(
        { place: 4, date: { start: { year: 1100 } } },
        [{ id: 1, date: { start: { year: 1100 } } }],
        undefined,
        'en'
      )
      expect((await refusal(answer)).message).toMatch(/^Rome already has a sheet for 1100\./)
    })

    it('reads the place’s name in the admin’s language, its French one when it has none', async () => {
      const { answer, findByID } = run(
        { place: 4, date: { start: { year: 1100 } } },
        [{ id: 1, date: { start: { year: 1100 } } }],
        undefined,
        'en'
      )
      await refusal(answer)
      expect(findByID).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'places', id: 4, locale: 'en', fallbackLocale: 'fr' })
      )
    })

    it('is a public error, so the admin shows its sentence', async () => {
      const { answer } = run({ place: 4, date: { start: { year: 1100 } } }, [
        { id: 1, date: { start: { year: 1100 } } },
      ])
      expect((await refusal(answer)).isPublic).toBe(true)
    })

    it('writes the saved sheet’s date in the refusal', async () => {
      const { answer } = run({ place: 4, date: { start: { year: 1100 } } }, [
        { id: 1, date: { start: { year: 1050 }, end: { year: 1150 } } },
      ])
      expect((await refusal(answer)).data.errors[0]?.message).toContain('1050–1150')
    })

    it('asks only for the sheets of the place chosen', async () => {
      const { answer, find } = run({ place: 4, date: { start: { year: 1100 } } }, [])
      await answer
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { place: { equals: 4 } } })
      )
    })

    it('reads the place from a populated relationship as from a bare id', async () => {
      const { answer, find } = run(
        { place: { id: 4, name: 'Paris' }, date: { start: { year: 1100 } } },
        []
      )
      await answer
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { place: { equals: 4 } } })
      )
    })

    // On an update the hook receives the sheet whole — Payload fills what the request left out before it runs — so the
    // data below is the whole sheet, as it arrives.
    it('lets an edited sheet keep its own year', async () => {
      const original = { id: 1, place: 4, date: { start: { year: 1100 } } }
      const data = { ...original, importance: 'capital' }
      const { answer } = run(data, [{ id: 1, date: { start: { year: 1100 } } }], original)
      await expect(answer).resolves.toBe(data)
    })

    it('checks an edited sheet’s new date against the place’s other sheets', async () => {
      const original = { id: 1, place: 4, date: { start: { year: 1000 } } }
      const { answer } = run(
        { id: 1, place: 4, date: { start: { year: 1100 } } },
        [
          { id: 1, date: { start: { year: 1000 } } },
          { id: 2, date: { start: { year: 1100 } } },
        ],
        original
      )
      await expect(refusal(answer)).resolves.toBeInstanceOf(APIError)
    })
  })

  describe('managed errors', () => {
    it('leaves a sheet with no place to the place field’s own requirement', async () => {
      const data = { date: { start: { year: 1100 } } }
      const { answer, find } = run(data, [])
      await expect(answer).resolves.toBe(data)
      expect(find).not.toHaveBeenCalled()
    })

    it('leaves a sheet with no date to the date field’s own requirement', async () => {
      const data = { place: 4 }
      const { answer, find } = run(data, [])
      await expect(answer).resolves.toBe(data)
      expect(find).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing search through rather than saving unchecked', async () => {
      const find = vi.fn().mockRejectedValue(new Error('database gone'))
      const args = {
        data: { place: 4, date: { start: { year: 1100 } } },
        req: { payload: { find } },
      } as unknown as Parameters<CollectionBeforeValidateHook>[0]
      await expect(refuseOverlap(args)).rejects.toThrow('database gone')
    })
  })

  describe('edge cases', () => {
    it.each([
      ['a bare number', 4, 4],
      ['a bare string', '7', '7'],
      ['a populated relationship', { id: 4, name: 'Paris' }, 4],
      ['nothing', undefined, null],
      ['null', null, null],
      ['an object without an id', { name: 'Paris' }, null],
      ['an object whose id is not one', { id: {} }, null],
    ])('reads the id of %s', (_case, value, id) => {
      expect(relationId(value)).toBe(id)
    })

    it('is the hook the collection runs before validating', () => {
      expect(PlacePeriods.hooks?.beforeValidate).toContain(refuseOverlap)
    })
  })

  describe('the title', () => {
    it('writes the title at every save, after the sheet’s own rule', () => {
      expect(PlacePeriods.hooks?.beforeChange?.at(-1)).toBe(writeSheetTitle)
    })

    it('names a sheet by its title in the list and the page, « Paris — 1100 »', () => {
      expect(PlacePeriods.admin?.useAsTitle).toBe('title')
      expect(PlacePeriods.admin?.defaultColumns?.[0]).toBe('title')
    })
  })

  describe('the form', () => {
    it('offers the importances core knows, in its order', () => {
      expect(options(field(PlacePeriods.fields, 'importance'))).toEqual([...CITY_IMPORTANCES])
    })

    it('offers the subjects core knows, in its order', () => {
      expect(options(field(lineFields(), 'subject'))).toEqual([...TESTIMONY_SUBJECTS])
    })

    it.each(TESTIMONY_SUBJECTS)('shows exactly the value fields of a « %s » line', (subject) => {
      const shown = Object.values(VALUE_FIELDS)
        .flat()
        .filter((name) => shows(field(lineFields(), name), subject))
      expect(shown).toEqual(VALUE_FIELDS[subject])
    })

    it.each(['population', 'importance', 'reason', 'holderName'])(
      'requires the « %s » of a line that speaks of it',
      (name) => {
        expect(field(lineFields(), name)).toMatchObject({ required: true })
      }
    )

    it('leaves a holder line’s Wikidata id optional, for a polity that has none', () => {
      expect(field(lineFields(), 'holderQid')).not.toHaveProperty('required', true)
    })

    it('shows a line’s quotation whatever its subject, never required', () => {
      const quotation = field(lineFields(), 'quotation')
      expect(quotation.admin?.condition).toBeUndefined()
      expect(quotation).not.toHaveProperty('required', true)
    })

    // CMS-276: a required column added to a table that holds sheets makes the push mode ask in the terminal.
    it.each(['holderName', 'holderQid'])(
      'adds the sheet’s « %s » as an optional column, so the saved sheets stay valid',
      (name) => {
        expect(field(PlacePeriods.fields, name)).not.toHaveProperty('required', true)
      }
    )

    it('puts the overlap’s refusal on the year the date begins with', () => {
      const date = field(PlacePeriods.fields, 'date')
      const start = date.type === 'group' ? field(date.fields, 'start') : null
      const year = start?.type === 'group' ? findField(start.fields, 'year') : null
      expect([date.name, start?.name, year?.name].join('.')).toBe(OVERLAP_PATH)
    })
  })
})

/** The fields that carry a line's value, by the subject that shows them. */
const VALUE_FIELDS: Readonly<Record<TestimonySubject, readonly string[]>> = {
  population: ['population'],
  importance: ['importance'],
  reason: ['reason'],
  holder: ['holderName', 'holderQid'],
}

/** A named field, the kind that carries a value. */
type NamedField = Extract<Field, { name: string }>

/**
 * A named field among a list, looking through rows, as the form nests them.
 * @param fields - the list
 * @param name - the field's name
 * @returns the field, or `null` when the list lacks it
 */
function findField(fields: readonly Field[], name: string): NamedField | null {
  for (const each of fields) {
    if ('name' in each && each.name === name) return each
    const inRow = each.type === 'row' ? findField(each.fields, name) : null
    if (inRow !== null) return inRow
  }
  return null
}

/**
 * {@link findField}, for a field the test needs.
 * @param fields - the list
 * @param name - the field's name
 * @returns the field
 * @throws when it is missing — the test is about a field that should be there
 */
function field(fields: readonly Field[], name: string): NamedField {
  const found = findField(fields, name)
  if (found === null) throw new Error(`no field ${name}`)
  return found
}

/**
 * The fields of a source line.
 * @returns the array's fields
 */
function lineFields(): Field[] {
  const lines = field(PlacePeriods.fields, 'testimonies')
  if (lines.type !== 'array') throw new Error('testimonies is not an array')
  return lines.fields
}

/**
 * The values a select offers.
 * @param select - the field
 * @returns its option values
 */
function options(select: NamedField): string[] {
  if (select.type !== 'select') throw new Error(`${select.name} is not a select`)
  return select.options.map((option) => (typeof option === 'string' ? option : option.value))
}

/**
 * Whether a line's field shows for a subject, by its condition as Payload calls it.
 * @param line - the field
 * @param subject - the line's subject
 * @returns `true` when it shows
 */
function shows(line: NamedField, subject: string): boolean {
  const condition = line.admin?.condition
  if (condition === undefined) return true
  return condition({}, { subject }, {} as Parameters<typeof condition>[2])
}
