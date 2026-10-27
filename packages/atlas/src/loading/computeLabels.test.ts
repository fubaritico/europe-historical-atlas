import { describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { LOCALES } from '@europe-historical-atlas/core/i18n/locale'

import { ATLAS_MESSAGES } from '../i18n'

import { COMPUTE_PHASE_MESSAGES } from './computeLabels'

import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** Every phase the protocol declares, listed here so a new one has to be labelled deliberately. */
const PHASES: ComputePhase[] = ['rasterise', 'expand', 'colours', 'bake', 'borders']

describe('COMPUTE_PHASE_MESSAGES', () => {
  describe('happy path', () => {
    it.each(LOCALES)('labels every phase in %s', (locale) => {
      const translate = createTranslator(ATLAS_MESSAGES, locale)
      for (const phase of PHASES) expect(translate(COMPUTE_PHASE_MESSAGES[phase])).toBeTruthy()
    })
  })

  describe('variants', () => {
    it.each(LOCALES)(
      'gives each phase its own wording in %s, so the bar never appears stuck',
      (locale) => {
        const translate = createTranslator(ATLAS_MESSAGES, locale)
        const labels = PHASES.map((phase) => translate(COMPUTE_PHASE_MESSAGES[phase]))
        expect(new Set(labels).size).toBe(PHASES.length)
      }
    )
  })

  // L3/L4: N/A — a constant table. A phase without a message fails type-check, not at runtime.

  describe('edge cases', () => {
    it('covers exactly the declared phases, with nothing left over', () => {
      expect(Object.keys(COMPUTE_PHASE_MESSAGES).sort()).toEqual([...PHASES].sort())
    })
  })
})
