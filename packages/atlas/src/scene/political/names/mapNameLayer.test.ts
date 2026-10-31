import { Scene } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createMapSources } from '../../../sources/mapSources'

import { rebuildNames } from './mapNameLayer'

import type { LayerContext } from '../../layers/layerContext'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/**
 * A context with no name layer yet, the events standing in with a spy for the names they yield to.
 * @param yearNames - the year's names as placed, or `null`
 * @returns the context and the spy
 */
function contextWith(yearNames: YearNames | null): {
  context: LayerContext
  setNameCover: ReturnType<typeof vi.fn>
} {
  const setNameCover = vi.fn()
  const sources = createMapSources()
  sources.yearNames = yearNames
  const context = {
    scene: new Scene(),
    sources,
    handles: { names: null, relief: null, events: { setNameCover } },
  } as unknown as LayerContext
  return { context, setNameCover }
}

/** A year of names, empty — what matters is that it is not `null`. */
const NAMES = { levels: [], gridWidth: 10, gridHeight: 10, unnamed: [] } as unknown as YearNames

describe('rebuildNames', () => {
  describe('the cities’ points (ATLAS-323)', () => {
    it('tells the events there are no names to yield to while none is drawn', () => {
      const { context, setNameCover } = contextWith(null)

      rebuildNames(context)

      expect(setNameCover).toHaveBeenCalledWith(null)
    })

    it('never has the points yield to names placed but not drawn — no sheet, no relief', () => {
      const { context, setNameCover } = contextWith(NAMES)

      rebuildNames(context)

      expect(setNameCover.mock.calls).toEqual([[null]])
    })
  })

  // L2–L5: the layer itself is tested in nameLayer.test.ts; this file guards what the builder tells the events.
})
