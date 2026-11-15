import { describe, expect, it } from 'vitest'

import { backupPath, decideBaseline, fileStamp } from './baseline'

const MIGRATIONS = ['20261115_152716_initial', '20261116_100000_people']

describe('decideBaseline', () => {
  it('does nothing for a base already under migrations', () => {
    const rows = [{ name: '20261115_152716_initial', batch: 1 }]
    expect(decideBaseline(rows, MIGRATIONS, [])).toEqual({ kind: 'none' })
  })

  it('refuses a base under migrations that the push ran on again, its marker beside them', () => {
    const rows = [
      { name: 'dev', batch: -1 },
      { name: '20261115_152716_initial', batch: 1 },
    ]
    expect(decideBaseline(rows, MIGRATIONS, [])).toEqual({ kind: 'pushedSince' })
  })

  it('adopts a pushed base identical to the collections: every migration recorded as applied', () => {
    expect(decideBaseline([{ name: 'dev', batch: -1 }], MIGRATIONS, [])).toEqual({
      kind: 'baseline',
      markApplied: MIGRATIONS,
    })
  })

  it('adopts a base with an empty migration table the same way', () => {
    expect(decideBaseline([], MIGRATIONS, [])).toEqual({
      kind: 'baseline',
      markApplied: MIGRATIONS,
    })
  })

  it('refuses a pushed base that differs from the collections, naming what differs', () => {
    const differences = ['ALTER TABLE `places` ADD `extra` text;']
    expect(decideBaseline([{ name: 'dev', batch: -1 }], MIGRATIONS, differences)).toEqual({
      kind: 'refuse',
      differences,
    })
  })
})

describe('backupPath', () => {
  it('puts the copy under .backups beside the base, named by the moment and the last migration', () => {
    expect(backupPath('file:/data/cms.db', '20261115-162700', 'none')).toBe(
      '/data/.backups/cms-20261115-162700-none.db'
    )
  })

  it('refuses a base that is not a file', () => {
    expect(() => backupPath('libsql://remote.example', '20261115-162700', 'none')).toThrow(
      'the base is not a file'
    )
  })
})

describe('fileStamp', () => {
  it('writes a moment as YYYYMMDD-HHMMSS in UTC', () => {
    expect(fileStamp(new Date('2026-11-15T15:27:16.123Z'))).toBe('20261115-152716')
  })
})
