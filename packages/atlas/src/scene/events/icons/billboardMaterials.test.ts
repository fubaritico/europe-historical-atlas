import { LinearFilter, Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { billboardMaterials } from './billboardMaterials'

/** A loader that hands out a fresh texture for every drawing, and remembers what it was asked. */
const loader = (): { load: (svg: string) => Texture; asked: string[] } => {
  const asked: string[] = []
  return {
    asked,
    load: (svg) => {
      asked.push(svg)
      return new Texture()
    },
  }
}

describe('billboardMaterials', () => {
  describe('happy path', () => {
    it('reads a flat drawing at its own pixels, with no mipmaps: sharp from afar', () => {
      // The dev, 2026-11-17, of the flat drawings seen from afar: « le flou est gênant ».
      const { load } = loader()

      const { map } = billboardMaterials(load).flat('swords')

      expect(map?.generateMipmaps).toBe(false)
      expect(map?.minFilter).toBe(LinearFilter)
    })

    it('draws a flat drawing as a sprite: see-through, writing no depth', () => {
      const material = billboardMaterials(loader().load).flat('crown')

      expect([material.transparent, material.depthWrite]).toEqual([true, false])
    })
  })

  describe('variants', () => {
    it('rasterises a kind’s drawing once, however many icons ask for it', () => {
      const { load, asked } = loader()
      const materials = billboardMaterials(load)

      const first = materials.flat('swords')
      const again = materials.flat('swords')
      materials.flat('tomb')

      expect(again).toBe(first)
      expect(asked).toHaveLength(2)
    })

    it('fades every kind’s drawing at once', () => {
      const materials = billboardMaterials(loader().load)
      const swords = materials.flat('swords')
      const crown = materials.flat('crown')

      materials.setFlatOpacity(0.4)

      expect([swords.opacity, crown.opacity]).toEqual([0.4, 0.4])
    })
  })

  describe('edge cases', () => {
    it('frees every drawing’s texture and material', () => {
      const materials = billboardMaterials(loader().load)
      const swords = materials.flat('swords')
      const { map } = swords
      if (map === null) throw new Error('no drawing on the material')
      const freedMap = vi.spyOn(map, 'dispose')
      const freedMaterial = vi.spyOn(swords, 'dispose')

      materials.dispose()

      expect(freedMap).toHaveBeenCalled()
      expect(freedMaterial).toHaveBeenCalled()
    })
  })

  // L3: N/A — every kind is a member of a closed union; nothing is refused
  // L4: N/A — the loader is injected; nothing external is reached
})
