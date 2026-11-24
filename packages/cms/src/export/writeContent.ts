import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { contentFiles, contentText } from './contentFiles'

import type { ContentFile } from '@europe-historical-atlas/core/data/contentFormat'

/** Where the export is written: the atlas's `public/content/`, which the Cartographer serves too. */
export const CONTENT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../atlas/public/content'
)

/** The two files of an export, one per reader. */
export type ContentFileName = 'atlas.json' | 'cartographer.json'

/** How an export's file is written — the disk in the script and the CMS, a stand-in in a test. */
export type ContentWriter = (name: ContentFileName, text: string) => Promise<void>

/** What an export wrote, counted — what the script prints and the CMS's button says. */
export interface ExportSummary {
  /** The events, in both files. */
  readonly events: number
  /** The city sheets the atlas shows, in `atlas.json`. */
  readonly atlasCities: number
  /** Every city sheet, in `cartographer.json`. */
  readonly cities: number
  /** The territories of the register, in `cartographer.json`. */
  readonly territories: number
}

/**
 * The writer that puts the files in a folder of the disk, made first. Each file is written beside its place under a
 * hidden name, then renamed over the old one — one step on the same disk — so a reader opening it meanwhile (the
 * Cartographer, the atlas's server) reads the old file or the new, never half of one (review SEC-003 of CMS-499). A
 * failed write removes its hidden file and lets the failure through.
 * @param dir - the folder
 * @returns the writer
 */
export function folderWriter(dir: string): ContentWriter {
  return async (name, text) => {
    await mkdir(dir, { recursive: true })
    const target = path.join(dir, name)
    const pending = path.join(dir, `.${name}.writing`)
    try {
      await writeFile(pending, text)
      await rename(pending, target)
    } catch (error: unknown) {
      await rm(pending, { force: true })
      throw error
    }
  }
}

/**
 * Write an export read out of the base as its two files (CMS-223, ATLAS-295, CMS-499): `atlas.json`, what the atlas
 * shows, and `cartographer.json`, everything. Both texts are made before either is written, so what can fail between
 * the two writes is the disk alone: should the second fail, the pair is of two exports — said by the test of the
 * committed files (`committedContent.test.ts`), and mended by running the export again.
 * @param content - the content read out of the base (`readContent`), which refuses a wrong record before this
 * @param write - how each file is written
 * @returns what was written, counted
 */
export async function writeContent(
  content: ContentFile,
  write: ContentWriter
): Promise<ExportSummary> {
  const files = contentFiles(content)
  const texts = { atlas: contentText(files.atlas), cartographer: contentText(files.cartographer) }
  await write('atlas.json', texts.atlas)
  await write('cartographer.json', texts.cartographer)
  return {
    events: content.events.length,
    atlasCities: files.atlas.cities.length,
    cities: content.cities.length,
    territories: files.cartographer.territories?.length ?? 0,
  }
}
