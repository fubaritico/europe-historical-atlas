/**
 * The borders' test fixtures: derived borders of each kind, a stroke style, a flat projection, a pass's live values
 * read back.
 */

import { run } from '../../../lines/testing/lineFixtures'

import type { BorderStrokeStyle } from '../borderStrokes'
import type { ComposedLineLayer } from '../composedLineLayer'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionBorders'

/**
 * Derived borders with whichever kinds the test needs, all under one pair.
 * @param between - how many runs between the two polities
 * @param frontier - how many runs of frontier against unclaimed land
 * @returns the borders
 */
export function borders(between: number, frontier: number): RegionBorders {
  return {
    between:
      between === 0
        ? []
        : [{ pair: [0, 1], lines: Array.from({ length: between }, (_, i) => run(i / 10)) }],
    frontier: Array.from({ length: frontier }, (_, i) => run(0.5 + i / 10)),
  }
}

/** A stroke style with every pass distinct: a wide dark edging, a narrow light core, a faint frontier, a parchment afar. */
export const STYLE: BorderStrokeStyle = {
  coreColor: '#ffffff',
  coreWidth: 1.4,
  edgeColor: '#000000',
  edgeWidth: 3.2,
  opacity: 0.9,
  showFrontier: true,
  frontierColor: '#888888',
  frontierWidth: 1,
  frontierOpacity: 0.45,
  parchmentColor: '#eeeeee',
  farWidth: 2,
  frontierFarWidth: 0.8,
  frontierSideGap: 0.01,
  frontierSideWidth: 1.2,
  frontierFadeShare: 0.5,
  vassalColor: '#fafafa',
  vassalWidth: 0.6,
  vassalDotSize: 0.7,
  vassalDotGap: 1.3,
  dashSize: 0.03,
  gapSize: 0.024,
  doubleGap: 0.002,
}

/**
 * Project a grid coordinate onto a flat plane — the collaborator, mocked.
 * @param u - west→east
 * @param v - north→south
 * @returns the point on the plane
 */
export const project = (u: number, v: number): [number, number, number] => [u, 0, v]

/**
 * The live material property named on each pass — what the zoom link actually drives.
 * @param layer - the composed layer
 * @param property - the material property to read
 * @returns its value on each pass
 */
export function liveValues(
  layer: ComposedLineLayer,
  property: 'linewidth' | 'opacity' | 'dashScale' | 'dashSize' | 'gapSize'
): number[] {
  return layer.object.children.map((child: object) => {
    // Fat lines carry a LineMaterial; reading it back is the only way to prove the setter reached it.
    const { material } = child as unknown as { material: Record<string, number> }
    return material[property] ?? Number.NaN
  })
}
