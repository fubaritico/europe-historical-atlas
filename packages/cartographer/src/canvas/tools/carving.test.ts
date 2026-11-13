import { describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CANVAS_MESSAGES } from '../i18n'
import { testPolity } from '../testGestureContext'

import { carvedReport } from './carving'

const POLITIES = [testPolity('fr', 'Kingdom of France')]
const EN = createTranslator(CANVAS_MESSAGES, 'en')

describe('carvedReport', () => {
  it('names the suzerain whose own domain was carved', () => {
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 0, rings: 2 }, EN)).toBe(
      "carved out of Kingdom of France's own domain"
    )
  })

  it('counts the anchors placed where the limits cross', () => {
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 2, rings: 1 }, EN)).toBe(
      "carved out of Kingdom of France's own domain, 2 anchors placed where the limits cross"
    )
  })

  it('says "anchor" for one crossing', () => {
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 1, rings: 1 }, EN)).toContain(
      '1 anchor placed'
    )
  })

  it('says it in French on a French page, the name after a dash', () => {
    const french = createTranslator(CANVAS_MESSAGES, 'fr')
    expect(carvedReport(POLITIES, { suzerain: 'fr', crossings: 1, rings: 1 }, french)).toBe(
      'découpé dans le domaine propre de son suzerain — Kingdom of France, 1 ancre posée où les limites se croisent'
    )
  })

  // CORE-426: closed in front, the outline names whose ground it took.
  it('names every polity a closing in front took ground from', () => {
    const polities = [...POLITIES, testPolity('anjou', 'County of Anjou')]
    const carving = { suzerain: 'fr', crossings: 0, rings: 1, taken: ['fr', 'anjou'] }
    expect(carvedReport(polities, carving, EN)).toBe(
      'took the ground of Kingdom of France, County of Anjou'
    )
  })

  it('shows the id of a suzerain the registry lacks rather than nothing', () => {
    expect(carvedReport([], { suzerain: 'fr', crossings: 0, rings: 1 }, EN)).toBe(
      "carved out of fr's own domain"
    )
  })
})
