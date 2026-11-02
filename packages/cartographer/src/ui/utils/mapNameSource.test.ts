import { describe, expect, it, vi } from 'vitest'

import { createMapNameStore } from './mapNameSource'

describe('createMapNameStore', () => {
  it('holds the map the page opened', () => {
    expect(createMapNameStore('1100').get()).toBe('1100')
  })

  it('tells its listeners when the map changes', () => {
    const store = createMapNameStore('1100')
    const listener = vi.fn()
    store.subscribe(listener)
    store.set('1100-essai')
    expect([store.get(), listener.mock.calls.length]).toEqual(['1100-essai', 1])
  })

  it('tells nobody when the name set is the one held', () => {
    const store = createMapNameStore('1100')
    const listener = vi.fn()
    store.subscribe(listener)
    store.set('1100')
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops telling a listener that unsubscribed', () => {
    const store = createMapNameStore('1100')
    const listener = vi.fn()
    store.subscribe(listener)()
    store.set('1200')
    expect(listener).not.toHaveBeenCalled()
  })
})
