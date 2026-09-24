import { describe, expect, it } from 'vitest'

import { COMPUTE_PHASE_LABELS } from './computeLabels'

import type { ComputePhase } from '@europe-historical-atlas/core/pipeline/mapCompute'

/** Every phase the protocol declares, listed here so a new one has to be labelled deliberately. */
const PHASES: ComputePhase[] = ['rasterise', 'expand', 'colours', 'bake', 'borders']

describe('COMPUTE_PHASE_LABELS', () => {
  describe('happy path', () => {
    it('labels every phase', () => {
      for (const phase of PHASES) expect(COMPUTE_PHASE_LABELS[phase]).toBeTruthy()
    })
  })

  describe('variants', () => {
    it('gives each phase its own wording, so the bar never appears stuck', () => {
      const labels = PHASES.map((phase) => COMPUTE_PHASE_LABELS[phase])
      expect(new Set(labels).size).toBe(PHASES.length)
    })
  })

  // L3/L4: N/A — a constant table. A phase without a label fails type-check, not at runtime.

  describe('edge cases', () => {
    it('covers exactly the declared phases, with nothing left over', () => {
      expect(Object.keys(COMPUTE_PHASE_LABELS).sort()).toEqual([...PHASES].sort())
    })
  })
})
