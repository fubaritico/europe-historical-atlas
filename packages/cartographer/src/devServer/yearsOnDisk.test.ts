import { describe, expect, it, vi } from 'vitest'

import { createYearsFolderOnDisk } from './yearsOnDisk'

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
