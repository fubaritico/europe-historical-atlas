import { fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { PolityList } from './PolityList'

import type { PolityListProps } from './PolityList'
import type { PolityRow } from '../../utils/polityRows'

/**
 * The list with its filter's text held as the store holds it.
 * @param props - the list's props, the filter's text left out
 * @returns the list
 */
function TypedPolityList(props: Omit<PolityListProps, 'search'>) {
  // State
  const search = useState('')

  // Render
  return <PolityList {...props} search={search} />
}

/**
 * A row of the list, its name its id.
 * @param id - its polity
 * @returns the row
 */
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
    wikidata: null,
  }
}

/** Three rows, each 20 pixels high from the top of the page: barcelona 0–20, toulouse 20–40, aragon 40–60. */
const ROWS = [row('barcelona'), row('toulouse'), row('aragon')]

/**
 * The list, its rows laid out 20 pixels apart, the page answering which row lies under a point.
 * @returns the callbacks the list reports to
 */
function setUp() {
  const onRestack = vi.fn()
  const onChoose = vi.fn()
  renderInEnglish(
    <TypedPolityList
      year={1100}
      rows={ROWS}
      targetId={null}
      onChoose={onChoose}
      onMenu={vi.fn()}
      onRestack={onRestack}
      onEdit={vi.fn()}
    />
  )
  const options = screen.getAllByRole('option')
  options.forEach((option, index) => {
    option.getBoundingClientRect = () => new DOMRect(0, index * 20, 200, 20)
  })
  // jsdom lays nothing out: the row under a point is read from the boxes above
  document.elementFromPoint = (_x: number, y: number) => options[Math.floor(y / 20)] ?? null
  return { onRestack, onChoose, options }
}

/**
 * Press on a row, move, release — a drag from one point to another.
 * @param from - the row pressed
 * @param toY - where the pointer is released, in viewport pixels
 */
function drag(from: HTMLElement, toY: number): void {
  const fromY = from.getBoundingClientRect().top + 10
  fireEvent.pointerDown(from, { button: 0, clientX: 50, clientY: fromY })
  fireEvent.pointerMove(window, { clientX: 50, clientY: toY })
  fireEvent.pointerUp(window, { clientX: 50, clientY: toY })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-457, the dev, 2026-11-16: press on « County of Barcelona » and move it up, rather than through the menu
describe('PolityList — a row dragged', () => {
  describe('happy path', () => {
    it('drops aragon in front of barcelona, released on the upper half of barcelona', () => {
      const { onRestack, options } = setUp()
      const aragon = options[2]
      if (aragon === undefined) throw new Error('fixture: no aragon')
      drag(aragon, 5)
      expect(onRestack).toHaveBeenCalledWith('aragon', 'barcelona', 'front')
    })
  })

  describe('variants', () => {
    it('drops barcelona behind aragon, released on the lower half of aragon', () => {
      const { onRestack, options } = setUp()
      const barcelona = options[0]
      if (barcelona === undefined) throw new Error('fixture: no barcelona')
      drag(barcelona, 55)
      expect(onRestack).toHaveBeenCalledWith('barcelona', 'aragon', 'back')
    })

    it('marks the row it would land on, with the side, while dragging', () => {
      const { options } = setUp()
      const [barcelona, toulouse] = options
      if (barcelona === undefined || toulouse === undefined) throw new Error('fixture: rows')
      fireEvent.pointerDown(barcelona, { button: 0, clientX: 50, clientY: 10 })
      fireEvent.pointerMove(window, { clientX: 50, clientY: 35 })
      expect(toulouse.getAttribute('data-drop')).toBe('back')
      fireEvent.pointerUp(window, { clientX: 50, clientY: 35 })
      expect(toulouse.getAttribute('data-drop')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('marks no line on a row of another suzerain — a drop there is refused', () => {
      renderInEnglish(
        <TypedPolityList
          year={1100}
          rows={[
            row('france'),
            { ...row('anjou'), depth: 1, suzerainName: 'france' },
            row('empire'),
          ]}
          targetId={null}
          onChoose={vi.fn()}
          onMenu={vi.fn()}
          onRestack={vi.fn()}
          onEdit={vi.fn()}
        />
      )
      const options = screen.getAllByRole('option')
      options.forEach((option, index) => {
        option.getBoundingClientRect = () => new DOMRect(0, index * 20, 200, 20)
      })
      document.elementFromPoint = (_x: number, y: number) => options[Math.floor(y / 20)] ?? null
      const [, anjou, empire] = options
      if (anjou === undefined || empire === undefined) throw new Error('fixture: rows')
      fireEvent.pointerDown(anjou, { button: 0, clientX: 50, clientY: 30 })
      fireEvent.pointerMove(window, { clientX: 50, clientY: 45 })
      expect(empire.getAttribute('data-drop')).toBeNull()
      fireEvent.keyDown(window, { key: 'Escape' })
    })

    it('drops nothing on ‹escape›', () => {
      const { onRestack, options } = setUp()
      const aragon = options[2]
      if (aragon === undefined) throw new Error('fixture: no aragon')
      fireEvent.pointerDown(aragon, { button: 0, clientX: 50, clientY: 50 })
      fireEvent.pointerMove(window, { clientX: 50, clientY: 5 })
      fireEvent.keyDown(window, { key: 'Escape' })
      fireEvent.pointerUp(window, { clientX: 50, clientY: 5 })
      expect(onRestack).not.toHaveBeenCalled()
    })

    it('chooses a row by the next click after a drag cancelled by ‹escape›', () => {
      const { onChoose, options } = setUp()
      const [barcelona, , aragon] = options
      if (barcelona === undefined || aragon === undefined) throw new Error('fixture: rows')
      fireEvent.pointerDown(aragon, { button: 0, clientX: 50, clientY: 50 })
      fireEvent.pointerMove(window, { clientX: 50, clientY: 5 })
      fireEvent.keyDown(window, { key: 'Escape' })
      fireEvent.click(barcelona)
      expect(onChoose).toHaveBeenCalledWith('barcelona')
    })

    it('drops nothing off the rows, and says so in the console', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { onRestack, options } = setUp()
      const aragon = options[2]
      if (aragon === undefined) throw new Error('fixture: no aragon')
      drag(aragon, 500)
      expect(onRestack).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — the drop's decision (siblings, history) is the panel's and core's, tested there

  describe('edge cases', () => {
    it('chooses the row on a plain click — a press that never went 4 pixels away', () => {
      const { onRestack, onChoose, options } = setUp()
      const toulouse = options[1]
      if (toulouse === undefined) throw new Error('fixture: no toulouse')
      fireEvent.pointerDown(toulouse, { button: 0, clientX: 50, clientY: 30 })
      fireEvent.pointerMove(window, { clientX: 52, clientY: 31 })
      fireEvent.pointerUp(window, { clientX: 52, clientY: 31 })
      fireEvent.click(toulouse)
      expect(onChoose).toHaveBeenCalledWith('toulouse')
      expect(onRestack).not.toHaveBeenCalled()
    })

    it('does not choose the row a drag is released on', () => {
      const { onChoose, options } = setUp()
      const aragon = options[2]
      if (aragon === undefined) throw new Error('fixture: no aragon')
      drag(aragon, 5)
      fireEvent.click(aragon)
      expect(onChoose).not.toHaveBeenCalled()
    })
  })
})
