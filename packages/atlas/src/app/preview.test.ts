import { describe, expect, it } from 'vitest'

import { previewIcons } from './preview'

describe('previewIcons', () => {
  describe('happy path', () => {
    it('stands a cathedral at Cologne and at Paris when the address asks for it', () => {
      const icons = previewIcons('?cathedral')

      expect(icons.map(({ kind }) => kind)).toEqual(['cathedral', 'cathedral'])
      expect(icons.map(({ lon }) => lon)).toEqual([6.96, 2.35])
    })
  })

  describe('variants', () => {
    it('stands a grave at Cluny and at Canterbury when asked for the tomb', () => {
      const icons = previewIcons('?tomb')

      expect(icons.map(({ kind }) => kind)).toEqual(['tomb', 'tomb'])
      expect(icons.map(({ lat }) => lat)).toEqual([46.43, 51.28])
    })

    it('stands the council’s tiara at Lyon and at Pisa when asked for the tiara', () => {
      const icons = previewIcons('?tiara')

      expect(icons.map(({ kind }) => kind)).toEqual(['tiara', 'tiara'])
      expect(icons.map(({ lon }) => lon)).toEqual([4.84, 10.4])
    })

    it('stands the conquest’s oriflamme at Toledo and at Palermo when asked for the oriflamme', () => {
      const icons = previewIcons('?oriflamme')

      expect(icons.map(({ kind }) => kind)).toEqual(['oriflamme', 'oriflamme'])
      expect(icons.map(({ lon }) => lon)).toEqual([-4.02, 13.36])
    })

    it('stands both kinds when both are asked', () => {
      expect(previewIcons('?cathedral&tomb').map(({ kind }) => kind)).toEqual([
        'cathedral',
        'cathedral',
        'tomb',
        'tomb',
      ])
    })

    it('reads the flag among others, with or without a value', () => {
      expect(previewIcons('?year=1100&cathedral=1')).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('previews nothing unasked', () => {
      expect(previewIcons('')).toEqual([])
      expect(previewIcons('?crowns')).toEqual([])
    })
  })

  // L3: N/A — any address is read; nothing is refused
  // L4: N/A — no async work, nothing external
})
