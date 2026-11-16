import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { CityVerdictLine } from './CityVerdictLine'

import type { CityVerdictKind } from '../../../../canvas/cityVerdict'

/**
 * The verdict's alert, rendered alone.
 * @param kind - the verdict's kind
 * @returns the alert's root
 */
function alertOf(kind: CityVerdictKind): Element | null {
  const { container } = renderInEnglish(<CityVerdictLine kind={kind} text="A sentence." />)
  return container.querySelector('.city-detail__verdict')
}

// The dev, 2026-11-16: a warning in an alert; at the right place, a success
describe('CityVerdictLine', () => {
  describe('happy path', () => {
    it('says a city at the right place in a success alert', () => {
      expect(alertOf('agrees')?.className).toContain('ui-alert--success')
      expect(screen.getByText('A sentence.')).toBeTruthy()
    })
  })

  describe('variants', () => {
    it('says a verdict to correct on the map in a warning', () => {
      expect(alertOf('misplaced')?.className).toContain('ui-alert--warning')
    })

    it('says a chain that stops short in a warning', () => {
      expect(alertOf('incomplete')?.className).toContain('ui-alert--warning')
    })

    it('says a polity to declare in an error', () => {
      expect(alertOf('toDeclare')?.className).toContain('ui-alert--error')
    })

    it('says nothing to compare by in an error', () => {
      expect(alertOf('cannotCompare')?.className).toContain('ui-alert--error')
    })
  })

  // L3, L4: N/A — it shows what it is handed; L5: every kind is above
})
