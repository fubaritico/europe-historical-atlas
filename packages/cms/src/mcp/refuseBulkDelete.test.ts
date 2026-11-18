import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refuseBulkDeleteOverMcp } from './refuseBulkDelete'

type HookArgs = Parameters<typeof refuseBulkDeleteOverMcp>[0]

/**
 * The hook called as Payload calls it.
 * @param operation - the operation starting
 * @param args - its arguments: an `id`, or a `where`
 * @param api - how the request came: the plugin's mark, or Payload's own
 * @returns what the hook returns
 */
function called(operation: string, args: Record<string, unknown>, api: string): unknown {
  return refuseBulkDeleteOverMcp({
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

describe('refuseBulkDeleteOverMcp', () => {
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
      'leaves a %s over MCP alone, filter or not',
      (operation) => {
        const args = { where: { id: { exists: true } } }
        expect(called(operation, args, 'MCP')).toBe(args)
      }
    )

    it('lets a deletion by a text id through', () => {
      expect(() => called('delete', { id: 'abc' }, 'MCP')).not.toThrow()
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
