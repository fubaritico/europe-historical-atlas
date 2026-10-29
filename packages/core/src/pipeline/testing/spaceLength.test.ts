import { describe, expect, it } from 'vitest'

import { spaceLength } from './spaceLength'

describe('spaceLength', () => {
  it('gives a band’s length along its axis, a cell counted whole', () => {
    const band = new Uint8Array(62 * 10).map((_, at) => {
      const [x, y] = [at % 62, Math.floor(at / 62)]
      return x >= 1 && x <= 60 && y >= 1 && y <= 8 ? 1 : 0
    })
    expect(spaceLength(band, 62)).toBeCloseTo(60, 6)
  })

  it('gives a slanting band its length along the slant, not across the page', () => {
    const slant = new Uint8Array(40 * 40).map((_, at) => (at % 40 === Math.floor(at / 40) ? 1 : 0))
    expect(spaceLength(slant, 40)).toBeCloseTo(39 * Math.SQRT2 + 1, 6)
  })

  it('gives an empty space no length', () => {
    expect(spaceLength(new Uint8Array(9), 3)).toBe(0)
  })
})
