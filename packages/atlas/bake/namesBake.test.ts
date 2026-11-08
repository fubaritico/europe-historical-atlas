// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { readBakedNames } from '@europe-historical-atlas/core/pipeline/bakedNames'

import { AUTHORED_FILES, META } from '../src/loading/testing/yearFixtures'

import { namesBake } from './namesBake'

import type { NamesBakePaths } from './namesBake'

/** Every character measured alike: the placement's outcome is not this suite's subject. */
const MEASURE = (characters: readonly string[]) =>
  Object.fromEntries(characters.map((c) => [c, { advance: 0.5, ascent: 0.7, descent: 0.2 }]))

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true })
})

/**
 * A public folder on disk holding the fixture's year, listed under the given years.
 * @param years - the years the manifest lists
 * @param registry - the year's registry, the fixture's unless given
 * @returns the plugin's paths into it
 */
function publicFolder(
  years: number[],
  registry: unknown = AUTHORED_FILES.registry
): NamesBakePaths {
  const root = mkdtempSync(join(tmpdir(), 'names-bake-'))
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
  writeFileSync(join(root, 'meta.json'), JSON.stringify(META))
  writeFileSync(join(root, 'face.woff2'), 'not read: the measure is a stand-in')
  return { publicDir: root, face: join(root, 'face.woff2'), heightmapMeta: join(root, 'meta.json') }
}

/**
 * Run the plugin's bundle hook as the build would, on a context that records what it emits and says.
 * @param paths - where the plugin reads
 * @returns the files emitted and the lines said
 */
function build(paths: NamesBakePaths) {
  const plugin = namesBake(paths, () => MEASURE)
  const hook = plugin.generateBundle
  if (typeof hook !== 'function') throw new Error('test: the bundle hook is not a function')
  const context = { emitFile: vi.fn(), info: vi.fn() }
  // The hook is synchronous here; its declared type allows a promise.
  void hook.call(
    context as unknown as ThisParameterType<typeof hook>,
    ...([{}, {}, false] as unknown as Parameters<typeof hook>)
  )
  return context
}

// ATLAS-333: the build writes each year's names where the page fetches them, `years/<year>/names.json`.
describe('namesBake', () => {
  describe('happy path', () => {
    it('writes 1100’s names into the site at years/1100/names.json, readable by the page', () => {
      const { emitFile } = build(publicFolder([1100]))
      expect(emitFile).toHaveBeenCalledOnce()
      const [asset] = emitFile.mock.calls[0] as [{ type: string; fileName: string; source: string }]
      expect([asset.type, asset.fileName]).toEqual(['asset', 'years/1100/names.json'])
      expect(
        readBakedNames(JSON.parse(asset.source), asset.fileName).names.levels.length
      ).toBeGreaterThan(0)
    })
  })

  describe('variants', () => {
    it('runs at the build only, never on the dev server', () => {
      expect(namesBake(publicFolder([1100]), () => MEASURE).apply).toBe('build')
    })

    it('says how long each year took as information, not as a warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { info } = build(publicFolder([1100]))
      expect(info).toHaveBeenCalledWith(
        expect.stringMatching(/^1100: names placed at the build in \d+ ms$/)
      )
      expect(warn).not.toHaveBeenCalled()
      warn.mockRestore()
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
