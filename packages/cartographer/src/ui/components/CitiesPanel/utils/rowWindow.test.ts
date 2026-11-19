import { describe, expect, it } from 'vitest'

import chrome from '../../../styles/editor-chrome.css?raw'

import { CITY_ROW_HEIGHT, rowWindow } from './rowWindow'

/** A list of rows 24 px tall, in a view of 240 px — ten rows — with five drawn beyond it on each side. */
const LIST = { rowHeight: 24, viewHeight: 240, beyond: 5 }

// CARTO-485: thirteen thousand cities listed, only the rows in view drawn.
describe('rowWindow', () => {
  describe('happy path', () => {
    it('draws, of 13 594 rows scrolled to the 1 000th, the eleven in view and five either side', () => {
      expect(rowWindow({ ...LIST, count: 13594, firstInView: 1000 })).toEqual({
        first: 995,
        end: 1016,
        before: 995 * 24,
        after: (13594 - 1016) * 24,
      })
    })

    it('keeps the list’s whole height: the two gaps and the rows drawn add up to every row', () => {
      const { first, end, before, after } = rowWindow({ ...LIST, count: 13594, firstInView: 1000 })
      expect(before + (end - first) * 24 + after).toBe(13594 * 24)
    })
  })

  describe('variants', () => {
    it('draws from the first row, with no gap above, at the top of the list', () => {
      expect(rowWindow({ ...LIST, count: 13594, firstInView: 0 })).toMatchObject({
        first: 0,
        end: 16,
        before: 0,
      })
    })

    it('draws to the last row, with no gap below, at the bottom of the list', () => {
      expect(rowWindow({ ...LIST, count: 13594, firstInView: 13584 })).toMatchObject({
        end: 13594,
        after: 0,
      })
    })

    it('draws every row of a list shorter than the view, with no gap', () => {
      expect(rowWindow({ ...LIST, count: 3, firstInView: 0 })).toEqual({
        first: 0,
        end: 3,
        before: 0,
        after: 0,
      })
    })
  })

  describe('managed errors', () => {
    // The filters took the rows away while the list was scrolled far: the browser has not yet said its new scroll.
    it('draws the last rows, never none, for a list scrolled past its end', () => {
      expect(rowWindow({ ...LIST, count: 40, firstInView: 5000 })).toEqual({
        first: 24,
        end: 40,
        before: 24 * 24,
        after: 0,
      })
    })
  })

  // L4: N/A — arithmetic over numbers the hook reads from the page.

  describe('edge cases', () => {
    it('draws nothing, with no gap, for an empty list', () => {
      expect(rowWindow({ ...LIST, count: 0, firstInView: 0 })).toEqual({
        first: 0,
        end: 0,
        before: 0,
        after: 0,
      })
    })

    // jsdom, and a panel not laid out yet, report a height of zero.
    it('draws the first row and those beyond the view while the list has no height', () => {
      expect(
        rowWindow({ count: 13594, rowHeight: 24, firstInView: 0, viewHeight: 0, beyond: 5 })
      ).toMatchObject({ first: 0, end: 6 })
    })

    it('draws a row cut by the bottom edge of a view that holds ten rows and a half', () => {
      const { end } = rowWindow({
        ...LIST,
        viewHeight: 252,
        count: 13594,
        firstInView: 100,
        beyond: 0,
      })
      expect(end).toBe(112)
    })
  })
})

describe('CITY_ROW_HEIGHT', () => {
  it('is the height the stylesheet gives a row', () => {
    const height = /\n\.layer-row \{[^}]*?\n {2}height: (\d+)px;/.exec(chrome)?.[1]
    expect(height).toBe(String(CITY_ROW_HEIGHT))
  })
})
