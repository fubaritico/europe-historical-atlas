// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createErrorNet } from './errorNet'

import type { Notice } from './notice'

describe('createErrorNet', () => {
  let shown: Notice[]
  let target: EventTarget

  beforeEach(() => {
    shown = []
    target = new EventTarget()
  })

  const net = (): ReturnType<typeof createErrorNet> =>
    createErrorNet({ show: (n) => shown.push(n), target, title: 'Une erreur' })

  describe('happy path', () => {
    it('posts a blocking notice when nothing else caught the error', () => {
      net()
      const event = new Event('error') as Event & { error?: unknown; message?: string }
      event.error = new Error('boom')
      target.dispatchEvent(event)

      expect(shown).toHaveLength(1)
      expect(shown[0]?.severity).toBe('blocking')
      expect(shown[0]?.detail).toContain('boom')
    })

    it('catches a rejection nobody handled', () => {
      net()
      const event = new Event('unhandledrejection') as Event & { reason?: unknown }
      event.reason = new Error('no handler')
      target.dispatchEvent(event)

      expect(shown[0]?.detail).toContain('no handler')
    })
  })

  describe('variants', () => {
    it('takes a string reason as-is', () => {
      net()
      const event = new Event('unhandledrejection') as Event & { reason?: unknown }
      event.reason = 'plain string'
      target.dispatchEvent(event)

      expect(shown[0]?.detail).toBe('plain string')
    })

    it('lets the caller choose the headline', () => {
      createErrorNet({ show: (n) => shown.push(n), target, title: 'Oups' })
      target.dispatchEvent(new Event('error'))

      expect(shown[0]?.title).toBe('Oups')
    })
  })

  // L3 (managed errors): the headline's wording — vague about a cause nobody knows — is the catalogue's,
  // and messages.test.ts checks it in both languages.

  describe('unmanaged errors', () => {
    it('still posts when there is nothing to describe', () => {
      net()
      target.dispatchEvent(new Event('error'))

      expect(shown).toHaveLength(1)
      expect(shown[0]?.detail).toBeUndefined()
    })

    it('survives a reason that is neither an Error nor a string', () => {
      net()
      const event = new Event('unhandledrejection') as Event & { reason?: unknown }
      event.reason = { weird: true }
      expect(() => target.dispatchEvent(event)).not.toThrow()
      expect(shown[0]?.detail).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('stops listening once disposed', () => {
      const mounted = net()
      mounted.dispose()
      target.dispatchEvent(new Event('error'))

      expect(shown).toHaveLength(0)
    })

    it('defaults to the real window when no target is injected', () => {
      const add = vi.spyOn(window, 'addEventListener')
      const mounted = createErrorNet({ show: () => undefined, title: 'Une erreur' })
      expect(add).toHaveBeenCalledWith('error', expect.any(Function))
      mounted.dispose()
      add.mockRestore()
    })
  })
})
