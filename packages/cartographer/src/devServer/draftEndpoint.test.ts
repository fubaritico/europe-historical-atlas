import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDraftMiddleware, handleDraftRequest, setAsideName } from './draftEndpoint'

import type { DraftFolder } from './draftEndpoint'
import type { BodyStream, EndpointRequest, ResponseSink } from './httpEndpoint'

/** The clock every set-aside is named by. */
const NOW = new Date('2026-10-17T15:42:07.123Z')

/** A draft of 1100, as the page sends it. */
const DRAFT = JSON.stringify({
  year: 1100,
  savedAt: '2026-10-17T15:42:05.000Z',
  files: { any: 'thing' },
})

/** A drafts folder in memory, recording every change in order. */
function memoryFolder(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial))
  const log: string[] = []
  const folder: DraftFolder = {
    read: (path) => files.get(path) ?? null,
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
    remove: (path) => {
      log.push(`remove ${path}`)
      files.delete(path)
    },
  }
  return { folder, files, log }
}

/** A request from the page this server served. */
function request(overrides: Partial<EndpointRequest> = {}): EndpointRequest {
  return {
    method: 'PUT',
    path: '/1100',
    host: 'localhost:5173',
    origin: 'http://localhost:5173',
    body: DRAFT,
    ...overrides,
  }
}

/** Answer a request over a folder, with the fixed clock. */
function answer(req: EndpointRequest, folder: DraftFolder) {
  const response = handleDraftRequest(req, folder, () => NOW)
  return { status: response.status, body: JSON.parse(response.body) as unknown }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('handleDraftRequest', () => {
  describe('happy path', () => {
    it('writes a PUT draft beside its target, then renames it over the target', () => {
      const { folder, files, log } = memoryFolder()

      const response = answer(request(), folder)

      expect(response.status).toBe(200)
      expect(files.get('1100.json')).toBe(DRAFT)
      expect(log).toEqual(['write 1100.json.tmp', 'rename 1100.json.tmp → 1100.json'])
    })

    it('answers a GET with the draft kept, byte for byte', () => {
      const { folder } = memoryFolder({ '1100.json': DRAFT })

      const response = handleDraftRequest(
        request({ method: 'GET', origin: undefined, body: '' }),
        folder,
        () => NOW
      )

      expect(response).toEqual({ status: 200, body: DRAFT })
    })
  })

  describe('variants', () => {
    it('removes the draft on DELETE and says it was there', () => {
      const { folder, files } = memoryFolder({ '1100.json': DRAFT })

      const response = answer(request({ method: 'DELETE', body: '' }), folder)

      expect(response).toEqual({ status: 200, body: { year: 1100, removed: true } })
      expect(files.has('1100.json')).toBe(false)
    })

    it('answers a DELETE of no draft as done, removing nothing', () => {
      const { folder, log } = memoryFolder()

      const response = answer(request({ method: 'DELETE', body: '' }), folder)

      expect(response).toEqual({ status: 200, body: { year: 1100, removed: false } })
      expect(log).toEqual([])
    })

    it('sets a draft aside under a dated name on POST /<year>/set-aside', () => {
      const { folder, files } = memoryFolder({ '1100.json': DRAFT })

      const response = answer(
        request({ method: 'POST', path: '/1100/set-aside', body: '' }),
        folder
      )

      expect(response.status).toBe(200)
      expect(files.has('1100.json')).toBe(false)
      expect(files.get('1100.set-aside-2026-10-17T15-42-07Z.json')).toBe(DRAFT)
    })

    it('accepts a year before Christ in the path', () => {
      const { folder, files } = memoryFolder()

      answer(request({ path: '/-44', body: JSON.stringify({ year: -44 }) }), folder)

      expect(files.has('-44.json')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses a write from another origin with 403', () => {
      const { folder, log } = memoryFolder()

      const response = answer(request({ origin: 'https://evil.example' }), folder)

      expect(response.status).toBe(403)
      expect(log).toEqual([])
    })

    it('refuses a read whose Host is not a loopback name — a DNS-rebound page', () => {
      const { folder } = memoryFolder({ '1100.json': DRAFT })

      const response = answer(
        request({ method: 'GET', host: 'evil.example:5173', origin: undefined }),
        folder
      )

      expect(response.status).toBe(403)
    })

    it('answers a GET of no draft with 404', () => {
      const { folder } = memoryFolder()

      expect(answer(request({ method: 'GET', origin: undefined }), folder).status).toBe(404)
    })

    it('refuses a draft of another year than its path, writing nothing', () => {
      const { folder, log } = memoryFolder()

      const response = answer(request({ body: JSON.stringify({ year: 1200 }) }), folder)

      expect(response).toEqual({
        status: 400,
        body: { reason: 'the draft is of year 1200, not 1100' },
      })
      expect(log).toEqual([])
    })

    it('refuses to set aside a draft that is not there', () => {
      const { folder } = memoryFolder()

      expect(answer(request({ method: 'POST', path: '/1100/set-aside' }), folder).status).toBe(404)
    })

    it('refuses a set-aside that is not a POST', () => {
      const { folder } = memoryFolder({ '1100.json': DRAFT })

      expect(answer(request({ method: 'PUT', path: '/1100/set-aside' }), folder).status).toBe(405)
    })

    it('refuses a method the endpoint does not know', () => {
      const { folder } = memoryFolder()

      expect(answer(request({ method: 'PATCH' }), folder).status).toBe(405)
    })

    it('logs every refusal as a warning', () => {
      const { folder } = memoryFolder()

      answer(request({ origin: 'https://evil.example' }), folder)

      expect(console.warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a body that is not JSON', () => {
      const { folder } = memoryFolder()

      expect(answer(request({ body: '{not json' }), folder).body).toEqual({
        reason: 'the draft is not JSON',
      })
    })

    it('refuses a JSON body that does not say its year', () => {
      const { folder } = memoryFolder()

      expect(answer(request({ body: '[1100]' }), folder).body).toEqual({
        reason: 'the draft does not say its year',
      })
    })

    it('lets a failing disk throw, for the middleware to answer 500', () => {
      const { folder } = memoryFolder()
      folder.write = () => {
        throw Object.assign(new Error('full'), { code: 'ENOSPC' })
      }

      expect(() => handleDraftRequest(request(), folder, () => NOW)).toThrow('full')
    })
  })

  describe('edge cases', () => {
    it('refuses a path that would climb out of the folder', () => {
      const { folder, log } = memoryFolder()

      const response = answer(request({ path: '/../years/1100' }), folder)

      expect(response.status).toBe(404)
      expect(log).toEqual([])
    })

    it('refuses an empty path', () => {
      const { folder } = memoryFolder()

      expect(answer(request({ path: undefined }), folder).status).toBe(404)
    })

    it('keeps the previous draft whole when the write of the new one fails', () => {
      const { folder, files } = memoryFolder({ '1100.json': DRAFT })
      folder.write = () => {
        throw new Error('cut')
      }

      expect(() =>
        handleDraftRequest(
          request({ body: JSON.stringify({ year: 1100, v: 2 }) }),
          folder,
          () => NOW
        )
      ).toThrow()
      expect(files.get('1100.json')).toBe(DRAFT)
    })
  })
})

describe('setAsideName', () => {
  it('drops the milliseconds and the colons, which some disks refuse', () => {
    expect(setAsideName('1100', NOW)).toBe('1100.set-aside-2026-10-17T15-42-07Z.json')
  })
})

/** A request stream that delivers one body, then ends. */
function stream(body: string, overrides: Partial<BodyStream> = {}): BodyStream {
  const listeners = new Map<string, (chunk?: Uint8Array) => void>()
  queueMicrotask(() => {
    listeners.get('data')?.(new TextEncoder().encode(body))
    listeners.get('end')?.()
  })
  return {
    method: 'PUT',
    url: '/1100',
    headers: { host: 'localhost:5173', origin: 'http://localhost:5173' },
    on: (event, listener) => listeners.set(event, listener),
    ...overrides,
  }
}

/** A response sink that resolves when the body is sent. */
function sink() {
  let resolve: (value: { status: number; body: string }) => void = () => undefined
  const sent = new Promise<{ status: number; body: string }>((done) => {
    resolve = done
  })
  const res: ResponseSink = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (body) => {
      resolve({ status: res.statusCode, body: body ?? '' })
    },
  }
  return { res, sent }
}

describe('createDraftMiddleware', () => {
  it('reads the body whole and writes the draft', async () => {
    const { folder, files } = memoryFolder()
    const { res, sent } = sink()

    createDraftMiddleware(folder, () => NOW)(stream(DRAFT), res)

    expect((await sent).status).toBe(200)
    expect(files.get('1100.json')).toBe(DRAFT)
  })

  it('answers 500 naming the draft and the disk code when the disk fails', async () => {
    const { folder } = memoryFolder()
    folder.write = () => {
      throw Object.assign(new Error('full'), { code: 'ENOSPC' })
    }
    const { res, sent } = sink()

    createDraftMiddleware(folder, () => NOW)(stream(DRAFT), res)

    expect(await sent).toEqual({
      status: 500,
      body: JSON.stringify({ reason: 'the draft failed on disk (ENOSPC)' }),
    })
  })
})
