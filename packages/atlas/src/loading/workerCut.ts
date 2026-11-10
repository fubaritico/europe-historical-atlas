/**
 * What the worker prepares for a year, in a file of its own so the pipeline's context and its stages can both name it
 * (ATLAS-396): the stages build it, the context's register of years computed ahead holds it.
 */

import type { MeasuredTribes } from '../scene/political/tribes/mapTribeLayer'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { FillArrays } from '@europe-historical-atlas/core/pipeline/fillBuffers'
import type { FillGrid } from '@europe-historical-atlas/core/pipeline/fillTriangles'
import type { SettledYear } from '@europe-historical-atlas/core/pipeline/settleYear'

/** A year prepared in the worker: its fills laid, its tribes measured, the year settled, and the grid they lie on. */
export interface WorkerCut {
  /** The relief's subdivision. */
  readonly grid: FillGrid
  /** Its fills laid on the relief, in the settled tints — arrays ready to be wrapped (ATLAS-396). */
  readonly fillArrays: FillArrays
  /** The relief they were laid on — read with its heights, before the wait (reviews QUAL-001, ARCH-001). */
  readonly relief: object
  /** The tribes' patches, measured in the worker too, with their settings; `null` for a year with no tribe. */
  readonly tribes: MeasuredTribes | null
  /** Its colours, tints by level, exact lines and tribes. */
  readonly settled: SettledYear
}

/** A year computed ahead (ATLAS-396): its polities as read, and what the worker prepared for them. */
export interface AheadYear {
  /** The year's polities — the very object the cut was keyed by, so laying it recuts nothing. */
  readonly loaded: RegionSet
  /** What the worker prepared for them; `null` when nothing could be — a year the texture carries, no relief yet. */
  readonly cut: WorkerCut | null
  /** The settings and relief it was computed under (`MapLayers.yearStamp`), checked again before it is laid. */
  readonly stamp: string
}

/**
 * A year's read that failed while computing ahead, kept apart from a compute that failed: the first is qualified as any
 * load (the network is tried again), the second is a defect (ATLAS-396).
 */
export class AheadReadFailure extends Error {
  /**
   * @param cause - what the read threw, kept as the error's `cause`
   */
  constructor(cause: unknown) {
    super('the year could not be read ahead', { cause })
    this.name = 'AheadReadFailure'
  }
}
