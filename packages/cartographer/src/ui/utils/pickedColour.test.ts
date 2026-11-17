import { afterEach, describe, expect, it, vi } from 'vitest'

import { pickedColour } from './pickedColour'

const RED = { h: 0, s: 80, v: 70, a: 1 }

describe('pickedColour', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('hands back a red picked as it is', () => {
      expect(pickedColour(RED)).toBe(RED)
    })
  })

  describe('variants', () => {
    it('hands back « automatic » as null', () => {
      expect(pickedColour(null)).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('refuses « no colour », which no picker here offers, and says it in the console', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(pickedColour('none')).toBeUndefined()
      expect(error).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — the type admits no other value. L5: N/A — three values, each above.
})
