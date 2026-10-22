import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { canvasWords } from './canvasWords'
import { featureUnder } from './featureUnder'

import type { FeatureInputs } from './featureUnder'
import type { Point } from '../viewport/viewport'
import type { DerivedBorder } from '@europe-historical-atlas/core/editor/derivedBorders'

// France holds 0 1 2 3, the Empire 1 4 5 2. On screen: France the left square, the Empire the right one,
// the shared edge 1–2 at x = 100.
const ANCHORS: Point[] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
  [200, 0],
  [200, 100],
]

const SHARED: DerivedBorder = {
  run: [1, 2],
  between: ['fr-couronne', 'hre'],
  relation: 'sovereign',
  degree: 0,
  hand: null,
  dressedBy: 'rule',
}

const COAST: DerivedBorder = {
  run: [2, 3, 0, 1],
  between: ['fr-couronne'],
  relation: 'coastline',
  degree: 0,
  hand: null,
  dressedBy: 'rule',
}

/**
 * A ring of the fixture's anchors, on screen.
 * @param indices - the anchors, in order
 * @returns their positions
 */
function ring(indices: readonly number[]): Point[] {
  return indices.map((index) => ANCHORS[index] ?? [Number.NaN, Number.NaN])
}

/**
 * Inputs over the fixture, the pointer and the borders as a test needs them.
 * @param at - the pointer
 * @param borders - the borders to consider
 * @returns the inputs
 */
function inputs(at: Point, borders: readonly DerivedBorder[] = [SHARED, COAST]): FeatureInputs {
  return {
    document: sharedBorderDocument(),
    borders,
    anchors: ANCHORS,
    territories: [
      { polity: 'fr-couronne', rings: [ring([0, 1, 2, 3])] },
      { polity: 'hre', rings: [ring([1, 4, 5, 2])] },
    ],
    at,
    radius: 8,
    words: canvasWords('en'),
  }
}

describe('featureUnder', () => {
  describe('happy path', () => {
    it('names the two polities a border separates, and their relation', () => {
      expect(featureUnder(inputs([103, 50]))).toBe('Reaume de France – Sacrum Imperium · sovereign')
    })
  })

  describe('variants', () => {
    it('names the polity whose fill the pointer is over, with its rank', () => {
      expect(featureUnder(inputs([40, 50]))).toBe('Reaume de France · kingdom')
    })

    it('says "unclaimed ground" for a frontier against nobody', () => {
      const frontier: DerivedBorder = { ...SHARED, between: ['hre'], relation: 'unclaimed' }
      expect(featureUnder(inputs([103, 50], [frontier]))).toBe('Sacrum Imperium · unclaimed ground')
    })
  })

  describe('managed errors', () => {
    it('names nothing over ground nobody holds', () => {
      expect(featureUnder(inputs([400, 400]))).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('falls back on the id for a polity the registry lacks, rather than naming nothing', () => {
      const stranger: DerivedBorder = { ...SHARED, between: ['ghost', 'hre'] }
      expect(featureUnder(inputs([103, 50], [stranger]))).toBe(
        'ghost – Sacrum Imperium · sovereign'
      )
    })
  })

  describe('edge cases', () => {
    it('does not name a coast, which the coastline already says, and names the fill instead', () => {
      expect(featureUnder(inputs([50, 97], [COAST]))).toBe('Reaume de France · kingdom')
    })

    it('names the border, not the fill, when the pointer is on the edge of both', () => {
      expect(featureUnder(inputs([99, 50]))).toContain('· sovereign')
    })
  })
})
