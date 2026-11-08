import { describe, expect, it } from 'vitest'

import { BAKED_NAMES_VERSION, readBakedNames } from './bakedNames'

/** France named once at level 0, two letters placed, its leader's dot beside it. */
function file(): Record<string, unknown> {
  return {
    version: BAKED_NAMES_VERSION,
    key: 'abc.def.12|{}',
    names: {
      levels: [
        {
          placed: [
            {
              polity: 'france',
              text: 'Fr',
              form: 'short',
              piece: 0,
              size: 3.5,
              glyphs: [
                { x: 10, y: 20, angle: 0 },
                { x: 12, y: 20, angle: 0 },
              ],
              leader: [{ x: 9, y: 22, angle: 0 }],
            },
          ],
          tooSmall: ['monaco'],
        },
      ],
      gridWidth: 1200,
      gridHeight: 1091,
      unnamed: [],
    },
  }
}

// ATLAS-333: a year's names placed at the build, read back by the page before it trusts them.
describe('readBakedNames', () => {
  describe('happy path', () => {
    it('reads France’s name, its letters and its key', () => {
      const baked = readBakedNames(file(), 'years/1100/names.json')
      expect(baked.key).toBe('abc.def.12|{}')
      expect(baked.names.levels[0]?.placed[0]?.glyphs).toHaveLength(2)
    })
  })

  describe('variants', () => {
    it('reads a name with no leader, leaving it absent', () => {
      const value = file()
      const names = value.names as { levels: { placed: Record<string, unknown>[] }[] }
      delete names.levels[0]?.placed[0]?.leader
      const baked = readBakedNames(value, 'names.json')
      expect('leader' in (baked.names.levels[0]?.placed[0] ?? {})).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('refuses a file of another version, naming the file', () => {
      expect(() => readBakedNames({ ...file(), version: 2 }, 'years/1100/names.json')).toThrow(
        "years/1100/names.json is not a year's baked names: version"
      )
    })

    it('refuses a file with no key', () => {
      expect(() => readBakedNames({ ...file(), key: '' }, 'names.json')).toThrow('key')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses what is not an object at all', () => {
      expect(() => readBakedNames('<html>', 'names.json')).toThrow('payload')
    })
  })

  describe('edge cases', () => {
    it('refuses a name of size 0, which no placement gives', () => {
      const value = file()
      const names = value.names as { levels: { placed: Record<string, unknown>[] }[] }
      const first = names.levels[0]?.placed[0]
      if (first) first.size = 0
      expect(() => readBakedNames(value, 'names.json')).toThrow('size')
    })
  })
})
