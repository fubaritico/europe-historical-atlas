import type { SnapLayer } from './toolSession'
import type { SnapLine } from '../../geometry/lineSnap'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'

/**
 * What the Pen needs of a snap layer, in one record — the lines it follows, what they were drawn from,
 * and how a sentence names them. **One table, not one switch per question** (session review ARCH-001):
 * a third layer is one more entry here, and nothing else learns its name.
 */
export interface SnapLayerSpec {
  /** Its lines, in backdrop pixels. */
  lines: readonly SnapLine[]
  /** What they were drawn from, recorded on every anchor snapped onto one. */
  provenance: Provenance
  /** The layer in a sentence — *"no coastline within reach"*, *"no river within reach"*. */
  noun: string
  /**
   * One line in a sentence — *"Following the coastline"*, *"Following the Maas"* — by its index.
   * @param line - the line's index in `lines`
   * @returns its name
   */
  label: (line: number) => string
}

/** A river centreline, as the Pen follows it: a line of the layer, and the name the bar reads. */
export interface RiverLine extends SnapLine {
  /** The river's name as the dataset holds it — `Maas`, not *Meuse* (`H-02`) — or `null`. */
  name: string | null
}

/** What the table is built from — the vector layers' shape, declared here so a test needs no rank. */
export interface SnapSources {
  /** The coast's contours. */
  coast: readonly SnapLine[]
  /** What the coast was traced from. */
  coastProvenance: Provenance
  /** The rivers' centrelines. */
  rivers: readonly RiverLine[]
  /** What the rivers were drawn from. */
  riverProvenance: Provenance
}

/** Every snap layer, by name. */
export type SnapLayers = Record<SnapLayer, SnapLayerSpec>

/**
 * The snap layers of the vector layers the backdrop loaded.
 *
 * **A river's name as the dataset holds it** (`H-02`): `Maas` for the Meuse — `s02` writes *"Following
 * the Maas"*, so no alias table stands in front of it. A river the dataset leaves unnamed is ordinary
 * (25 of its 591 lines); a line index from the same array always resolves, so the `?.` only satisfies
 * the indexed lookup — and this runs on every pointer move, where a log would drown the console.
 * @param vectors - the coast and the rivers, with their provenance
 * @returns the table
 */
export function snapLayersOf(vectors: SnapSources): SnapLayers {
  return {
    coast: {
      lines: vectors.coast,
      provenance: vectors.coastProvenance,
      noun: 'coastline',
      label: () => 'coastline',
    },
    river: {
      lines: vectors.rivers,
      provenance: vectors.riverProvenance,
      noun: 'river',
      label: (line) => vectors.rivers[line]?.name ?? 'unnamed river',
    },
  }
}
