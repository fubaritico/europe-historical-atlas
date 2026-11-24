import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refuseBulkRemovalOverMcp } from './refuseBulkRemoval'

type HookArgs = Parameters<typeof refuseBulkRemovalOverMcp>[0]

/**
 * The hook called as Payload calls it.
 * @param operation - the operation starting
 * @param args - its arguments: an `id`, or a `where`
 * @param api - how the request came: the plugin's mark, or Payload's own
 * @returns what the hook returns
 */
function called(operation: string, args: Record<string, unknown>, api: string): unknown {
  return refuseBulkRemovalOverMcp({
    args,
    operation,
    req: { payloadAPI: api },
  } as unknown as HookArgs)
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('refuseBulkRemovalOverMcp', () => {
  describe('happy path', () => {
    it('lets a deletion by id through over MCP, its arguments unchanged', () => {
      const args = { id: 11749 }
      expect(called('delete', args, 'MCP')).toBe(args)
    })
  })

  describe('variants', () => {
    it.each(['REST', 'local', 'GraphQL'])(
      'leaves the dev’s own deletion by filter alone, through %s',
      (api) => {
        const args = { where: { id: { in: [1, 2] } } }
        expect(called('delete', args, api)).toBe(args)
      }
    )

    it.each(['create', 'update', 'read'])(
      'leaves a %s over MCP alone, filter or not, when it does not touch the bin',
      (operation) => {
        const args = { where: { id: { exists: true } }, data: { importance: 'city' } }
        expect(called(operation, args, 'MCP')).toBe(args)
      }
    )

    it('lets a deletion by a text id through', () => {
      expect(() => called('delete', { id: 'abc' }, 'MCP')).not.toThrow()
    })

    // CMS-508: the bin is an update writing `deletedAt`
    it('lets a record be put in the bin over MCP by its id', () => {
      const args = { id: 1520, data: { deletedAt: '2026-11-24T16:00:00.000Z' } }
      expect(called('update', args, 'MCP')).toBe(args)
    })

    it('lets an update by filter over MCP through that takes records out of the bin, deletedAt emptied', () => {
      const args = { where: { id: { in: [1, 2] } }, data: { deletedAt: null } }
      expect(called('update', args, 'MCP')).toBe(args)
    })

    it('leaves the dev’s own putting in the bin by filter alone, in the admin', () => {
      const args = {
        where: { id: { in: [1, 2] } },
        data: { deletedAt: '2026-11-24T16:00:00.000Z' },
      }
      expect(called('update', args, 'REST')).toBe(args)
    })
  })

  describe('managed errors', () => {
    it('refuses a deletion by filter over MCP, and says how to delete instead', () => {
      // One call with this filter would empty the collection.
      expect(() => called('delete', { where: { id: { exists: true } } }, 'MCP')).toThrow(
        'une fiche à la fois, par son identifiant'
      )
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('refused'))
    })

    it('refuses a deletion with an id and a filter both empty', () => {
      expect(() => called('delete', {}, 'MCP')).toThrow('une fiche à la fois')
    })

    // CMS-508: one update with a wide filter would put a whole collection in the bin.
    it('refuses putting records in the bin by filter over MCP', () => {
      const args = {
        where: { id: { exists: true } },
        data: { deletedAt: '2026-11-24T16:00:00.000Z' },
      }
      expect(() => called('update', args, 'MCP')).toThrow(
        'une fiche à la fois, par son identifiant'
      )
    })
  })

  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it.each([undefined, null])('refuses a deletion whose id is %s, a filter beside it', (id) => {
      expect(() => called('delete', { id, where: {} }, 'MCP')).toThrow('une fiche à la fois')
    })

    it('lets the id 0 through: a record’s id, not an absence', () => {
      expect(() => called('delete', { id: 0 }, 'MCP')).not.toThrow()
    })
  })
})
