import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  CONTENT_FORMAT_VERSION,
  contentFileSchema,
} from '@europe-historical-atlas/core/data/contentFormat'

import { contentFiles } from './contentFiles'

/** The folder the export's two files are committed in — where `run.ts` writes them. */
const COMMITTED = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content'
)

/**
 * Read a committed content file.
 * @param name - `atlas.json` or `cartographer.json`
 * @returns its parsed JSON
 */
function committed(name: string): unknown {
  return JSON.parse(readFileSync(path.join(COMMITTED, name), 'utf8'))
}

// The dev, 2026-11-14: a change of the content format is never committed without the export that follows it — the
// atlas and the Cartographer refuse a whole file of another version, its events and its cities alike. When this
// fails: run `pnpm export:content`, and commit the files with the code.
describe.each(['atlas.json', 'cartographer.json'])('the committed %s', (name) => {
  const content = committed(name)

  it('is of the version the code reads', () => {
    expect((content as { version?: unknown }).version).toBe(CONTENT_FORMAT_VERSION)
  })

  it('is read whole by the content schema', () => {
    const answer = contentFileSchema.safeParse(content)
    expect(answer.success ? 'read' : answer.error.issues.slice(0, 3)).toBe('read')
  })
})

// CMS-223: the two files are one export — the atlas's is the Cartographer's without the cities the atlas does not
// show. Committed apart, the map and the Cartographer would disagree on a city.
describe('the two committed files', () => {
  it('are of one export: the atlas’s file is what the split makes of the Cartographer’s', () => {
    const whole = contentFileSchema.parse(committed('cartographer.json'))
    const atlas = contentFileSchema.parse(committed('atlas.json'))
    expect(atlas).toEqual(contentFiles(whole).atlas)
  })

  it('leave in the atlas’s file only cities ticked « show in the atlas »', () => {
    const atlas = contentFileSchema.parse(committed('atlas.json'))
    expect(atlas.cities.every(({ showInAtlas }) => showInAtlas)).toBe(true)
  })
})
