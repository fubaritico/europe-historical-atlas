/**
 * Which blur the map draws with when nothing else is chosen — the one place that says it, read by the map
 * (`main.ts`) and by the icons' crowd bench, so the bench measures the blur that ships. The standard is the very high
 * quality level (the dev, 2026-10-29: *« notre standard est très haut »*); the quality levels (ATLAS-305) will choose
 * among the methods instead.
 */

import { createSeparateImagesBlur } from './separateImages'

/** The standard blur method: each blur with its own images. */
export const createStandardBlur = createSeparateImagesBlur
