import { documentFaults } from '@europe-historical-atlas/core/editor/documentFaults'
import { polityColours } from '@europe-historical-atlas/core/editor/polityColours'

import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The one place the editor's polity colours come from — the canvas's fills, `{Polities}`' swatches and
 * the rail's swatch all read it (ARCH-013, found in review: three callers each derived them on their
 * own, so a change to the rule could paint one colour and list another with no test failing).
 *
 * **Created once, at the composition root, with the palette** (ARCH-001): the palette is injected
 * there and nowhere else. **Cached on the document and the edition's version together.** The version
 * is what moves when the document is edited — it is mutated in place, so its reference alone cannot
 * be the key — and the reference is what tells two documents apart: two stores both start at version
 * 0, so a cache keyed on the version alone handed one document another's colours. Found by a test that
 * mounted two editors over one source.
 */
export interface PolityColourSource {
  /**
   * Each polity's colour, by id, recomputed only when the version moved.
   * @param document - the year
   * @param version - the edition's version counter
   * @returns the `#rrggbb` each polity is painted in
   */
  coloursOf: (document: YearDocument, version: number) => ReadonlyMap<string, string>
}

/**
 * Open a colour source over a palette.
 *
 * Each time the version moves it also reports what is wrong with the document (`documentFaults`): the
 * painters skip what those faults name, and this is the one place that runs once per version — never
 * once per frame or per render.
 * @param palette - the automatic palette, never empty
 * @returns the source
 */
export function createPolityColourSource(
  palette: readonly [string, ...string[]]
): PolityColourSource {
  let cached: {
    document: YearDocument
    version: number
    byId: ReadonlyMap<string, string>
  } | null = null
  return {
    coloursOf: (document, version) => {
      if (cached?.version !== version || cached.document !== document) {
        cached = { document, version, byId: polityColours(document, palette) }
        for (const fault of documentFaults(document)) console.error(`[Cartographer] ${fault}`)
      }
      return cached.byId
    },
  }
}
