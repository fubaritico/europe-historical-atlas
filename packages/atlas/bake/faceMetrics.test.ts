// @vitest-environment node
import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { faceMeasure } from './faceMetrics'

/** The names' face, the very file the page loads. */
const FACE = readFileSync(
  new URL('../src/scene/political/names/face/fondamento.woff2', import.meta.url)
)

afterEach(() => {
  vi.restoreAllMocks()
})

// ATLAS-333: the build measures the names' letters from the face's file. The figures below are Chrome's own, read with
// `measureText` at 128 px on the dev's machine on 2026-11-08 — the advances and the ascents agree to the last bit.
describe('faceMeasure', () => {
  describe('happy path', () => {
    it('measures « A » as Chrome does: its advance and how far its ink reaches above the baseline', () => {
      const [a] = Object.values(faceMeasure(FACE)(['A']))
      expect(a?.advance).toBe(0.68505859375)
      expect(a?.ascent).toBe(0.70263671875)
    })
  })

  describe('variants', () => {
    it('measures « g » reaching below the baseline, as Chrome does', () => {
      expect(faceMeasure(FACE)(['g']).g?.descent).toBe(0.296875)
    })

    it('measures the space as a width with no ink either side', () => {
      expect(faceMeasure(FACE)([' '])[' ']).toEqual({ advance: 0.244140625, ascent: 0, descent: 0 })
    })

    it('measures « é » with its accent above, as Chrome does', () => {
      expect(faceMeasure(FACE)(['é']).é?.ascent).toBe(0.6787109375)
    })
  })

  describe('managed errors', () => {
    it('says a character the face lacks, measured as its missing glyph', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      faceMeasure(FACE)(['中'])
      expect(String(warn.mock.calls[0]?.[0])).toContain('the names’ face has no « 中 »')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a file that is no face', () => {
      expect(() => faceMeasure(new Uint8Array([1, 2, 3, 4]))).toThrow()
    })
  })

  describe('edge cases', () => {
    it('measures nothing for no character', () => {
      expect(faceMeasure(FACE)([])).toEqual({})
    })
  })
})
