import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { PolityList } from './PolityList'

import type { PolityRow } from '../../utils/polityRows'

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A row of the list, 20 pixels high, at its place in the list. */
function row(id: string): PolityRow {
  return {
    id,
    name: id,
    rank: '',
    dates: '',
    colour: '#888888',
    hasTerritory: true,
    depth: 0,
    suzerainName: null,
  }
}

const ROWS = Array.from({ length: 100 }, (_, index) => row(`p${String(index)}`))

/**
 * The list laid out as a browser would: each row 20 pixels high at its place, the list 200 pixels high and
 * scrolled to the top — jsdom lays nothing out — and its `scrollTo` recorded.
 */
function laidOut(): ReturnType<typeof vi.fn> {
  const list = screen.getByRole('listbox')
  const scrollTo = vi.fn()
  Object.assign(list, { scrollTo })
  Object.defineProperty(list, 'clientHeight', { value: 200, configurable: true })
  Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true, writable: true })
  screen.getAllByRole('option').forEach((option, index) => {
    Object.defineProperty(option, 'offsetTop', { value: index * 20, configurable: true })
    Object.defineProperty(option, 'offsetHeight', { value: 20, configurable: true })
  })
  return scrollTo
}

/** The system's reduced-motion setting. */
function motion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }))
}

/** The list over the hundred rows, aimed at one. */
function list(targetId: string | null) {
  return (
    <PolityList
      year={1100}
      rows={ROWS}
      targetId={targetId}
      onChoose={vi.fn()}
      onMenu={vi.fn()}
      onEdit={vi.fn()}
    />
  )
}

describe('PolityList — the target brought into view (the dev, 2026-10-14)', () => {
  describe('happy path', () => {
    it('scrolls smoothly to centre the target’s row when it is out of view', () => {
      motion(false)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('p50'))
      expect(scrollTo).toHaveBeenCalledWith({ top: 910, behavior: 'smooth' })
    })
  })

  describe('variants', () => {
    it('scrolls at once when the system asks for less motion', () => {
      motion(true)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('p50'))
      expect(scrollTo).toHaveBeenCalledWith({ top: 910, behavior: 'auto' })
    })

    // A row clicked in the list is in view: it must not move under the pointer.
    it('leaves the list where it is when the target’s row is already in view', () => {
      motion(false)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('p3'))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })

  // L3: N/A — nothing is refused.

  describe('unmanaged errors', () => {
    // A target an undo took away from the document has no row: nothing to bring into view.
    it('does nothing for a target that has no row', () => {
      motion(false)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('gone'))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('does not scroll when the target is cleared', () => {
      motion(false)
      const { rerender } = renderInEnglish(list('p3'))
      const scrollTo = laidOut()
      rerender(list(null))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })
})
