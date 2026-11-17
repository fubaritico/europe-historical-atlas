import { describe, expect, it } from 'vitest'

import { devPreviewIcons } from './devPreview'

describe('devPreviewIcons', () => {
  describe('happy path', () => {
    it('stands a cathedral at Cologne and at Paris when the dev server’s address asks for it', () => {
      const icons = devPreviewIcons('?cathedral', true)

      expect(icons.map(({ kind }) => kind)).toEqual(['cathedral', 'cathedral'])
      expect(icons.map(({ lon }) => lon)).toEqual([6.96, 2.35])
    })
  })

  describe('variants', () => {
    it('reads the flag among others, with or without a value', () => {
      expect(devPreviewIcons('?year=1100&cathedral=1', true)).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('previews nothing unasked', () => {
      expect(devPreviewIcons('', true)).toEqual([])
      expect(devPreviewIcons('?crowns', true)).toEqual([])
    })

    it('previews nothing on the published site, whatever the address asks', () => {
      expect(devPreviewIcons('?cathedral', false)).toEqual([])
    })
  })

  // L3: N/A — any address is read; nothing is refused
  // L4: N/A — no async work, nothing external
})
