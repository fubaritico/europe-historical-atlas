/**
 * The accession icon: a crown. An open crown of the West in the 11th and 12th centuries — a jewelled band and its
 * upright fleurs-de-lis, nothing above them — chosen on the map itself among the six of the icons' bench: « H », the
 * dev, 2026-11-17 (ATLAS-287: « beaucoup plus iconique, beaucoup plus emblématique » than « B », the kings' crown with
 * ball points first chosen on the bench that morning). The one crown everywhere until the regional ones are applied;
 * the others are kept on the bench, `bench/crownCandidates.ts`.
 */

import { around, beadedBand, lily, stones } from './crownShapes'

import type { Part } from './parts'

/** How many lilies stand on the band, and how many stones are set in it, one between two lilies. */
const CROWN_LILIES = 8

/** The band's height: where the lilies spring. */
const CROWN_BAND_HEIGHT = 0.18

/** A lily's height above the band. */
const CROWN_LILY_HEIGHT = 0.24

/**
 * A crown: a band between two rows of pearls, a cut stone between two lilies, red and blue in turn, and eight small
 * fleurs-de-lis standing upright on it (the dev, 2026-11-17: « en gardant l'anneau du bas avec les joyaux et les
 * fleurs de lys, mais pas penchée, droite ») — no cap, no arch, no cross.
 * @returns its parts
 */
export function crownParts(): Part[] {
  return [
    ...beadedBand(CROWN_BAND_HEIGHT, 0, 'pearl'),
    ...stones(CROWN_LILIES, CROWN_BAND_HEIGHT / 2, 0.04, Math.PI / CROWN_LILIES),
    ...around(CROWN_LILIES).flatMap((angle) =>
      lily(angle, CROWN_BAND_HEIGHT, CROWN_LILY_HEIGHT, 0)
    ),
  ]
}
