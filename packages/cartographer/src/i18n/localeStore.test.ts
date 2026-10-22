import { describe, expect, it, vi } from 'vitest'

import { createLocaleStore } from './localeStore'

describe('createLocaleStore', () => {
  describe('happy path', () => {
    it('holds the language it starts in', () => {
      expect(createLocaleStore('fr').get()).toBe('fr')
    })
  })

  describe('variants', () => {
    it('speaks another language once set, and tells its listeners', () => {
      const store = createLocaleStore('fr')
      const heard = vi.fn()
      store.subscribe(heard)
      store.set('en')
      expect(store.get()).toBe('en')
      expect(heard).toHaveBeenCalledOnce()
    })
  })

  describe('edge cases', () => {
    it('tells nobody when the language is set to the one it already speaks', () => {
      const store = createLocaleStore('fr')
      const heard = vi.fn()
      store.subscribe(heard)
      store.set('fr')
      expect(heard).not.toHaveBeenCalled()
    })

    it('stops telling a listener that unsubscribed', () => {
      const store = createLocaleStore('fr')
      const heard = vi.fn()
      store.subscribe(heard)()
      store.set('en')
      expect(heard).not.toHaveBeenCalled()
    })
  })

  // L3/L4: N/A — a value and its listeners, nothing refused or thrown.
})
