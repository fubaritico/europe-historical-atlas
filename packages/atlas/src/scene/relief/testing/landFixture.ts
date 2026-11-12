/**
 * A land mask on the GPU for the tint layers' tests: four cells, all land, so nothing a test lays is cut by the coast.
 */

import { createLandMask } from '@europe-historical-atlas/core/data/landMask'

import { createLandTextures } from '../landTextures'

import type { LandTextures } from '../landTextures'

/**
 * Land everywhere.
 * @returns the mask's two halves, every cell land
 */
export const allLand = (): LandTextures =>
  createLandTextures(
    createLandMask(
      {
        width: 2,
        height: 2,
        scale: 1,
        bbox: { west: 0, south: 0, east: 1, north: 1 },
        source: 'test',
      },
      () => true
    )
  )
