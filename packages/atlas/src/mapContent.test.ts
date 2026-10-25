import { describe, expect, it, vi } from 'vitest'

import { loadContent } from './mapContent'

import type { ContentLoadDeps } from './mapContent'
import type { ContentEvent, ContentFile } from '@europe-historical-atlas/core/data/contentFormat'

const EVENT = { id: '10' } as ContentEvent

/**
 * Collaborators that record what they are told.
 * @param disposed - whether the app is already torn down
 * @returns the deps
 */
function deps(disposed = false): ContentLoadDeps {
  return {
    sources: { events: [] },
    layers: { rebuildEvents: vi.fn() },
    ui: { reportAssetFailure: vi.fn() },
    isDisposed: () => disposed,
  }
}

/**
 * A source answering one file.
 * @param file - what it answers
 * @returns the source
 */
const answering = (file: ContentFile) => ({ load: () => Promise.resolve(file) })

describe('loadContent', () => {
  describe('happy path', () => {
    it('writes the events and pins them', async () => {
      const d = deps()
      await loadContent(d, answering({ version: 1, events: [EVENT] }))
      expect(d.sources.events).toEqual([EVENT])
      expect(d.layers.rebuildEvents).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('pins nothing new for an empty file, and says nothing', async () => {
      const d = deps()
      await loadContent(d, answering({ version: 1, events: [] }))
      expect(d.sources.events).toEqual([])
      expect(d.ui.reportAssetFailure).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('reports a file that fails as the content asset', async () => {
      const d = deps()
      const error = new Error('404')
      await loadContent(d, { load: () => Promise.reject(error) })
      expect(d.ui.reportAssetFailure).toHaveBeenCalledWith('content', error)
      expect(d.layers.rebuildEvents).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('reports a source that throws while called', async () => {
      const d = deps()
      await loadContent(d, {
        load: () => {
          throw new Error('boom')
        },
      })
      expect(d.ui.reportAssetFailure).toHaveBeenCalledWith('content', expect.any(Error))
    })
  })

  describe('edge cases', () => {
    it('writes nothing once the app is torn down', async () => {
      const d = deps(true)
      await loadContent(d, answering({ version: 1, events: [EVENT] }))
      expect(d.sources.events).toEqual([])
      expect(d.layers.rebuildEvents).not.toHaveBeenCalled()
    })
  })
})
