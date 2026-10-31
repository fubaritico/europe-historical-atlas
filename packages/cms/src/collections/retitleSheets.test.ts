import { describe, expect, it, vi } from 'vitest'

import { retitlePlaceSheets, retitleSheets } from './retitleSheets'

import type { CollectionAfterChangeHook, Payload, PayloadRequest } from 'payload'
import type { Mock } from 'vitest'

/** A date group of one year, as the form stores it. */
const YEAR_1100 = {
  start: { year: 1100, month: null, day: null, circa: false, margin: null, calendar: null },
}

/**
 * A sheet as `find` reads it, its place populated in French.
 * @param id - the sheet
 * @param title - its title as saved
 * @param name - its place's French name
 * @returns the sheet
 */
function sheet(id: number, title: string | null | undefined, name = 'Paris') {
  return { id, title, place: { id: 3, name }, date: YEAR_1100 }
}

/**
 * A Payload whose `find` answers some sheets and whose `update` records each save.
 * @param docs - the sheets `find` answers
 * @returns the Payload and its two mocks
 */
function base(docs: unknown[]): { payload: Payload; find: Mock; update: Mock } {
  const find = vi.fn().mockResolvedValue({ docs })
  const update = vi.fn().mockResolvedValue({})
  return { payload: { find, update } as unknown as Payload, find, update }
}

/**
 * Run the place's hook as Payload would.
 * @param doc - the place as saved
 * @param payload - the base
 * @returns the hook's answer
 */
function afterSave(doc: Record<string, unknown>, payload: Payload): Promise<unknown> {
  const args = { doc, req: { payload } } as unknown as Parameters<CollectionAfterChangeHook>[0]
  return Promise.resolve(retitlePlaceSheets(args))
}

describe('retitleSheets', () => {
  describe('happy path', () => {
    it('saves again, changing nothing, a sheet saved before the title existed', async () => {
      const { payload, update } = base([sheet(1, undefined)])

      const count = await retitleSheets(payload, {})

      expect(count).toBe(1)
      expect(update).toHaveBeenCalledWith({ collection: 'place-periods', id: 1, data: {} })
    })

    it('saves again a renamed place’s sheets, whose title still bears the old name', async () => {
      const { payload, find, update } = base([sheet(7, 'Paris — 1100', 'Lutèce')])

      await afterSave({ id: 3, name: 'Lutèce' }, payload)

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'place-periods', where: { place: { equals: 3 } } })
      )
      expect(update).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('reads the places in French, the language every title is written in', async () => {
      const { payload, find } = base([])

      await retitleSheets(payload, {})

      expect(find).toHaveBeenCalledWith(expect.objectContaining({ locale: 'fr', depth: 1 }))
    })

    it('leaves a sheet whose title is already right — a place saved for its English name changes nothing', async () => {
      const { payload, update } = base([sheet(7, 'Paris — 1100')])

      await afterSave({ id: 3, name: 'Paris' }, payload)

      expect(update).not.toHaveBeenCalled()
    })

    it('saves nothing the second time it runs', async () => {
      const { payload, update } = base([sheet(1, 'Paris — 1100'), sheet(2, 'Paris — 1100')])

      expect(await retitleSheets(payload, {})).toBe(0)
      expect(update).not.toHaveBeenCalled()
    })

    it('stays in the request it is given, for its transaction', async () => {
      const { payload, find, update } = base([sheet(1, null)])
      const req = { id: 'r' } as unknown as PayloadRequest

      await retitleSheets(payload, {}, req)

      expect(find).toHaveBeenCalledWith(expect.objectContaining({ req }))
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ req }))
    })
  })

  describe('managed errors', () => {
    it('returns the place unchanged', async () => {
      const { payload } = base([])
      const place = { id: 3, name: 'Lutèce' }

      expect(await afterSave(place, payload)).toBe(place)
    })

    it('saves again a sheet whose place could not be read, which carries a title it cannot be given', async () => {
      const { payload, update } = base([
        { id: 1, title: 'Paris — 1100', place: 3, date: YEAR_1100 },
      ])

      await retitleSheets(payload, {})

      expect(update).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a refused save through, so the place’s save fails with it rather than leaving a stale title', async () => {
      const { payload, update } = base([sheet(7, 'Paris — 1100', 'Lutèce')])
      update.mockRejectedValue(new Error('refused'))

      await expect(afterSave({ id: 3, name: 'Lutèce' }, payload)).rejects.toThrow('refused')
    })
  })

  describe('edge cases', () => {
    it('counts none when nothing is selected', async () => {
      const { payload, update } = base([])

      expect(await retitleSheets(payload, {})).toBe(0)
      expect(update).not.toHaveBeenCalled()
    })
  })
})
