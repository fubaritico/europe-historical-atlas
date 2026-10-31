import { describe, expect, it } from 'vitest'

import { Places } from './Places'
import { retitlePlaceSheets } from './retitleSheets'

describe('Places', () => {
  describe('happy path', () => {
    it('lets its cities’ sheets follow a saved place, so their titles keep its name', () => {
      expect(Places.hooks?.afterChange).toContain(retitlePlaceSheets)
    })
  })

  // L2–L5: N/A — the collection is configuration; the hook it wires is tested in retitleSheets.test.ts.
})
