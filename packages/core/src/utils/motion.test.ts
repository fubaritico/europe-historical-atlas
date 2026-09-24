// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { prefersReducedMotion } from './motion'

/** Replace `matchMedia` with one that answers a fixed verdict, and report what it was asked. */
function stubMatchMedia(matches: boolean): ReturnType<typeof vi.fn> {
  const query = vi.fn((q: string) => ({ matches, media: q }) as unknown as MediaQueryList)
  vi.stubGlobal('matchMedia', query)
  return query
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('prefersReducedMotion', () => {
  describe('happy path', () => {
    it('reports the preference when the system asks for reduced motion', () => {
      stubMatchMedia(true)
      expect(prefersReducedMotion()).toBe(true)
    })
  })

  describe('variants', () => {
    it('reports no preference when the system does not ask for it', () => {
      stubMatchMedia(false)
      expect(prefersReducedMotion()).toBe(false)
    })

    it('asks the reduced-motion query and no other', () => {
      const query = stubMatchMedia(true)
      prefersReducedMotion()
      expect(query).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    })
  })

  describe('managed errors', () => {
    it('answers no rather than throwing where matchMedia is absent', () => {
      // A bare jsdom has no `matchMedia`, and this is the guard a hand-copied version tends to drop.
      vi.stubGlobal('matchMedia', undefined)
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing matchMedia surface its error instead of swallowing it', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => {
          throw new Error('media engine gone')
        })
      )
      expect(() => prefersReducedMotion()).toThrow('media engine gone')
    })
  })

  describe('edge cases', () => {
    it('asks again on every call rather than caching the first answer', () => {
      // The setting can change mid-session, and a cached verdict would leave the map animating for
      // someone who has just asked it to stop.
      stubMatchMedia(false)
      expect(prefersReducedMotion()).toBe(false)
      stubMatchMedia(true)
      expect(prefersReducedMotion()).toBe(true)
    })
  })
})
