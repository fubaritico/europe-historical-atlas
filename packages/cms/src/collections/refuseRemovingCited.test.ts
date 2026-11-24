import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerRefusals } from './refuseRemovingCited'

type ChangeArgs = Parameters<ReturnType<typeof registerRefusals>['beforeChange']>[0]

/** The territories' refusals. */
const REFUSALS = registerRefusals({ subject: 'Ce territoire', cited: 'cité' })

/**
 * The hook called as Payload calls it on an update of a territory.
 * @param data - what is saved
 * @param stored - the bin date the territory holds
 * @param api - how the request came: the MCP plugin's mark, or Payload's own
 * @returns what the hook returns
 */
function changed(
  data: Record<string, unknown>,
  stored: string | null,
  api: string
): Promise<unknown> {
  return Promise.resolve(
    REFUSALS.beforeChange({
      collection: { slug: 'territories' },
      data,
      operation: 'update',
      originalDoc: { id: 367, deletedAt: stored },
      // No base: what is tested here refuses or lets through before reading anything
      req: { payloadAPI: api },
    } as unknown as ChangeArgs)
  )
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// CMS-509: a register's record is the dev's to clear (2026-11-02), and the merge's — never the historian's over MCP.
describe('registerRefusals — the bin over MCP', () => {
  describe('happy path', () => {
    it('refuses to put a territory in the bin over MCP, and says the merge instead', async () => {
      await expect(changed({ deletedAt: '2026-11-24T17:00:00.000Z' }, null, 'MCP')).rejects.toThrow(
        'pnpm cms:merge'
      )
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('over MCP refused'))
    })
  })

  describe('variants', () => {
    it('lets an ordinary change over MCP through, the bin untouched', async () => {
      const data = { name: 'comté de Ponthieu' }
      await expect(changed(data, null, 'MCP')).resolves.toBe(data)
    })

    it('lets a restore through: only going into the bin is guarded here', async () => {
      const data = { deletedAt: null }
      await expect(changed(data, '2026-11-24T17:00:00.000Z', 'MCP')).resolves.toBe(data)
    })
  })

  // L3: the refusal of a cited record runs in a real base, `claims.test.ts`. L4: N/A — nothing read before refusing.

  describe('edge cases', () => {
    it('lets a record already in the bin be saved with its date again', async () => {
      const data = { deletedAt: '2026-11-24T18:00:00.000Z' }
      await expect(changed(data, '2026-11-24T17:00:00.000Z', 'MCP')).resolves.toBe(data)
    })
  })
})
