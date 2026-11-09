/**
 * A year's overlaps from the build (ATLAS-399): the file the site holds for it, handed to the settling, which takes it
 * when its key is the year's own — checked in the worker, off the page — and computes them otherwise, ~1.3 s. **The
 * names' rule** (the dev, 2026-11-08), said in the console at each settling: a warning when none is baked (the dev server,
 * a year added since the build) or the file is for another version of the year, an error when it cannot be read — the
 * reader still gets the hatches, a second later.
 */

import type { PipelineContext } from '../pipelineContext'
import type { BakedOverlaps } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'
import type { SettledYear } from '@europe-historical-atlas/core/pipeline/settleYear'

/**
 * The file the build wrote for a year, if the site holds one and it reads.
 * @param context - the pipeline's world, whose assets read the file
 * @param year - the year
 * @returns the file's content, or `null` to compute the overlaps
 */
export async function bakedOverlapsFor(
  context: Pick<PipelineContext, 'assets'>,
  year: number
): Promise<BakedOverlaps | null> {
  try {
    const baked = await context.assets.bakedOverlaps.load(year)
    if (baked === null)
      console.warn(`[atlas] ${String(year)}: no overlaps computed at the build — computed here.`)
    return baked
  } catch (error: unknown) {
    // A file the build wrote wrong, or the transport broke: a defect, said as an error in the console, as for the names.
    console.error(
      `[atlas] ${String(year)}: the overlaps computed at the build cannot be read — computed here.`,
      error
    )
    return null
  }
}

/**
 * Say, once the year is settled, that the build's file was for another version of it — so it was computed again.
 * @param year - the year
 * @param baked - the file handed to the settling, or `null`
 * @param settled - the year settled, which says where its overlaps came from
 */
export function sayStaleOverlaps(
  year: number,
  baked: BakedOverlaps | null,
  settled: Pick<SettledYear, 'overlapsFrom'>
): void {
  if (baked !== null && settled.overlapsFrom === 'computed')
    console.warn(
      `[atlas] ${String(year)}: the overlaps computed at the build are for another version of the year — computed here.`
    )
}
