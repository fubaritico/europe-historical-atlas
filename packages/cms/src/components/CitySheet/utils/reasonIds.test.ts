import { afterEach, describe, expect, it, vi } from 'vitest'

import { reasonIds } from './reasonIds'

/** The CMS's reasons, with SQLite's number ids. */
const REASONS = [
  { id: 1, name: 'Pouvoir' },
  { id: 2, name: 'Religion' },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reasonIds', () => {
  describe('happy path', () => {
    it('maps each choice back to its number id', () => {
      expect(reasonIds(['2'], REASONS)).toEqual([2])
    })
  })

  describe('variants', () => {
    it('keeps the order the choices were made in', () => {
      expect(reasonIds(['2', '1'], REASONS)).toEqual([2, 1])
    })

    it('keeps an id written as text, as another base would give it', () => {
      expect(reasonIds(['a1'], [{ id: 'a1', name: 'Port' }])).toEqual(['a1'])
    })
  })

  describe('managed errors', () => {
    it('drops a choice the list does not hold, and says so', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(reasonIds(['1', '9'], REASONS)).toEqual([1])
      expect(error).toHaveBeenCalledWith('[CMS] a reason was chosen that the list does not hold: 9')
    })
  })

  // L4: N/A — two lists in, one out; nothing else can fail.

  describe('edge cases', () => {
    it('answers no id for no choice', () => {
      expect(reasonIds([], REASONS)).toEqual([])
    })
  })
})
