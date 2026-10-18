import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { yearStamp } from '@europe-historical-atlas/core/data/yearStamp'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { MAX_BODY_BYTES, isSameMachineRequest } from './httpEndpoint'
import { createYearWriteMiddleware, handleYearWrite } from './yearWriteEndpoint'

import type { YearFolder } from './diskFolder'
import type { BodyStream, EndpointRequest, ResponseSink } from './httpEndpoint'

/** The manifest as committed today. */
const MANIFEST = JSON.stringify({
  version: 1,
  bbox: { west: -45, south: 11, east: 78.75, north: 76.84 },
  years: [],
})

/**
 * A years folder in memory, recording every write and rename in order. A file's modification time is the
 * one given in `times`, or 0; a missing file has none.
 */
function memoryFolder(
  initial: Record<string, string> = { 'index.json': MANIFEST },
  times: Record<string, number> = {}
) {
  const files = new Map(Object.entries(initial))
  const log: string[] = []
  const folder: YearFolder = {
    read: (path) => files.get(path) ?? null,
    modifiedAt: (path) => (files.has(path) ? (times[path] ?? 0) : null),
    write: (path, text) => {
      log.push(`write ${path}`)
      files.set(path, text)
    },
    rename: (from, to) => {
      log.push(`rename ${from} → ${to}`)
      const text = files.get(from)
      if (text === undefined) throw new Error(`no ${from}`)
      files.set(to, text)
      files.delete(from)
    },
  }
  return { folder, files, log }
}

/** A save of the fixture year, from the page this server served. */
function saveRequest(overrides: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: 'PUT',
    path: '/1100',
    host: 'localhost:5174',
    origin: 'http://localhost:5174',
    body: JSON.stringify(saveYearDocument(sharedBorderDocument())),
    ...overrides,
  }
}

/**
 * The fingerprint of year 1100 as the folder holds it now.
 * @param files - the folder's files
 */
function stampOnDisk(files: Map<string, string>): string {
  return yearStamp({
    registry: files.get('1100/registry.json') ?? null,
    polities: files.get('1100/polities.json') ?? null,
    borders: files.get('1100/borders.json') ?? null,
  })
}

/** Year 1100 as some other writer left it on disk, listed in the manifest, written at three times. */
function savedYear() {
  const listed = JSON.stringify({ ...(JSON.parse(MANIFEST) as object), years: [1100] })
  return memoryFolder(
    {
      'index.json': listed,
      '1100/registry.json': 'registry on disk',
      '1100/polities.json': 'polities on disk',
      '1100/borders.json': 'borders on disk',
    },
    {
      '1100/registry.json': 1_000,
      '1100/polities.json': 3_000,
      '1100/borders.json': 2_000,
    }
  )
}

/** The fingerprint of {@link savedYear}'s files, as the page that opened them holds it. */
const OPENED_STAMP = yearStamp({
  registry: 'registry on disk',
  polities: 'polities on disk',
  borders: 'borders on disk',
})

/** The body of a response, parsed. */
function bodyOf(response: { body: string }): Record<string, unknown> {
  return JSON.parse(response.body) as Record<string, unknown>
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleYearWrite', () => {
  describe('happy path', () => {
    it('writes the three files and the manifest, and says which', () => {
      const { folder, files } = memoryFolder()
      const response = handleYearWrite(saveRequest(), folder)

      expect(response.status).toBe(200)
      expect(bodyOf(response)).toEqual({
        year: 1100,
        written: ['1100/registry.json', '1100/polities.json', '1100/borders.json', 'index.json'],
        stamp: stampOnDisk(files),
      })
      expect([...files.keys()].sort()).toEqual(
        ['1100/borders.json', '1100/polities.json', '1100/registry.json', 'index.json'].sort()
      )
    })

    it('writes everything beside its target before renaming anything into place', () => {
      // The naive endpoint writes each file straight to its name: a failure on the second leaves a new
      // registry beside an old territory, a pair the next open refuses.
      const { folder, log } = memoryFolder()
      handleYearWrite(saveRequest(), folder)
      const firstRename = log.findIndex((entry) => entry.startsWith('rename'))

      expect(log.slice(0, firstRename).every((entry) => entry.endsWith('.tmp'))).toBe(true)
      expect(log.slice(firstRename).every((entry) => entry.startsWith('rename'))).toBe(true)
    })
  })

  describe('variants', () => {
    it('accepts 127.0.0.1 and [::1] as well as localhost', () => {
      for (const host of ['127.0.0.1:5174', '[::1]:5174', 'localhost']) {
        const response = handleYearWrite(
          saveRequest({ host, origin: `http://${host}` }),
          memoryFolder().folder
        )

        expect(response.status, host).toBe(200)
      }
    })

    it('overwrites a saved year in place, leaving the manifest untouched', () => {
      const listed = JSON.stringify({ ...JSON.parse(MANIFEST), years: [1100] })
      const { folder, files } = memoryFolder({ 'index.json': listed, '1100/registry.json': 'old' })
      handleYearWrite(saveRequest(), folder)

      expect(files.get('1100/registry.json')).not.toBe('old')
      expect(files.get('index.json')).toBe(listed)
    })
  })

  describe('managed errors', () => {
    it('refuses a page served by another site, writing nothing', () => {
      const { folder, log } = memoryFolder()
      const response = handleYearWrite(saveRequest({ origin: 'https://evil.example' }), folder)

      expect(response.status).toBe(403)
      expect(log).toEqual([])
    })

    it('refuses a DNS-rebound name, whose page is same-origin with itself', () => {
      const response = handleYearWrite(
        saveRequest({ host: 'evil.example:5174', origin: 'http://evil.example:5174' }),
        memoryFolder().folder
      )

      expect(response.status).toBe(403)
    })

    it('refuses a method other than PUT', () => {
      expect(handleYearWrite(saveRequest({ method: 'POST' }), memoryFolder().folder).status).toBe(
        405
      )
    })

    it('refuses a body that is not JSON, and says so in the console', () => {
      const response = handleYearWrite(saveRequest({ body: '{ nope' }), memoryFolder().folder)

      expect(response.status).toBe(400)
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not JSON'))
    })

    it('passes a refusal of the plan on, with its status and its reason', () => {
      const response = handleYearWrite(saveRequest({ path: '/1110' }), memoryFolder().folder)

      expect(response.status).toBe(422)
      expect(bodyOf(response).reason).toBe(
        'the files say year 1100, the save was addressed to 1110'
      )
      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the previous year whole when a write fails before any rename', () => {
      const { folder, files } = memoryFolder({
        'index.json': MANIFEST,
        '1100/registry.json': 'old',
      })
      let writes = 0
      const failing: YearFolder = {
        ...folder,
        write: (path, text) => {
          writes += 1
          if (writes === 2) throw new Error('disk full')
          folder.write(path, text)
        },
      }

      expect(() => handleYearWrite(saveRequest(), failing)).toThrow('disk full')
      expect(files.get('1100/registry.json')).toBe('old')
    })

    it('refuses a request with no Origin at all', () => {
      expect(
        handleYearWrite(saveRequest({ origin: undefined }), memoryFolder().folder).status
      ).toBe(403)
    })
  })

  describe('edge cases', () => {
    it('reads a missing path as an empty year segment, refused', () => {
      expect(handleYearWrite(saveRequest({ path: undefined }), memoryFolder().folder).status).toBe(
        400
      )
    })
  })
})

describe('handleYearWrite, conditional on the year the page opened (CARTO-238, rung 3)', () => {
  describe('happy path', () => {
    it('writes over the year when If-Match is the stamp of the files on disk, answering the new stamp', () => {
      const { folder, files } = savedYear()
      const response = handleYearWrite(saveRequest({ ifMatch: OPENED_STAMP }), folder)

      expect(response.status).toBe(200)
      expect(files.get('1100/registry.json')).not.toBe('registry on disk')
      expect(bodyOf(response).stamp).toBe(stampOnDisk(files))
    })
  })

  describe('variants', () => {
    it('writes unconditionally when no If-Match is sent, as before rung 3', () => {
      const { folder, files } = savedYear()
      const response = handleYearWrite(saveRequest(), folder)

      expect(response.status).toBe(200)
      expect(files.get('1100/polities.json')).not.toBe('polities on disk')
    })

    it('accepts the stamp a first save answered as the If-Match of a second save', () => {
      const { folder } = savedYear()
      const first = handleYearWrite(saveRequest({ ifMatch: OPENED_STAMP }), folder)
      const stamp = bodyOf(first).stamp
      if (typeof stamp !== 'string') throw new Error('the first save answered no stamp')
      const second = handleYearWrite(saveRequest({ ifMatch: stamp }), folder)

      expect(second.status).toBe(200)
    })
  })

  describe('managed errors', () => {
    it('refuses with 412 when If-Match differs from the files on disk, writing nothing', () => {
      const { folder, files, log } = savedYear()
      const response = handleYearWrite(saveRequest({ ifMatch: 'deadbeef' }), folder)

      expect(response.status).toBe(412)
      expect(log).toEqual([])
      expect([...files.keys()].some((path) => path.endsWith('.tmp'))).toBe(false)
      expect(files.get('1100/registry.json')).toBe('registry on disk')
      expect(files.get('1100/polities.json')).toBe('polities on disk')
      expect(files.get('1100/borders.json')).toBe('borders on disk')
    })

    it('answers the reason and the latest modification time of the three files with the 412', () => {
      const { folder } = savedYear()
      const response = handleYearWrite(saveRequest({ ifMatch: 'deadbeef' }), folder)

      expect(bodyOf(response)).toEqual({
        reason: '1100 was changed on disk since it was opened',
        changedAt: 3_000,
      })
    })

    it('logs a 412 refusal once in the console', () => {
      const { folder } = savedYear()
      handleYearWrite(saveRequest({ ifMatch: 'deadbeef' }), folder)

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('1100 changed on disk since it was opened')
      )
    })

    it('refuses with 412 an If-Match that was the stamp before another write', () => {
      const { folder } = savedYear()
      handleYearWrite(saveRequest(), folder)

      expect(handleYearWrite(saveRequest({ ifMatch: OPENED_STAMP }), folder).status).toBe(412)
    })
  })

  // L4: N/A — a disk that throws while stamping is the 500 path of the middleware, tested below.

  describe('edge cases', () => {
    it('refuses with 412 and changedAt null when the year files are gone from disk', () => {
      const { folder } = memoryFolder()
      const response = handleYearWrite(saveRequest({ ifMatch: OPENED_STAMP }), folder)

      expect(response.status).toBe(412)
      expect(bodyOf(response)).toEqual({
        reason: '1100 was changed on disk since it was opened',
        changedAt: null,
      })
    })

    it('takes changedAt from the one year file still on disk', () => {
      const { folder } = memoryFolder(
        { 'index.json': MANIFEST, '1100/borders.json': 'borders on disk' },
        { '1100/borders.json': 5_000 }
      )

      expect(bodyOf(handleYearWrite(saveRequest({ ifMatch: 'deadbeef' }), folder)).changedAt).toBe(
        5_000
      )
    })
  })
})

describe('isSameMachineRequest', () => {
  it('requires the Origin to name the very host, scheme included', () => {
    expect(isSameMachineRequest('localhost:5174', 'http://localhost:5174')).toBe(true)
    expect(isSameMachineRequest('localhost:5174', 'https://localhost:5174')).toBe(false)
    expect(isSameMachineRequest('localhost:5174', 'http://localhost:5175')).toBe(false)
    expect(isSameMachineRequest('localhost.evil.example', 'http://localhost.evil.example')).toBe(
      false
    )
  })
})

/** A request stream that replays the chunks given, then ends. */
function streamOf(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  const listeners = new Map<string, ((chunk?: Uint8Array) => void)[]>()
  const stream: BodyStream & { emit: () => void } = {
    method: 'PUT',
    url: '/1100',
    headers: { host: 'localhost:5174', origin: 'http://localhost:5174', ...headers },
    on: (event, listener) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
      return stream
    },
    emit: () => {
      for (const chunk of chunks)
        for (const listener of listeners.get('data') ?? []) listener(chunk)
      for (const listener of listeners.get('end') ?? []) listener()
    },
  }
  return stream
}

/** A response that records what was sent. */
function sink() {
  const sent: { status: number; body: string | undefined; ends: number } = {
    status: 0,
    body: undefined,
    ends: 0,
  }
  const res: ResponseSink = {
    statusCode: 0,
    setHeader: () => res,
    end: (body) => {
      sent.status = res.statusCode
      sent.body = body
      sent.ends += 1
      return res
    },
  }
  return { res, sent }
}

describe('createYearWriteMiddleware', () => {
  it('reads a body sent in several chunks and saves it', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(saveYearDocument(sharedBorderDocument())))
    const req = streamOf([bytes.slice(0, 100), bytes.slice(100)])
    const { res, sent } = sink()
    createYearWriteMiddleware(memoryFolder().folder)(req, res)
    req.emit()

    expect(sent.status).toBe(200)
  })

  it('refuses a body larger than the cap once, answering 413 without cutting the connection', () => {
    const big = new Uint8Array(MAX_BODY_BYTES + 1)
    const req = streamOf([big, new Uint8Array(1)])
    const { res, sent } = sink()
    createYearWriteMiddleware(memoryFolder().folder)(req, res)
    req.emit()

    expect(sent.status).toBe(413)
    expect(sent.ends).toBe(1)
  })

  it('passes the If-Match header on to the endpoint, which refuses a stale one with 412', () => {
    const req = streamOf(
      [new TextEncoder().encode(JSON.stringify(saveYearDocument(sharedBorderDocument())))],
      { 'if-match': 'deadbeef' }
    )
    const { res, sent } = sink()
    createYearWriteMiddleware(savedYear().folder)(req, res)
    req.emit()

    expect(sent.status).toBe(412)
  })

  it('answers 500 and logs when the disk fails, rather than claiming a save', () => {
    const folder: YearFolder = {
      read: () => MANIFEST,
      modifiedAt: () => null,
      write: () => {
        throw Object.assign(
          new Error("EACCES: permission denied, open '/Users/someone/years/1100'"),
          {
            code: 'EACCES',
          }
        )
      },
      rename: () => undefined,
    }
    const req = streamOf([
      new TextEncoder().encode(JSON.stringify(saveYearDocument(sharedBorderDocument()))),
    ])
    const { res, sent } = sink()
    createYearWriteMiddleware(folder)(req, res)
    req.emit()

    expect(sent.status).toBe(500)
    expect(JSON.parse(sent.body ?? '{}')).toEqual({ reason: 'the save failed on disk (EACCES)' })
    expect(console.error).toHaveBeenCalled()
  })
})
