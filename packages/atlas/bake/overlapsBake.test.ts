// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  overlapsKey,
  readBakedOverlaps,
} from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

import { AUTHORED_FILES, META } from '../src/loading/testing/yearFixtures'

import { overlapsBake } from './overlapsBake'

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true })
})

/**
 * A public folder on disk holding the fixture's year, listed under the given years.
 * @param years - the years the manifest lists
 * @param registry - the year's registry, the fixture's unless given
 * @returns the folder
 */
function publicFolder(years: number[], registry: unknown = AUTHORED_FILES.registry): string {
  const root = mkdtempSync(join(tmpdir(), 'overlaps-bake-'))
  folders.push(root)
  mkdirSync(join(root, 'years', '1100'), { recursive: true })
  writeFileSync(
    join(root, 'years', 'index.json'),
    JSON.stringify({ version: 1, bbox: META.bbox, years })
  )
  writeFileSync(join(root, 'years', '1100', 'registry.json'), JSON.stringify(registry))
  writeFileSync(
    join(root, 'years', '1100', 'polities.json'),
    JSON.stringify(AUTHORED_FILES.polities)
  )
  writeFileSync(join(root, 'years', '1100', 'borders.json'), JSON.stringify(AUTHORED_FILES.borders))
  return root
}

/**
 * Run the plugin's bundle hook as the build would, on a context that records what it emits and says.
 * @param publicDir - where the plugin reads
 * @returns the files emitted and the lines said
 */
function build(publicDir: string) {
  const hook = overlapsBake(publicDir).generateBundle
  if (typeof hook !== 'function') throw new Error('test: the bundle hook is not a function')
  const context = { emitFile: vi.fn(), info: vi.fn(), warn: vi.fn() }
  void hook.call(
    context as unknown as ThisParameterType<typeof hook>,
    ...([{}, {}, false] as unknown as Parameters<typeof hook>)
  )
  return context
}

// ATLAS-399: the build writes each year's overlaps where the page fetches them, `years/<year>/overlaps.json`.
describe('overlapsBake', () => {
  describe('happy path', () => {
    it('writes 1100’s overlaps at years/1100/overlaps.json, under the key the page computes', () => {
      const { emitFile } = build(publicFolder([1100]))
      const [asset] = emitFile.mock.calls[0] as [{ type: string; fileName: string; source: string }]
      const read = readBakedOverlaps(JSON.parse(asset.source), asset.fileName)
      expect([asset.type, asset.fileName, read.key]).toEqual([
        'asset',
        'years/1100/overlaps.json',
        overlapsKey(AUTHORED_FILES),
      ])
    })
  })

  describe('variants', () => {
    it('runs at the build only, never on the dev server', () => {
      expect(overlapsBake(publicFolder([1100])).apply).toBe('build')
    })

    it('says how many overlaps and how long as information, no warning when nothing is refused', () => {
      const { info, warn } = build(publicFolder([1100]))
      expect([String(info.mock.calls[0]?.[0]), warn.mock.calls.length]).toEqual([
        expect.stringMatching(/^1100: \d+ overlaps computed at the build in \d+ ms$/),
        0,
      ])
    })
  })

  describe('managed errors', () => {
    it('stops the build on a year whose registry does not read', () => {
      expect(() => build(publicFolder([1100], { nonsense: true }))).toThrow('registry.json')
    })
  })

  describe('unmanaged errors', () => {
    it('stops the build on a year the manifest lists and the folder lacks', () => {
      expect(() => build(publicFolder([1100, 1200]))).toThrow('1200')
    })
  })

  describe('edge cases', () => {
    it('writes nothing for a manifest listing no year', () => {
      expect(build(publicFolder([])).emitFile).not.toHaveBeenCalled()
    })
  })
})
