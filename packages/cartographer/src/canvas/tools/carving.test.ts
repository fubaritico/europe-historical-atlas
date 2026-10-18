import { describe, expect, it } from 'vitest'

import { testPolity } from '../testGestureContext'

import { carvedReport } from './carving'

const POLITIES = [testPolity('fr', 'Kingdom of France')]

describe('carvedReport', () => {
  it('names the suzerain whose own domain was carved', () => {
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 0, rings: 2 })).toBe(
      "carved out of Kingdom of France's own domain"
    )
  })

  it('counts the anchors placed where the limits cross', () => {
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 2, rings: 1 })).toBe(
      "carved out of Kingdom of France's own domain, 2 anchors placed where the limits cross"
    )
  })

  it('says "anchor" for one crossing', () => {
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 1, rings: 1 })).toContain(
      '1 anchor placed'
    )
  })

  it('shows the id of a suzerain the registry lacks rather than nothing', () => {
    expect(carvedReport([], { suzerain: 'fr', crossings: 0, rings: 1 })).toBe(
      "carved out of fr's own domain"
    )
  })
})
