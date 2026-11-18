import { describe, expect, it } from 'vitest'

import { PlacePeriods } from '../collections/PlacePeriods'
import { Places } from '../collections/Places'
import { Sources } from '../collections/Sources'
import { Titles } from '../collections/Titles'
import { VassalLinks } from '../collections/VassalLinks'

import { MCP_COLLECTIONS, mcpAccess } from './mcpAccess'
import { refuseBulkDeleteOverMcp } from './refuseBulkDelete'

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
        'importance-reasons',
        'people',
        'place-periods',
        'places',
        'sources',
        'territories',
        'titles',
        'vassal-links',
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
    it.each(['places', 'placePeriods', 'sources', 'titles', 'vassalLinks'])(
      'gives a key a box to delete for %s, what the historian enters and must undo itself',
      async (group) => {
        // CMS-454, the dev, 2026-11-18: « je n'efface plus tes erreurs ».
        const config = await applied()

        expect(operationBoxes(config, group)).toEqual(['find', 'create', 'update', 'delete'])
      }
    )

    it.each(['importanceReasons', 'confessions', 'people', 'territories'])(
      'gives a key the boxes find, create and update for %s, and no box to delete',
      async (group) => {
        const config = await applied()

        expect(operationBoxes(config, group)).toEqual(['find', 'create', 'update'])
      }
    )

    it('opens the deletion only on collections that refuse one by filter over MCP', () => {
      // One call with a wide filter would empty a collection (CMS-454): a collection opened without the refusal
      // fails here.
      const opened = [Places, PlacePeriods, Sources, Titles, VassalLinks]
      const deletable = Object.entries(MCP_COLLECTIONS)
        .filter(([, { enabled }]) => enabled.delete)
        .map(([slug]) => slug)
      expect(deletable.sort()).toEqual(opened.map(({ slug }) => slug).sort())
      for (const collection of opened)
        expect(collection.hooks?.beforeOperation).toContain(refuseBulkDeleteOverMcp)
    })

    it('describes a place’s position as the object the plugin’s tools take, not the stored tuple', () => {
      const description = MCP_COLLECTIONS[Places.slug]?.description

      expect(description).toContain('{ longitude, latitude }')
      expect(description).not.toContain('[longitude, latitude]')
    })
  })

  // L3–L5: N/A — configuration; the endpoint and the keys are the plugin's own (opensrc test/plugin-mcp).
})
