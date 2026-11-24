import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { CONTENT_FORMAT_VERSION } from '@europe-historical-atlas/core/data/contentFormat'

import { contentText } from './contentFiles'
import { folderWriter, writeContent } from './writeContent'

import type { ContentFileName } from './writeContent'
import type {
  ContentCity,
  ContentEvent,
  ContentFile,
  ContentTerritory,
} from '@europe-historical-atlas/core/data/contentFormat'

/**
 * A city sheet, shown in the atlas or not; the rest is never read here.
 * @param id - its id
 * @param showInAtlas - whether its sheet is ticked
 * @returns the sheet
 */
function city(id: string, showInAtlas: boolean): ContentCity {
  return { id, showInAtlas } as ContentCity
}

/** Two events, three cities — one shown — and two territories. */
const CONTENT: ContentFile = {
  version: CONTENT_FORMAT_VERSION,
  events: [{ id: 'e1' } as ContentEvent, { id: 'e2' } as ContentEvent],
  cities: [city('a', false), city('b', true), city('c', false)],
  territories: [
    { id: 't1' } as unknown as ContentTerritory,
    { id: 't2' } as unknown as ContentTerritory,
  ],
}

/**
 * A writer that keeps what it is handed, in order.
 * @returns the writer and the files it was handed
 */
function keeping() {
  const files: [ContentFileName, string][] = []
  const write = vi.fn((name: ContentFileName, text: string) => {
    files.push([name, text])
    return Promise.resolve()
  })
  return { write, files }
}

describe('writeContent', () => {
  describe('happy path', () => {
    it('writes the atlas’s file then the Cartographer’s, and counts what they hold', async () => {
      const { write, files } = keeping()
      const written = await writeContent(CONTENT, write)
      expect(files.map(([name]) => name)).toEqual(['atlas.json', 'cartographer.json'])
      expect(files[1]?.[1]).toBe(contentText(CONTENT))
      expect(written).toEqual({ events: 2, atlasCities: 1, cities: 3, territories: 2 })
    })
  })

  describe('variants', () => {
    it('counts no territory when the base has none', async () => {
      const { write } = keeping()
      const { territories: _left, ...noTerritory } = CONTENT
      expect((await writeContent(noTerritory, write)).territories).toBe(0)
    })

    it('writes both files in a folder it makes', async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'cms-export-'))
      const dir = path.join(root, 'content')
      await writeContent(CONTENT, folderWriter(dir))
      expect(await readFile(path.join(dir, 'cartographer.json'), 'utf8')).toBe(contentText(CONTENT))
      expect(JSON.parse(await readFile(path.join(dir, 'atlas.json'), 'utf8'))).toMatchObject({
        cities: [{ id: 'b' }],
      })
      await rm(root, { recursive: true })
    })
  })

  describe('managed errors', () => {
    it('removes its hidden file and lets the failure through when the file cannot take its place', async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'cms-export-'))
      // A folder where atlas.json goes: the hidden file is written, then cannot be renamed over it.
      await mkdir(path.join(root, 'atlas.json', 'in-the-way'), { recursive: true })
      await expect(writeContent(CONTENT, folderWriter(root))).rejects.toThrow()
      expect(await readdir(root)).toEqual(['atlas.json'])
      await rm(root, { recursive: true })
    })

    it('leaves the old file whole when the folder refuses the write', async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'cms-export-'))
      await writeFile(path.join(root, 'atlas.json'), 'the old export')
      await chmod(root, 0o555)
      await expect(writeContent(CONTENT, folderWriter(root))).rejects.toThrow()
      expect(await readFile(path.join(root, 'atlas.json'), 'utf8')).toBe('the old export')
      expect(await readdir(root)).toEqual(['atlas.json'])
      await chmod(root, 0o755)
      await rm(root, { recursive: true })
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failed write through, the second file not attempted', async () => {
      const write = vi.fn(() => Promise.reject(new Error('disk full')))
      await expect(writeContent(CONTENT, write)).rejects.toThrow('disk full')
      expect(write).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('writes and counts an empty base', async () => {
      const { write } = keeping()
      const empty: ContentFile = { version: CONTENT_FORMAT_VERSION, events: [], cities: [] }
      expect(await writeContent(empty, write)).toEqual({
        events: 0,
        atlasCities: 0,
        cities: 0,
        territories: 0,
      })
    })
  })
})
