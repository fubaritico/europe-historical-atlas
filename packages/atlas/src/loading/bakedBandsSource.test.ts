import { afterEach, describe, expect, it, vi } from 'vitest'

import { encodeBakedBands } from '@europe-historical-atlas/core/pipeline/bakedBands'

import { bandsSource } from './assets'
import { MEASURED_BANDS, createFetchBakedBandsSource } from './bakedBandsSource'

import type { IndexedFill } from '@europe-historical-atlas/core/pipeline/indexFill'

// ATLAS-407: the bands' distances the build measured, read by the built site; the dev server reads none. No fallback
// between the two (the dev, 2026-11-10): on the built site a file that does not arrive fails the year.

/** One banded vertex, 12 km inside its outline, its realm's 3 km. */
const FILL = {
  vertices: [0.5, 0.5],
  indices: [],
  bandKm: new Float32Array([-12]),
  realmKm: new Float32Array([-3]),
} as unknown as IndexedFill

/**
 * Bytes gzipped, as the build gzips its file — by the browser's own stream, the page's test having no Node.
 * @param bytes - the bytes
 * @returns them gzipped
 */
function gzip(bytes: BodyInit): Promise<ArrayBuffer> {
  const body = new Response(bytes).body
  if (body === null) throw new Error('test: no body to gzip')
  return new Response(body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
}

/** The file the build writes for it, before its gzip. */
const BYTES = encodeBakedBands([FILL], { segX: 4, segY: 4 })

/**
 * A transport answering one response.
 * @param body - the body
 * @param init - its status
 * @returns the transport, as a spy
 */
function answering(body: BodyInit | null, init: ResponseInit) {
  return vi.fn(() => Promise.resolve(new Response(body, init)))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createFetchBakedBandsSource', () => {
  describe('happy path', () => {
    it('reads 1100’s distances from its folder', async () => {
      const fetchFile = answering(await gzip(BYTES.slice()), { status: 200 })
      const read = await createFetchBakedBandsSource('/years', fetchFile).load(1100)
      expect([fetchFile.mock.calls[0], read?.grid, read?.own[0], read?.realm[0]]).toEqual([
        ['/years/1100/bands.bin'],
        { segX: 4, segY: 4 },
        -36,
        -9,
      ])
    })
  })

  describe('variants', () => {
    // Review QUAL-002: the built site's side of the choice — inverted, the site would measure again with nothing failing.
    it('reads the build’s file of the year on the built site', async () => {
      const fetchFile = answering(await gzip(BYTES.slice()), { status: 200 })
      vi.stubGlobal('fetch', fetchFile)
      const read = await bandsSource(true).load(1100)
      expect([
        String((fetchFile.mock.calls[0] as unknown[] | undefined)?.[0]),
        read?.own[0],
      ]).toEqual(['/years/1100/bands.bin', -36])
    })

    it('reads nothing on the dev server: the worker measures', async () => {
      expect([await bandsSource(false).load(1100), bandsSource(false)]).toEqual([
        null,
        MEASURED_BANDS,
      ])
    })
  })

  describe('managed errors', () => {
    it('fails the year when the built site holds no file for it — never measured instead', async () => {
      const source = createFetchBakedBandsSource('/years', answering('', { status: 404 }))
      await expect(source.load(1200)).rejects.toThrow('/years/1200/bands.bin: HTTP 404')
    })

    it('fails the year on bytes that are not distances, naming the file', async () => {
      const source = createFetchBakedBandsSource(
        '/years',
        answering(await gzip('<!doctype html>'), { status: 200 })
      )
      await expect(source.load(1100)).rejects.toThrow(
        /^\/years\/1100\/bands\.bin is not a year's baked distances/
      )
    })

    it('fails the year on an answer with no body, naming the file', async () => {
      const source = createFetchBakedBandsSource('/years', answering(null, { status: 200 }))
      await expect(source.load(1100)).rejects.toThrow('/years/1100/bands.bin: no body')
    })
  })

  describe('unmanaged errors', () => {
    it('lets a body that is not gzipped through, as the inflating stream refuses it', async () => {
      const raw = encodeBakedBands([FILL], { segX: 4, segY: 4 })
      await expect(
        createFetchBakedBandsSource('/years', answering(raw, { status: 200 })).load(1100)
      ).rejects.toThrow()
    })

    it('lets a broken transport through', async () => {
      const fetchFile = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      await expect(createFetchBakedBandsSource('/years', fetchFile).load(1100)).rejects.toThrow(
        'Failed to fetch'
      )
    })
  })

  // L5: N/A — the file's own edges (a clamped distance, a short file) are core's, bakedBands.test.ts.
})
