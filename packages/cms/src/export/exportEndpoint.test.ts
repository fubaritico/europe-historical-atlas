import { afterEach, describe, expect, it, vi } from 'vitest'

import { CONTENT_FORMAT_VERSION } from '@europe-historical-atlas/core/data/contentFormat'

import { exportBase, exportEndpoint } from './exportEndpoint'

import type { ExportRequest, ExportSteps } from './exportEndpoint'
import type { ContentCity, ContentFile } from '@europe-historical-atlas/core/data/contentFormat'

/** A signed-in contributor. */
const SIGNED_IN = { user: { id: 1 } } as unknown as ExportRequest

/** One event and two cities, one shown in the atlas. */
const CONTENT: ContentFile = {
  version: CONTENT_FORMAT_VERSION,
  events: [],
  cities: [
    { id: 'a', showInAtlas: true } as ContentCity,
    { id: 'b', showInAtlas: false } as ContentCity,
  ],
}

/**
 * The export's two steps, as stand-ins.
 * @param read - what reading the base does
 * @param write - what writing a file does
 * @returns the steps
 */
function steps(
  read: () => Promise<ContentFile> = () => Promise.resolve(CONTENT),
  write: ExportSteps['write'] = () => Promise.resolve()
): ExportSteps & { write: ReturnType<typeof vi.fn> } {
  return { read, write: vi.fn(write) }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exportBase', () => {
  describe('happy path', () => {
    it('reads the base, writes the two files and answers what it wrote', async () => {
      const exportSteps = steps()
      const response = await exportBase(SIGNED_IN, exportSteps)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        events: 0,
        atlasCities: 1,
        cities: 2,
        territories: 0,
      })
      expect(exportSteps.write).toHaveBeenCalledTimes(2)
    })
  })

  describe('variants', () => {
    it('is the route POST /export-content', () => {
      expect([exportEndpoint.method, exportEndpoint.path]).toEqual(['post', '/export-content'])
    })
  })

  describe('managed errors', () => {
    it('refuses a caller not signed in, reading nothing', async () => {
      const read = vi.fn(() => Promise.resolve(CONTENT))
      const response = await exportBase({ user: null }, steps(read))
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Non connecté.' })
      expect(read).not.toHaveBeenCalled()
    })

    it('says which record the export refuses and why, writing no file, and logs it', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const exportSteps = steps(() =>
        Promise.reject(new Error('the city sheet 1455 names no holder'))
      )
      const response = await exportBase(SIGNED_IN, exportSteps)
      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({
        error:
          'L’export est refusé, aucun fichier n’est écrit : the city sheet 1455 names no holder',
      })
      expect(exportSteps.write).not.toHaveBeenCalled()
      expect(error).toHaveBeenCalledWith('[CMS] the export refused the base', expect.any(Error))
    })

    it('says a file that cannot be written without the disk’s words, which go to the log', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const response = await exportBase(
        SIGNED_IN,
        steps(undefined, () =>
          Promise.reject(new Error("ENOSPC: no space left, open '/Users/someone/atlas.json'"))
        )
      )
      expect(response.status).toBe(500)
      const { error: sentence } = (await response.json()) as { error: string }
      expect(sentence).toBe(
        'Les fichiers de l’export n’ont pas pu être écrits dans le dossier de l’atlas : relancez l’export (le détail est dans la console du serveur).'
      )
      expect(sentence).not.toContain('/Users/')
      expect(error).toHaveBeenCalledWith(
        '[CMS] the export could not write its files',
        expect.any(Error)
      )
      expect(String(error.mock.calls[0]?.[1])).toContain('ENOSPC')
    })

    it('refuses a second export while one runs, and runs again once it is done', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      let finishRead: (content: ContentFile) => void = () => undefined
      const first = exportBase(
        SIGNED_IN,
        steps(
          () =>
            new Promise<ContentFile>((resolve) => {
              finishRead = resolve
            })
        )
      )
      const second = await exportBase(SIGNED_IN, steps())
      expect(second.status).toBe(409)
      expect(await second.json()).toEqual({
        error: 'Un export est déjà en cours : attendez son message, puis relancez-le si besoin.',
      })
      expect(warn).toHaveBeenCalledWith('[CMS] an export was asked while another runs: refused')
      finishRead(CONTENT)
      expect((await first).status).toBe(200)
      expect((await exportBase(SIGNED_IN, steps())).status).toBe(200)
    })

    it('runs again after an export that failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      await exportBase(
        SIGNED_IN,
        steps(() => Promise.reject(new Error('refused')))
      )
      expect((await exportBase(SIGNED_IN, steps())).status).toBe(200)
    })
  })

  describe('unmanaged errors', () => {
    it('words a thrown value that is not an error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const response = await exportBase(
        SIGNED_IN,
        // Not an Error, as a library may throw: a value whose words are its string.
        steps(vi.fn<() => Promise<ContentFile>>().mockRejectedValue('base locked'))
      )
      expect(await response.json()).toEqual({
        error: 'L’export est refusé, aucun fichier n’est écrit : base locked',
      })
    })
  })

  // L5: N/A — an empty base is counted by `writeContent.test.ts`.
})
