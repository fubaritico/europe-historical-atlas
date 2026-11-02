import { describe, expect, it } from 'vitest'

import {
  NEW_MAP_NAME_MAX,
  autosaveName,
  copyName,
  isAutosaveName,
  isMapName,
  isNewMapName,
  yearNamed,
} from './mapName'

describe('isMapName', () => {
  describe('happy path', () => {
    it('takes a year and a working name', () => {
      expect([isMapName('1100'), isMapName('1100-backup-2026-11-02')]).toEqual([true, true])
    })
  })

  describe('variants', () => {
    it('takes a year before Christ, dots and underscores', () => {
      expect([
        isMapName('-500'),
        isMapName('1100.copy.2026-11-02T18-30-12'),
        isMapName('a_b'),
      ]).toEqual([true, true, true])
    })
  })

  describe('managed errors', () => {
    it('refuses a slash, a space and a leading dot', () => {
      expect([isMapName('1100/x'), isMapName('1100 essai'), isMapName('.hidden')]).toEqual([
        false,
        false,
        false,
      ])
    })
  })

  // L4: N/A — a pure test on a string.

  describe('edge cases', () => {
    it('refuses an empty name and one past 128 characters', () => {
      expect([
        isMapName(''),
        isMapName(`a${'b'.repeat(128)}`),
        isMapName(`a${'b'.repeat(127)}`),
      ]).toEqual([false, false, true])
    })

    it('refuses "..", which would climb out of the folder', () => {
      expect(isMapName('..')).toBe(false)
    })
  })
})

describe('yearNamed', () => {
  it('reads the year a name is', () => {
    expect([yearNamed('1100'), yearNamed('-500')]).toEqual([1100, -500])
  })

  it('reads no year in a name with a leading zero, nor in -0', () => {
    expect([yearNamed('01100'), yearNamed('-0'), yearNamed('-01')]).toEqual([null, null, null])
  })

  it('reads no year in a working name', () => {
    expect([yearNamed('1100-essai'), yearNamed('1100.copy.2026')]).toEqual([null, null])
  })
})

describe('copyName', () => {
  it('names a copy after the map and the time to the second, with no colon', () => {
    expect(copyName('1100', new Date('2026-11-02T18:30:12.456Z'))).toBe(
      '1100.copy.2026-11-02T18-30-12'
    )
  })

  it('gives a name that is itself a map name', () => {
    expect(isMapName(copyName('1100-backup-2026-11-02', new Date('2026-11-02T18:30:12Z')))).toBe(
      true
    )
  })
})

describe('autosaveName', () => {
  it('names the autosave after the map and the time to the second', () => {
    expect(autosaveName('1100', new Date('2026-11-02T19:05:12.300Z'))).toBe(
      '1100.autosave.2026-11-02T19-05-12'
    )
  })

  it('keeps the name of the map an autosave came from, rather than a second suffix', () => {
    expect(
      autosaveName('1100.autosave.2026-11-01T10-00-00', new Date('2026-11-02T19:05:12Z'))
    ).toBe('1100.autosave.2026-11-02T19-05-12')
  })

  it('gives a map name for the longest working name a map may have before its suffix', () => {
    expect(isMapName(autosaveName(`a${'b'.repeat(95)}`, new Date('2026-11-02T19:05:12Z')))).toBe(
      true
    )
  })
})

describe('isNewMapName', () => {
  it('takes a name short enough for its autosave to be a name too', () => {
    const longest = `a${'b'.repeat(NEW_MAP_NAME_MAX - 1)}`
    expect([
      isNewMapName(longest),
      isMapName(autosaveName(longest, new Date('2026-11-02T19:05:12Z'))),
    ]).toEqual([true, true])
  })

  it('refuses a name one character longer', () => {
    expect(isNewMapName(`a${'b'.repeat(NEW_MAP_NAME_MAX)}`)).toBe(false)
  })
})

describe('isAutosaveName', () => {
  it('tells an autosave from a map and from a copy', () => {
    expect([
      isAutosaveName('1100.autosave.2026-11-02T19-05-12'),
      isAutosaveName('1100'),
      isAutosaveName('1100.copy.2026-11-02T18-30-12'),
    ]).toEqual([true, false, false])
  })
})
