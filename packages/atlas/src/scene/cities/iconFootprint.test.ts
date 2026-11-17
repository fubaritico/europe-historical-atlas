import { describe, expect, it } from 'vitest'

import { iconOver } from './iconFootprint'

import type { IconFootprint, StandingIcon } from './iconFootprint'

/** An icon a tenth of a unit wide. */
const CROWN: IconFootprint = { width: 0.1, minPixels: 20 }

/** A wider one. */
const TREBUCHET: IconFootprint = { width: 0.4, minPixels: 20 }

describe('iconOver', () => {
  describe('happy path', () => {
    it('gives the room of the icon standing on the city’s own point', () => {
      const icons: StandingIcon[] = [{ ground: [1, 0.3, 2], footprint: CROWN }]

      expect(iconOver([1, 0.3, 2], icons)).toBe(CROWN)
    })
  })

  describe('variants', () => {
    it('counts an icon whose half width reaches the point, whatever their heights', () => {
      const icons: StandingIcon[] = [{ ground: [1.04, 9, 2], footprint: CROWN }]

      expect(iconOver([1, 0, 2], icons)).toBe(CROWN)
    })

    it('takes the nearest of two icons reaching the point', () => {
      const icons: StandingIcon[] = [
        { ground: [1.15, 0, 2], footprint: TREBUCHET },
        { ground: [1.02, 0, 2], footprint: CROWN },
      ]

      expect(iconOver([1, 0, 2], icons)).toBe(CROWN)
    })
  })

  describe('edge cases', () => {
    it('gives nothing for an icon standing beside the point, past its half width', () => {
      const icons: StandingIcon[] = [{ ground: [1.06, 0, 2], footprint: CROWN }]

      expect(iconOver([1, 0, 2], icons)).toBeUndefined()
    })

    it('gives nothing on a map with no icon', () => {
      expect(iconOver([1, 0, 2], [])).toBeUndefined()
    })
  })

  // L3: N/A — data in, data out; nothing is refused
  // L4: N/A — no async work, nothing external
})
