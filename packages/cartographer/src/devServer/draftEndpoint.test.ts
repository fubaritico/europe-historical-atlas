import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDraftMiddleware, handleDraftRequest, setAsideName } from './draftEndpoint'
import { snapshotName } from './snapshotEndpoint'

import type { SnapshotFolder } from './diskFolder'
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

/** A drafts or snapshots folder in memory, recording every change in order — and every read apart. */
function memoryFolder(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial))
  const log: string[] = []
  const reads: string[] = []
  const folder: DraftFolder & SnapshotFolder = {
    read: (path) => {
      reads.push(path)
      return files.get(path) ?? null
    },
    list: () => [...files.keys()],
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
  return { folder, files, log, reads }
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
function answer(
  req: EndpointRequest,
  folder: DraftFolder,
  snapshots: SnapshotFolder = memoryFolder().folder
) {
  const response = handleDraftRequest(req, folder, snapshots, () => NOW)
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
        memoryFolder().folder,
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

      expect(() => handleDraftRequest(request(), folder, memoryFolder().folder, () => NOW)).toThrow(
        'full'
      )
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
          memoryFolder().folder,
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

    createDraftMiddleware(folder, memoryFolder().folder, () => NOW)(stream(DRAFT), res)

    expect((await sent).status).toBe(200)
    expect(files.get('1100.json')).toBe(DRAFT)
  })

  it('answers 500 naming the draft and the disk code when the disk fails', async () => {
    const { folder } = memoryFolder()
    folder.write = () => {
      throw Object.assign(new Error('full'), { code: 'ENOSPC' })
    }
    const { res, sent } = sink()

    createDraftMiddleware(folder, memoryFolder().folder, () => NOW)(stream(DRAFT), res)

    expect(await sent).toEqual({
      status: 500,
      body: JSON.stringify({ reason: 'the draft failed on disk (ENOSPC)' }),
    })
  })
})

const snapshotRequest = (overrides: Partial<EndpointRequest> = {}): EndpointRequest =>
  request({ method: 'POST', path: '/1100/snapshot', ...overrides })

describe('handleDraftRequest, the hourly snapshot (CARTO-238, rung 2a)', () => {
  describe('happy path', () => {
    it('keeps the body under its dated name in the snapshots folder, beside then renamed', () => {
      const drafts = memoryFolder()
      const snapshots = memoryFolder()
      const name = snapshotName('1100', NOW)

      const response = answer(snapshotRequest(), drafts.folder, snapshots.folder)

      expect(response).toEqual({ status: 200, body: { year: 1100, snapshot: name } })
      expect(snapshots.files.get(name)).toBe(DRAFT)
      expect(snapshots.log).toEqual([`write ${name}.tmp`, `rename ${name}.tmp → ${name}`])
      expect(drafts.log).toEqual([])
    })
  })

  describe('variants', () => {
    it('names a snapshot by its year and its time, sortable and without colons', () => {
      expect(snapshotName('1100', NOW)).toBe('1100.2026-10-17T15-42-07Z.json')
    })
  })

  describe('managed errors', () => {
    it('refuses a snapshot sent with another method than POST', () => {
      const snapshots = memoryFolder()

      expect(
        answer(snapshotRequest({ method: 'PUT' }), memoryFolder().folder, snapshots.folder).status
      ).toBe(405)
      expect(snapshots.log).toEqual([])
    })

    it('refuses a snapshot whose body is of another year, writing nothing', () => {
      const snapshots = memoryFolder()

      const response = answer(
        snapshotRequest({ body: JSON.stringify({ year: 1200 }) }),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response.status).toBe(400)
      expect(snapshots.log).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a snapshot from a page another site served', () => {
      const snapshots = memoryFolder()

      const response = answer(
        snapshotRequest({ origin: 'https://elsewhere.example' }),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response.status).toBe(403)
      expect(snapshots.log).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('keeps two snapshots taken at two times, overwriting neither', () => {
      const snapshots = memoryFolder()
      const later = new Date(NOW.getTime() + 60 * 60 * 1000)
      handleDraftRequest(snapshotRequest(), memoryFolder().folder, snapshots.folder, () => NOW)
      handleDraftRequest(snapshotRequest(), memoryFolder().folder, snapshots.folder, () => later)

      expect([...snapshots.files.keys()].sort()).toEqual([
        snapshotName('1100', NOW),
        snapshotName('1100', later),
      ])
    })
  })
})

/** The snapshots folder of most listing tests: three of 1100, out of order, among files that are not. */
const SNAPSHOT_FILES: Record<string, string> = {
  '1100.2026-10-18T14-00-00Z.json': 'snapshot of 14:00',
  '1100.2026-10-18T15-01-02Z.json': 'snapshot of 15:01',
  '1100.2026-10-18T09-30-00Z.json': 'snapshot of 09:30',
  '1100.2026-10-18T16-00-00Z.json.tmp': 'a write cut short',
  '1200.2026-10-18T15-00-00Z.json': 'snapshot of another year',
  '11000.2026-10-18T15-00-00Z.json': 'snapshot of a year that starts like it',
  '1100.set-aside-2026-10-17T15-42-07Z.json': 'a set-aside draft',
  '1100.json': 'a draft',
  'notes.txt': 'a foreign file',
}

/** A read of the snapshots, as the page sends it — a GET, so no `Origin`. */
const snapshotsRead = (path: string, overrides: Partial<EndpointRequest> = {}): EndpointRequest =>
  request({ method: 'GET', path, origin: undefined, body: '', ...overrides })

/** Answer a request over a snapshots folder, the drafts folder empty. */
function answerSnapshots(req: EndpointRequest, snapshots: SnapshotFolder) {
  return handleDraftRequest(req, memoryFolder().folder, snapshots, () => NOW)
}

describe('handleDraftRequest, reading the snapshots back (CARTO-238, rung 2b)', () => {
  describe('happy path', () => {
    it('lists only the snapshots of 1100, newest first, each with its time as ISO', () => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answer(
        snapshotsRead('/1100/snapshots'),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response).toEqual({
        status: 200,
        body: {
          year: 1100,
          snapshots: [
            { name: '1100.2026-10-18T15-01-02Z.json', takenAt: '2026-10-18T15:01:02Z' },
            { name: '1100.2026-10-18T14-00-00Z.json', takenAt: '2026-10-18T14:00:00Z' },
            { name: '1100.2026-10-18T09-30-00Z.json', takenAt: '2026-10-18T09:30:00Z' },
          ],
        },
      })
    })

    it('answers GET /1100/snapshots/<name> with the snapshot, byte for byte', () => {
      const snapshots = memoryFolder({ '1100.2026-10-18T15-01-02Z.json': DRAFT })

      const response = answerSnapshots(
        snapshotsRead('/1100/snapshots/1100.2026-10-18T15-01-02Z.json'),
        snapshots.folder
      )

      expect(response).toEqual({ status: 200, body: DRAFT })
      expect(snapshots.reads).toEqual(['1100.2026-10-18T15-01-02Z.json'])
    })
  })

  describe('variants', () => {
    it('answers an empty list when no snapshot of 1100 was kept', () => {
      const snapshots = memoryFolder({ '1200.2026-10-18T15-00-00Z.json': 'another year' })

      expect(
        answer(snapshotsRead('/1100/snapshots'), memoryFolder().folder, snapshots.folder)
      ).toEqual({ status: 200, body: { year: 1100, snapshots: [] } })
    })

    it('lists the snapshots of a year before Christ', () => {
      const snapshots = memoryFolder({ '-44.2026-10-18T15-00-00Z.json': 'snapshot' })

      expect(
        answer(snapshotsRead('/-44/snapshots'), memoryFolder().folder, snapshots.folder).body
      ).toEqual({
        year: -44,
        snapshots: [{ name: '-44.2026-10-18T15-00-00Z.json', takenAt: '2026-10-18T15:00:00Z' }],
      })
    })

    it('serves a GET from a loopback Host whatever its Origin — no CORS header lets another site read it', () => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answerSnapshots(
        snapshotsRead('/1100/snapshots', { origin: 'https://evil.example' }),
        snapshots.folder
      )

      expect(response.status).toBe(200)
      expect(Object.keys(response).sort()).toEqual(['body', 'status'])
    })
  })

  describe('managed errors', () => {
    it('refuses a snapshot of another year asked under 1100 with 404, reading nothing', () => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answer(
        snapshotsRead('/1100/snapshots/1200.2026-10-18T15-00-00Z.json'),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response).toEqual({
        status: 404,
        body: { reason: '"1200.2026-10-18T15-00-00Z.json" is not a snapshot of 1100' },
      })
      expect(snapshots.reads).toEqual([])
    })

    it.each([
      '1100.json',
      '1100.set-aside-2026-10-17T15-42-07Z.json',
      '1100.2026-10-18T16-00-00Z.json.tmp',
      'notes.txt',
    ])('refuses the name %s, which is no snapshot, with 404, reading nothing', (name) => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answerSnapshots(snapshotsRead(`/1100/snapshots/${name}`), snapshots.folder)

      expect(response.status).toBe(404)
      expect(snapshots.reads).toEqual([])
    })

    it('answers an absent snapshot of 1100 with 404, saying which', () => {
      const snapshots = memoryFolder()

      const response = answer(
        snapshotsRead('/1100/snapshots/1100.2026-10-18T15-01-02Z.json'),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response).toEqual({
        status: 404,
        body: { reason: 'there is no snapshot "1100.2026-10-18T15-01-02Z.json" of 1100' },
      })
    })

    it.each(['POST', 'PUT'])('refuses a %s on the listing with 405, writing nothing', (method) => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answer(
        request({ method, path: '/1100/snapshots' }),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response).toEqual({ status: 405, body: { reason: 'snapshots are read with GET' } })
      expect(snapshots.log).toEqual([])
    })

    it('refuses a write on the listing from another origin with 403', () => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answer(
        request({ method: 'POST', path: '/1100/snapshots', origin: 'https://evil.example' }),
        memoryFolder().folder,
        snapshots.folder
      )

      expect(response.status).toBe(403)
      expect(snapshots.log).toEqual([])
    })

    it('refuses a read of the list whose Host is not a loopback name, listing nothing', () => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)
      const list = vi.spyOn(snapshots.folder, 'list')

      const response = answerSnapshots(
        snapshotsRead('/1100/snapshots', { host: 'evil.example:5173' }),
        snapshots.folder
      )

      expect(response.status).toBe(403)
      expect(list).not.toHaveBeenCalled()
    })

    it('logs a refused snapshot name as a warning', () => {
      answerSnapshots(
        snapshotsRead('/1100/snapshots/notes.txt'),
        memoryFolder(SNAPSHOT_FILES).folder
      )

      expect(console.warn).toHaveBeenCalledWith(
        '[Cartographer dev server] refused a snapshot request: "notes.txt" is not a snapshot of 1100'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing listing throw, for the middleware to answer 500', () => {
      const snapshots = memoryFolder()
      snapshots.folder.list = () => {
        throw Object.assign(new Error('denied'), { code: 'EACCES' })
      }

      expect(() => answerSnapshots(snapshotsRead('/1100/snapshots'), snapshots.folder)).toThrow(
        'denied'
      )
    })
  })

  describe('edge cases', () => {
    it.each([
      '/1100/snapshots/..%2F..%2Fyears%2F1100%2Fpolities.json',
      '/1100/snapshots/../years',
      '/1100/snapshots/..',
      '/1100/snapshots/1100.2026-10-18T15-01-02Z.json/..',
    ])('refuses the path-like request %s with 404, reading nothing', (path) => {
      const snapshots = memoryFolder(SNAPSHOT_FILES)

      const response = answerSnapshots(snapshotsRead(path), snapshots.folder)

      expect(response.status).toBe(404)
      expect(snapshots.reads).toEqual([])
    })

    it('refuses a name whose time is not one a snapshot is named by', () => {
      const snapshots = memoryFolder({ '1100.2026-10-18T15:01:02Z.json': 'colons' })

      const response = answerSnapshots(
        snapshotsRead('/1100/snapshots/1100.2026-10-18T15:01:02Z.json'),
        snapshots.folder
      )

      expect(response.status).toBe(404)
      expect(snapshots.reads).toEqual([])
    })
  })
})
