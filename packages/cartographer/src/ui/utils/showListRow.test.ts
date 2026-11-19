import { afterEach, describe, expect, it, vi } from 'vitest'

import { showListRow } from './showListRow'

/**
 * A list 240 px tall, scrolled to a place, that writes down where it is asked to scroll.
 * @param scrollTop - how far it is scrolled
 * @returns the list and its `scrollTo`
 */
function listAt(scrollTop: number) {
  const list = document.createElement('ul')
  Object.defineProperty(list, 'clientHeight', { value: 240 })
  list.scrollTop = scrollTop
  const scrollTo = vi.fn()
  list.scrollTo = scrollTo
  return { list, scrollTo }
}

/**
 * Make the system ask for less motion, or not.
 * @param reduced - whether it asks
 */
function motion(reduced: boolean): void {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// CARTO-485: a row shown by its place, drawn or not.
describe('showListRow', () => {
  describe('happy path', () => {
    it('scrolls smoothly so the 1 000th row sits in the middle of the list', () => {
      motion(false)
      const { list, scrollTo } = listAt(0)
      showListRow(list, { top: 24000, height: 24 })
      expect(scrollTo).toHaveBeenCalledWith({ top: 24000 - (240 - 24) / 2, behavior: 'smooth' })
    })
  })

  describe('variants', () => {
    it('scrolls at once when the system asks for less motion', () => {
      motion(true)
      const { list, scrollTo } = listAt(0)
      showListRow(list, { top: 24000, height: 24 })
      expect(scrollTo).toHaveBeenCalledWith({ top: 24000 - (240 - 24) / 2, behavior: 'auto' })
    })

    it('scrolls back up to a row above the view', () => {
      motion(false)
      const { list, scrollTo } = listAt(24000)
      showListRow(list, { top: 48, height: 24 })
      expect(scrollTo).toHaveBeenCalledWith({ top: 48 - (240 - 24) / 2, behavior: 'smooth' })
    })
  })

  // L3, L4: N/A — the list is handed in, nothing is looked up.

  describe('edge cases', () => {
    it('leaves the list where it is when the row is already wholly in view', () => {
      motion(false)
      const { list, scrollTo } = listAt(23900)
      showListRow(list, { top: 24000, height: 24 })
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })
})
