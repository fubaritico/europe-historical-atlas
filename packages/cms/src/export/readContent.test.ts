import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { contentFileSchema } from '@europe-historical-atlas/core/data/contentFormat'

import type * as ReadModule from './readContent'
import type { Payload, SanitizedConfig } from 'payload'

/**
 * The export's reading of the base (CARTO-456, review QUAL-001) — Payload booted on a temporary SQLite file, never the
 * dev's: a base behind its migrations is refused, a migrated one is read into content `core`'s schema accepts. And the
 * raw configuration builds twice in one process, as the print of the content builds it beside the module's own.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-read-content-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload
let config: SanitizedConfig
let read: typeof ReadModule.readContent

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-read-content-suite'
  const { getPayload } = await import('payload')
  config = await (await import('../payload.config')).default
  read = (await import('./readContent')).readContent
  payload = await getPayload({ config })
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('readContent', () => {
  describe('managed errors', () => {
    it('refuses a base behind its migrations before reading anything', async () => {
      await expect(read(config, vi.fn())).rejects.toThrow()
    }, 60_000)
  })

  describe('happy path', () => {
    it('reads a migrated base into content the schema accepts', async () => {
      const { readMigrationFiles } = await import('payload')
      const { migrateBase } = await import('../migrate/migrateBase')
      await migrateBase(payload, databaseUrl, new Date(), await readMigrationFiles({ payload }))
      const warn = vi.fn()
      const content = await read(config, warn)
      expect(contentFileSchema.safeParse(content).success).toBe(true)
      expect(content.events).toEqual([])
      expect(content.cities).toEqual([])
      expect(warn).not.toHaveBeenCalled()
    }, 60_000)
  })

  describe('edge cases', () => {
    // The print builds the raw configuration again, its log on the standard error: the MCP plugin once refused it
    it('builds the raw configuration again in the same process', async () => {
      const { buildConfig } = await import('payload')
      const { cmsConfig } = await import('../cmsConfig')
      await expect(
        buildConfig({ ...cmsConfig(), logger: { options: { level: 'warn' } } })
      ).resolves.toBeDefined()
    }, 60_000)
  })

  // L2: N/A here — the turning of each event and city into content is toContent's, tested beside it
  // L4: N/A — a thrown read is not caught: it stops the export, which is the decision
})
