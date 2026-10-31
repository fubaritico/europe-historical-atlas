import { describe, expect, it, vi } from 'vitest'

import { writeSheetTitle } from './writeSheetTitle'

import type { CollectionBeforeChangeHook } from 'payload'
import type { Mock } from 'vitest'

/** A sheet's start year as the form stores it. */
const YEAR_1100 = {
  start: { year: 1100, month: null, day: null, circa: false, margin: null, calendar: null },
}

/**
 * Run the hook as Payload would, the place read through a mocked `findByID`.
 * @param data - the sheet about to be saved
 * @param findByID - how the place is read
 * @returns the hook's answer
 */
function run(data: Record<string, unknown>, findByID: Mock): Promise<unknown> {
  const args = {
    data,
    req: { payload: { findByID } },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0]
  return Promise.resolve(writeSheetTitle(args))
}

describe('writeSheetTitle', () => {
  describe('happy path', () => {
    it('writes « Paris — 1100 » from the place’s name and the date', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 3, name: 'Paris' })

      const answer = await run({ place: 3, date: YEAR_1100, importance: 'capital' }, findByID)

      expect(answer).toEqual({
        place: 3,
        date: YEAR_1100,
        importance: 'capital',
        title: 'Paris — 1100',
      })
    })
  })

  describe('variants', () => {
    it('reads the place’s French name, whatever the admin’s language', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 3, name: 'Paris' })

      await run({ place: 3, date: YEAR_1100 }, findByID)

      expect(findByID).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'places', id: 3, locale: 'fr' })
      )
    })

    it('reads the place from a populated relationship as from a bare id', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 3, name: 'Paris' })

      await run({ place: { id: 3, name: 'Paris' }, date: YEAR_1100 }, findByID)

      expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }))
    })

    it('writes a title anew over an old one, so a changed date shows', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 3, name: 'Paris' })

      const answer = await run({ place: 3, date: YEAR_1100, title: 'Paris — 1000' }, findByID)

      expect(answer).toMatchObject({ title: 'Paris — 1100' })
    })
  })

  describe('managed errors', () => {
    it('leaves a sheet with no place to the place field’s own requirement', async () => {
      const findByID = vi.fn()

      const answer = await run({ date: YEAR_1100 }, findByID)

      expect(answer).toEqual({ date: YEAR_1100 })
      expect(findByID).not.toHaveBeenCalled()
    })

    it('leaves a sheet with no date to the date field’s own requirement', async () => {
      const answer = await run({ place: 3 }, vi.fn())

      expect(answer).toEqual({ place: 3 })
    })

    it('writes no title for a date that cannot be read', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 3, name: 'Paris' })

      const answer = await run({ place: 3, date: {} }, findByID)

      expect(answer).not.toHaveProperty('title')
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing read of the place through rather than saving without a title', async () => {
      const findByID = vi.fn().mockRejectedValue(new Error('Not Found'))

      await expect(run({ place: 3, date: YEAR_1100 }, findByID)).rejects.toThrow('Not Found')
    })
  })

  describe('edge cases', () => {
    it('keeps a place’s name as it is written, accents and spaces included', async () => {
      const findByID = vi.fn().mockResolvedValue({ id: 9, name: 'Césarée de Cappadoce' })

      const answer = await run({ place: 9, date: YEAR_1100 }, findByID)

      expect(answer).toMatchObject({ title: 'Césarée de Cappadoce — 1100' })
    })
  })
})
