import { describe, expect, it } from 'vitest'

import { projectRegions } from '@europe-historical-atlas/core/data/regionSource'
import { toRegionPayload } from '@europe-historical-atlas/core/data/toRegionPayload'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createDevState } from '../../tunables/devState'
import { AUTHORED_YEAR, META, YEAR } from '../testing/yearFixtures'

import { politicalRequest } from './political'

import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'

describe('politicalRequest', () => {
  it('grows a payload year’s claims toward the coast by the tuned distance', () => {
    const dev = createDevState()
    dev.political.snapToCoast = 12

    expect(politicalRequest(dev, YEAR).snapToCoast).toBe(12)
  })

  // The authored outline already runs along the shore: growing it spreads the fill past the drawn line.
  it('never grows an authored year’s claims', () => {
    const dev = createDevState()
    dev.political.snapToCoast = 12

    expect(politicalRequest(dev, AUTHORED_YEAR).snapToCoast).toBe(0)
  })

  it('paints an authored year in the editor’s colours, from the panel’s palette', () => {
    const dev = createDevState()
    dev.political.palette1 = '#010203'
    dev.political.palette2 = '#040506'

    const request = politicalRequest(dev, AUTHORED_YEAR)

    // France and the Empire share a limit, so they take the first two slots, one each.
    expect(
      new Set(request.colours?.map((c) => `${String(c.r)},${String(c.g)},${String(c.b)}`))
    ).toEqual(new Set(['1,2,3', '4,5,6']))
  })

  it('paints a polity whose author pinned a colour in that colour', () => {
    const files = { year: 1100, ...saveYearDocument(sharedBorderDocument()) }
    const france = files.registry.polities.find((polity) => polity.id === 'fr-couronne')
    if (france) france.colour = '#123456'
    const year: RegionSet = {
      ...projectRegions(toRegionPayload(files, META.bbox)),
      authored: { year: files, bbox: META.bbox },
    }

    const request = politicalRequest(createDevState(), year)
    const index = year.regions.findIndex((region) => region.polityId === 'fr-couronne')

    expect(request.colours?.[index]).toEqual({ r: 0x12, g: 0x34, b: 0x56 })
  })

  it('leaves a payload year to the palette and the name rules', () => {
    expect(politicalRequest(createDevState(), YEAR).colours).toBeUndefined()
  })

  it('passes the year’s polities through untouched', () => {
    expect(politicalRequest(createDevState(), AUTHORED_YEAR).regions).toBe(AUTHORED_YEAR.regions)
  })
})
