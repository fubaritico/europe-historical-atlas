import { describe, expect, it } from 'vitest'

import { HierarchyLinks } from '../collections/HierarchyLinks'
import { PeriodNames } from '../collections/PeriodNames'
import { PlacePeriods } from '../collections/PlacePeriods'
import { Places } from '../collections/Places'
import { Sources } from '../collections/Sources'
import { Titles } from '../collections/Titles'

import { MCP_COLLECTIONS, mcpAccess } from './mcpAccess'
import { refuseBulkRemovalOverMcp } from './refuseBulkRemoval'

import type { Config } from 'payload'

/** The plugin applied to a config holding nothing — what it adds is all there is to see. */
async function applied(): Promise<Config> {
  return mcpAccess()({ collections: [] } as unknown as Config)
}

/**
 * The operations a key can be given for one collection, as the plugin builds them on the key's form (3.92: a
 * sidebar collapsible per collection, holding a group named after it, one checkbox per operation allowed).
 */
function operationBoxes(config: Config, group: string): string[] {
  const keys = config.collections?.find((c) => c.slug === 'payload-mcp-api-keys')
  const groups = (keys?.fields ?? []).flatMap((field) => ('fields' in field ? field.fields : []))
  const found = groups.find((field) => 'name' in field && field.name === group)

  return found && 'fields' in found
    ? found.fields.map((box) => ('name' in box ? box.name : ''))
    : []
}

describe('mcpAccess', () => {
  describe('happy path', () => {
    it('reaches the confessions, the importance reasons, the register of people, the places, the cities at a date and the sources, and nothing else', () => {
      expect(Object.keys(MCP_COLLECTIONS).sort()).toEqual([
        'confessions',
        'hierarchy-links',
        'importance-reasons',
        'people',
        'period-names',
        'place-periods',
        'places',
        'sources',
        'territories',
        'titles',
      ])
    })

    it('adds the collection of API keys and the /mcp endpoint', async () => {
      const config = await applied()

      expect(config.collections?.map((c) => c.slug)).toEqual(['payload-mcp-api-keys'])
      expect(config.endpoints?.map((e) => `${e.method} ${e.path}`)).toEqual([
        'post /mcp',
        'get /mcp',
      ])
    })
  })

  describe('boundaries', () => {
    // CMS-508: the plugin's delete erases for good, bin or not — a key deletes nowhere, it puts in the bin.
    it.each([
      'places',
      'placePeriods',
      'periodNames',
      'sources',
      'titles',
      'hierarchyLinks',
      'importanceReasons',
      'confessions',
      'people',
      'territories',
    ])(
      'gives a key the boxes find, create and update for %s, and no box to delete',
      async (group) => {
        const config = await applied()

        expect(operationBoxes(config, group)).toEqual(['find', 'create', 'update'])
      }
    )

    it('gives a bin to every collection the historian undoes its errors in, each refusing it by filter over MCP', () => {
      // One call with a wide filter would empty a collection into the bin (CMS-454, CMS-508): a collection with a bin
      // but without the refusal fails here, and so does one whose description does not say how to use the bin.
      const binned = [Places, PlacePeriods, PeriodNames, Sources, Titles, HierarchyLinks]
      for (const collection of binned) {
        expect(collection.trash).toBe(true)
        expect(collection.hooks?.beforeOperation).toContain(refuseBulkRemovalOverMcp)
        expect(
          MCP_COLLECTIONS[collection.slug as keyof typeof MCP_COLLECTIONS]?.description
        ).toContain('put the record in the bin — never delete it')
      }
    })

    it('describes a place’s position as the object the plugin’s tools take, not the stored tuple', () => {
      const description = MCP_COLLECTIONS[Places.slug]?.description

      expect(description).toContain('{ longitude, latitude }')
      expect(description).not.toContain('[longitude, latitude]')
    })
  })

  // L3–L5: N/A — configuration; the endpoint and the keys are the plugin's own (opensrc test/plugin-mcp).
})
