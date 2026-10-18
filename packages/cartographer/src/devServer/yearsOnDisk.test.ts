import { describe, expect, it, vi } from 'vitest'

import { createDraftFolderOnDisk, createYearsFolderOnDisk } from './yearsOnDisk'

import type { DiskCalls } from './yearsOnDisk'

/** An error shaped like Node's, carrying its `code`. */
function nodeError(code: string): Error {
  return Object.assign(new Error(`${code}: something`), { code })
}

/** Disk calls that record what they are asked in `log`, each overridable. */
function disk(overrides: Partial<DiskCalls> = {}) {
  const log: string[] = []
  const calls: DiskCalls = {
    readFile: (path) => {
      log.push(`read ${path}`)
      return 'text'
    },
    writeFile: (path) => log.push(`write ${path}`),
    makeFolder: (path) => log.push(`mkdir ${path}`),
    rename: (from, to) => log.push(`rename ${from} → ${to}`),
    modifiedAt: (path) => {
      log.push(`stat ${path}`)
      return 1_700_000_000_000
    },
    ...overrides,
  }
  return { calls, log }
}

describe('createYearsFolderOnDisk', () => {
  describe('happy path', () => {
    it('reads a file under the root', () => {
      const { calls, log } = disk()

      expect(createYearsFolderOnDisk('/repo/years', calls).read('index.json')).toBe('text')
      expect(log).toEqual(['read /repo/years/index.json'])
    })

    it('creates the year’s folder before writing into it', () => {
      const { calls, log } = disk()
      createYearsFolderOnDisk('/repo/years', calls).write('1100/registry.json.tmp', '{}')

      expect(log).toEqual(['mkdir /repo/years/1100', 'write /repo/years/1100/registry.json.tmp'])
    })

    it('renames both ends under the root', () => {
      const { calls, log } = disk()
      createYearsFolderOnDisk('/repo/years', calls).rename('index.json.tmp', 'index.json')

      expect(log).toEqual(['rename /repo/years/index.json.tmp → /repo/years/index.json'])
    })

    it('answers when a file under the root was last modified, as the disk says', () => {
      const { calls, log } = disk()

      expect(createYearsFolderOnDisk('/repo/years', calls).modifiedAt('1100/polities.json')).toBe(
        1_700_000_000_000
      )
      expect(log).toEqual(['stat /repo/years/1100/polities.json'])
    })
  })

  describe('variants', () => {
    it('takes a root given with a trailing slash the same way', () => {
      const { calls, log } = disk()
      createYearsFolderOnDisk('/repo/years/', calls).read('index.json')

      expect(log).toEqual(['read /repo/years/index.json'])
    })
  })

  describe('managed errors', () => {
    it('reads a missing file as null, which the endpoint refuses on', () => {
      const { calls } = disk({
        readFile: () => {
          throw nodeError('ENOENT')
        },
      })

      expect(createYearsFolderOnDisk('/repo/years', calls).read('index.json')).toBeNull()
    })

    it('answers null for the modification time of a missing file', () => {
      const { calls } = disk({
        modifiedAt: () => {
          throw nodeError('ENOENT')
        },
      })

      expect(createYearsFolderOnDisk('/repo/years', calls).modifiedAt('1100/a.json')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('throws any other read failure on, rather than reading it as missing', () => {
      // A permission refused read as "missing" would turn into a 409 about a manifest that is right there.
      const { calls } = disk({
        readFile: () => {
          throw nodeError('EACCES')
        },
      })

      expect(() => createYearsFolderOnDisk('/repo/years', calls).read('index.json')).toThrow(
        'EACCES'
      )
    })

    it('throws a write failure on, untouched', () => {
      const { calls } = disk({
        writeFile: () => {
          throw nodeError('ENOSPC')
        },
      })

      expect(() => {
        createYearsFolderOnDisk('/repo/years', calls).write('1100/a.tmp', '')
      }).toThrow('ENOSPC')
    })

    it('throws any other failure to read a modification time on, rather than reading it as missing', () => {
      const { calls } = disk({
        modifiedAt: () => {
          throw nodeError('EACCES')
        },
      })

      expect(() => createYearsFolderOnDisk('/repo/years', calls).modifiedAt('1100/a.json')).toThrow(
        'EACCES'
      )
    })
  })

  describe('edge cases', () => {
    it('throws a non-Error value on, having no code to read', () => {
      const readFile = vi.fn(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
        throw 'ENOENT'
      })
      const { calls } = disk({ readFile })

      expect(() => createYearsFolderOnDisk('/repo/years', calls).read('index.json')).toThrow()
    })
  })
})

describe('createDraftFolderOnDisk', () => {
  it('removes a draft by its path under the root', () => {
    const removed: string[] = []
    const folder = createDraftFolderOnDisk('/repo/.autosave/drafts/', {
      readFile: () => '',
      writeFile: () => undefined,
      makeFolder: () => undefined,
      rename: () => undefined,
      modifiedAt: () => 0,
      removeFile: (path) => removed.push(path),
    })

    folder.remove('1100.json')

    expect(removed).toEqual(['/repo/.autosave/drafts/1100.json'])
  })

  it('reads, writes and renames as the year folder does', () => {
    const written: string[] = []
    const folder = createDraftFolderOnDisk('/repo/.autosave/drafts', {
      readFile: () => 'draft',
      writeFile: (path) => written.push(path),
      makeFolder: () => undefined,
      rename: () => undefined,
      modifiedAt: () => 0,
      removeFile: () => undefined,
    })

    folder.write('1100.json.tmp', '{}')

    expect(folder.read('1100.json')).toBe('draft')
    expect(written).toEqual(['/repo/.autosave/drafts/1100.json.tmp'])
  })
})
