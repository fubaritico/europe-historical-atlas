import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ABSENT_YEAR, yearStamp } from '@europe-historical-atlas/core/data/yearStamp'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { YearChangedOnDisk, createDevServerYearArchive } from './yearArchive'

/** The three texts served for year 1100 — the fixture year, as a save writes it. */
const SERVED = (() => {
  const files = saveYearDocument(sharedBorderDocument())
  return {
    registry: JSON.stringify(files.registry),
    polities: JSON.stringify(files.polities),
    borders: JSON.stringify(files.borders),
  }
})()

/** The fingerprint of {@link SERVED}, as the page holds it once it opened the year. */
const SERVED_STAMP = yearStamp(SERVED)

/**
 * An archive over a stub fetch: GETs serve {@link SERVED}, PUTs answer each response of `saves` in turn
 * (a 200 with a fresh stamp once they run out). Every PUT's headers are kept, in order.
 */
function archiveWith(saves: (() => Response)[] = []) {
  const putHeaders: Headers[] = []
  const pending = [...saves]
  const fetchStub = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input !== 'string') throw new Error('the archive should fetch a path')
    if (init?.method === 'PUT') {
      putHeaders.push(new Headers(init.headers))
      const next = pending.shift()
      return Promise.resolve(
        next === undefined ? Response.json({ year: 1100, written: [], stamp: '00000000' }) : next()
      )
    }
    const name = /\/1100\/(registry|polities|borders)\.json$/.exec(input)?.[1]
    if (name === 'registry') return Promise.resolve(new Response(SERVED.registry))
    if (name === 'polities') return Promise.resolve(new Response(SERVED.polities))
    if (name === 'borders') return Promise.resolve(new Response(SERVED.borders))
    return Promise.resolve(new Response('', { status: 404 }))
  })
  const archive = createDevServerYearArchive({
    fetch: fetchStub,
    yearsBase: '/years',
    writeRoute: '/__years',
  })
  return { archive, putHeaders, fetchStub }
}

/** A 412 refusal, its body as given. */
const refusedWith = (body: unknown) => () => Response.json(body, { status: 412 })

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createDevServerYearArchive, conditional saves (CARTO-238, rung 3)', () => {
  describe('happy path', () => {
    it('sends no If-Match when opening, then the stamp of the three texts served with the next save', async () => {
      const { archive, putHeaders, fetchStub } = archiveWith()
      const document = await archive.open(1100)

      expect(
        fetchStub.mock.calls.every(
          ([, init]) => new Headers(init?.headers).get('if-match') === null
        )
      ).toBe(true)

      await archive.save(document)

      expect(putHeaders[0]?.get('if-match')).toBe(SERVED_STAMP)
    })
  })

  describe('variants', () => {
    // ARCH-002: a page that never read its year expects it absent — files that appeared are asked about.
    it('sends the stamp of no files with the save of a year never opened', async () => {
      const { archive, putHeaders } = archiveWith()
      await archive.save(sharedBorderDocument())

      expect(putHeaders[0]?.get('if-match')).toBe(yearStamp(ABSENT_YEAR))
    })

    it('sends no If-Match with a save told to overwrite', async () => {
      const { archive, putHeaders } = archiveWith()
      const document = await archive.open(1100)
      await archive.save(document, { overwrite: true })

      expect(putHeaders[0]?.has('if-match')).toBe(false)
    })

    it('sends the stamp a 200 answered with the save after it', async () => {
      const { archive, putHeaders } = archiveWith([
        () => Response.json({ year: 1100, written: [], stamp: 'abcdef01' }),
      ])
      const document = await archive.open(1100)
      await archive.save(document)
      await archive.save(document)

      expect(putHeaders[1]?.get('if-match')).toBe('abcdef01')
    })
  })

  describe('managed errors', () => {
    it('rejects a 412 with YearChangedOnDisk carrying the year and changedAt', async () => {
      const { archive } = archiveWith([refusedWith({ reason: 'changed', changedAt: 1_700_000 })])
      const document = await archive.open(1100)
      const saving = archive.save(document)

      await expect(saving).rejects.toBeInstanceOf(YearChangedOnDisk)
      await expect(saving).rejects.toMatchObject({ year: 1100, changedAt: 1_700_000 })
    })

    it('rejects a 412 whose body has no changedAt with changedAt null', async () => {
      const { archive } = archiveWith([refusedWith({ reason: 'changed' })])
      const document = await archive.open(1100)

      await expect(archive.save(document)).rejects.toMatchObject({ year: 1100, changedAt: null })
    })
  })

  describe('unmanaged errors', () => {
    it('logs once and sends no If-Match next time when a 200 comes back with no stamp', async () => {
      const { archive, putHeaders } = archiveWith([
        () => Response.json({ year: 1100, written: [] }),
      ])
      const document = await archive.open(1100)
      await archive.save(document)
      await archive.save(document)

      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] the save of 1100 came back with no fingerprint'
      )
      expect(putHeaders[1]?.has('if-match')).toBe(false)
    })

    it('still reports the year written when a 200 comes back with no stamp', async () => {
      const { archive } = archiveWith([() => Response.json({ year: 1100, written: [] })])

      expect(await archive.save(sharedBorderDocument())).toEqual({
        year: 1100,
        polities: 2,
        vertices: 6,
      })
    })
  })

  describe('edge cases', () => {
    it('rejects a 412 whose changedAt is not a number with changedAt null', async () => {
      const { archive } = archiveWith([refusedWith({ reason: 'changed', changedAt: 'yesterday' })])
      const document = await archive.open(1100)

      await expect(archive.save(document)).rejects.toMatchObject({ changedAt: null })
    })

    it('rejects a 412 whose body is not JSON with changedAt null', async () => {
      const { archive } = archiveWith([() => new Response('<html>412</html>', { status: 412 })])
      const document = await archive.open(1100)

      await expect(archive.save(document)).rejects.toMatchObject({ year: 1100, changedAt: null })
    })

    it('keeps the stamp it held after a 412, so the next plain save is still conditional', async () => {
      const { archive, putHeaders } = archiveWith([refusedWith({ changedAt: 1 })])
      const document = await archive.open(1100)
      await archive.save(document).catch(() => undefined)
      await archive.save(document)

      expect(putHeaders[1]?.get('if-match')).toBe(SERVED_STAMP)
    })
  })
})
