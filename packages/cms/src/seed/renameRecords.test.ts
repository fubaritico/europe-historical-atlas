import { describe, expect, it, vi } from 'vitest'

import { renameRecords } from './renameRecords'

import type { RenamePort } from './renameRecords'

/** A stand-in for Payload: records by id, an update that renames them, and the calls it received. */
function base(names: Record<number, string>, refuse?: number) {
  const findByID = vi.fn(({ id }: { id: number }) => {
    const name = names[id]
    if (name === undefined) return Promise.reject(new Error(`Not Found: ${String(id)}`))
    return Promise.resolve({ id, name })
  })
  const update = vi.fn(({ id, data }: { id: number; data: { name: string } }) => {
    if (id === refuse) return Promise.reject(new Error(`refused: ${String(id)}`))
    names[id] = data.name
    return Promise.resolve({ id, name: data.name })
  })
  return { port: { findByID, update } as unknown as RenamePort, names, findByID, update }
}

describe('renameRecords', () => {
  describe('happy path', () => {
    it('renames each record that still bears its old name, and counts them', async () => {
      const { port, names } = base({ 1: 'Kingdom of Galicia', 2: 'Elsass' })
      const done = await renameRecords(port, 'territories', [
        { id: 1, was: 'Kingdom of Galicia', now: 'royaume de Galice' },
        { id: 2, was: 'Elsass', now: 'Alsace' },
      ])
      expect(done).toBe(2)
      expect(names).toEqual({ 1: 'royaume de Galice', 2: 'Alsace' })
    })

    it('reads and writes the collection it is given, never another', async () => {
      const { port, findByID, update } = base({ 7: 'Raymond of Burgundy' })
      await renameRecords(port, 'people', [
        { id: 7, was: 'Raymond of Burgundy', now: 'Raymond de Bourgogne' },
      ])
      expect(findByID).toHaveBeenCalledWith(
        expect.objectContaining({ collection: 'people', id: 7 })
      )
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'people',
          id: 7,
          data: { name: 'Raymond de Bourgogne' },
        })
      )
    })
  })

  // L2: N/A beyond the collection — it is passed through to Payload, nothing else branches on it.
  // L4: covered below — a read or a write that rejects stops the run, never swallowed.

  describe('edge cases', () => {
    it('renames nothing and asks nothing for an empty list', async () => {
      const { port, update } = base({ 1: 'Elsass' })
      expect(await renameRecords(port, 'territories', [])).toBe(0)
      expect(update).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('leaves a record whose name has changed since, says so, and renames the others', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { port, names, update } = base({ 1: 'royaume de Galice', 2: 'Elsass' })
      const done = await renameRecords(port, 'territories', [
        { id: 1, was: 'Kingdom of Galicia', now: 'royaume de Galice' },
        { id: 2, was: 'Elsass', now: 'Alsace' },
      ])
      expect(done).toBe(1)
      expect(names).toEqual({ 1: 'royaume de Galice', 2: 'Alsace' })
      expect(update).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('[CMS] territories 1 « royaume de Galice »: left as it is')
      warn.mockRestore()
    })

    it('stops at a refusal, the renames before it kept and none after it made', async () => {
      const { port, names } = base(
        { 1: 'Raymond of Burgundy', 2: 'Henry of Burgundy', 3: 'Konrad of Wettin' },
        2
      )
      await expect(
        renameRecords(port, 'people', [
          { id: 1, was: 'Raymond of Burgundy', now: 'Raymond de Bourgogne' },
          { id: 2, was: 'Henry of Burgundy', now: 'Henri de Bourgogne' },
          { id: 3, was: 'Konrad of Wettin', now: 'Conrad de Wettin' },
        ])
      ).rejects.toThrow('refused: 2')
      expect(names).toEqual({
        1: 'Raymond de Bourgogne',
        2: 'Henry of Burgundy',
        3: 'Konrad of Wettin',
      })
    })

    it('stops at a record deleted since, with the error of the read', async () => {
      const { port } = base({})
      await expect(
        renameRecords(port, 'people', [
          { id: 9, was: 'Otto II the Black', now: 'Otton II le Noir' },
        ])
      ).rejects.toThrow('Not Found: 9')
    })
  })
})
