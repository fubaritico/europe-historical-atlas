import { describe, expect, it } from 'vitest'

import { levelOpacity } from './homageReveal'

describe('levelOpacity', () => {
  it('shows level 0 at every detail', () => {
    expect(levelOpacity(0, 0)).toBe(1)
  })

  it('follows the share of its level the detail has reached', () => {
    expect(levelOpacity(0, 1)).toBe(0)
    expect(levelOpacity(0.5, 1)).toBe(0.5)
    expect(levelOpacity(1, 1)).toBe(1)
    expect(levelOpacity(1.25, 2)).toBe(0.25)
    expect(levelOpacity(3, 2)).toBe(1)
  })
})
