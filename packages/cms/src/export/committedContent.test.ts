import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  CONTENT_FORMAT_VERSION,
  contentFileSchema,
} from '@europe-historical-atlas/core/data/contentFormat'

/** The content file the atlas reads, as committed — where `run.ts` writes it. */
const COMMITTED = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content/events.json'
)

// The dev, 2026-11-14: a change of the content format is never committed without the export that follows it — the
// atlas and the Cartographer refuse a whole file of another version, its events and its cities alike. When this
// fails: run `pnpm export:content`, and commit the file with the code.
describe('the committed content file', () => {
  const content: unknown = JSON.parse(readFileSync(COMMITTED, 'utf8'))

  it('is of the version the code reads', () => {
    expect((content as { version?: unknown }).version).toBe(CONTENT_FORMAT_VERSION)
  })

  it('is read whole by the content schema', () => {
    const answer = contentFileSchema.safeParse(content)
    expect(answer.success ? 'read' : answer.error.issues.slice(0, 3)).toBe('read')
  })
})
