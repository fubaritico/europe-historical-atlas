import { describe, expect, it } from 'vitest'

import { Places } from '../collections/Places'

import { MCP_COLLECTIONS, mcpAccess } from './mcpAccess'

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
    it('reaches the places, the cities at a date and the sources, and nothing else', () => {
      expect(Object.keys(MCP_COLLECTIONS).sort()).toEqual(['place-periods', 'places', 'sources'])
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
    it.each(['places', 'placePeriods', 'sources'])(
      'gives a key the boxes find, create and update for %s, and no box to delete',
      async (group) => {
        const config = await applied()

        expect(operationBoxes(config, group)).toEqual(['find', 'create', 'update'])
      }
    )

    it('describes a place’s position longitude first, as the point field stores it', () => {
      expect(MCP_COLLECTIONS[Places.slug]?.description).toContain('[longitude, latitude]')
    })
  })

  // L3–L5: N/A — configuration; the endpoint and the keys are the plugin's own (opensrc test/plugin-mcp).
})
