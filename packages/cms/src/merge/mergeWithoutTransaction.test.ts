import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { mergeRecords } from './mergeRecords'

import type { Payload } from 'payload'

/**
 * The merge refused on a Payload built as the server is — no transaction (review QUAL-002): its own base, apart from
 * the suite that builds one with transactions.
 */

const folder = mkdtempSync(path.join(tmpdir(), 'cms-merge-notx-'))
const databaseUrl = `file:${path.join(folder, 'cms.db')}`
let payload: Payload

/** The English line every record of a register needs (CMS-495). */
const ENGLISH = [{ language: 'en' as const, form: 'An English name' }]

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl
  process.env.PAYLOAD_SECRET = 'test-secret-of-the-merge-without-transaction-suite'
  const { getPayload, readMigrationFiles } = await import('payload')
  const { default: config } = await import('../payload.config')
  const { migrateBase } = await import('../migrate/migrateBase')
  payload = await getPayload({ config })
  await migrateBase(
    payload,
    databaseUrl,
    new Date(),
    await readMigrationFiles({ payload }),
    () => []
  )
}, 60_000)

afterAll(async () => {
  await payload.destroy()
  rmSync(folder, { recursive: true, force: true })
})

describe('mergeRecords — without a transaction', () => {
  it('refuses to start on the server’s Payload, and leaves both records live', async () => {
    const kept = await payload.create({
      collection: 'territories',
      data: { name: 'comté de Ponthieu', kind: 'county', otherNames: ENGLISH },
    })
    const twin = await payload.create({
      collection: 'territories',
      data: { name: 'Ponthieu', kind: 'county', otherNames: ENGLISH },
    })
    await expect(
      mergeRecords(payload, { collection: 'territories', keep: kept.id, remove: twin.id })
    ).rejects.toThrow('demande une base en transaction')
    expect(
      (await payload.findByID({ collection: 'territories', id: twin.id })).deletedAt
    ).toBeFalsy()
  }, 60_000)
})
