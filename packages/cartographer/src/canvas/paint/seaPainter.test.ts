import { describe, expect, it, vi } from 'vitest'

import { paintSea } from './seaPainter'

describe('paintSea', () => {
  describe('happy path', () => {
    it('lays the sea where the backdrop lies', () => {
      const ctx = { drawImage: vi.fn() }
      const sea = {} as CanvasImageSource
      paintSea(ctx, { sea, rect: { x: -40, y: -10, width: 1600, height: 1400 } })
      expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(sea, -40, -10, 1600, 1400)
    })
  })

  // L2: N/A — one image, one rectangle; the order and the opacity are the painter's (painter.test.ts).
  // L3, L4: N/A — nothing to refuse: no image is the honest state before the bake.

  describe('edge cases', () => {
    it('draws nothing before the backdrop is baked', () => {
      const ctx = { drawImage: vi.fn() }
      paintSea(ctx, null)
      expect(ctx.drawImage).not.toHaveBeenCalled()
    })

    it('draws nothing while the sea image is not made', () => {
      const ctx = { drawImage: vi.fn() }
      paintSea(ctx, { sea: null, rect: { x: 0, y: 0, width: 10, height: 10 } })
      expect(ctx.drawImage).not.toHaveBeenCalled()
    })
  })
})
