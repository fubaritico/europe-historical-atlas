import { describe, expect, it } from 'vitest'

import { chainDates, parseTitle, withMapName } from './titleFormat'

describe('parseTitle', () => {
  describe('happy path', () => {
    it('cuts a title the CMS wrote into its holder, its territory and its dates', () => {
      expect(parseTitle('Baudouin III de Hainaut — comté de Hainaut, 1100')).toEqual({
        person: 'Baudouin III de Hainaut',
        territory: 'comté de Hainaut',
        dates: '1100',
      })
    })
  })

  describe('variants', () => {
    it('reads a span of years as the dates', () => {
      expect(parseTitle('Godefroy de Bouillon — Duché de Basse Lotharingie, 1087–1100').dates).toBe(
        '1087–1100'
      )
    })

    it('keeps a comma of the territory in the territory', () => {
      expect(parseTitle('Raymond — comté de Toulouse, Rouergue, 1094–1105')).toEqual({
        person: 'Raymond',
        territory: 'comté de Toulouse, Rouergue',
        dates: '1094–1105',
      })
    })
  })

  describe('edge cases', () => {
    it('reads no dates when the last part holds no figure', () => {
      expect(parseTitle('Roger — comté de Foix, Languedoc')).toEqual({
        person: 'Roger',
        territory: 'comté de Foix, Languedoc',
        dates: null,
      })
    })

    it('names no person in a name with no « — », or starting with one', () => {
      expect(parseTitle('Comté de Hainaut').person).toBeNull()
      expect(parseTitle(' — comté de Hainaut').person).toBeNull()
    })
  })

  // L3, L4: N/A — a pure cut of a string
})

describe('withMapName', () => {
  describe('happy path', () => {
    it('sets the map’s name after the territory, before the dates', () => {
      expect(
        withMapName(
          'Henri IV du Saint-Empire — Saint-Empire romain germanique, 1100',
          'Holy Roman Empire'
        )
      ).toBe('Henri IV du Saint-Empire — Saint-Empire romain germanique (Holy Roman Empire), 1100')
    })
  })

  describe('variants', () => {
    it('sets it after a territory with a comma of its own', () => {
      expect(withMapName('Roger — comté de Foix, Languedoc', 'Foix')).toBe(
        'Roger — comté de Foix, Languedoc (Foix)'
      )
    })
  })

  describe('edge cases', () => {
    it('leaves the title as it is when the map draws no polity for it', () => {
      expect(withMapName('Comté de Hainaut, 1100', null)).toBe('Comté de Hainaut, 1100')
    })
  })

  // L3, L4: N/A — a pure composition of strings
})

describe('chainDates', () => {
  describe('happy path', () => {
    it('leaves out the lone year 1100', () => {
      expect(chainDates('1100')).toBeNull()
    })
  })

  describe('variants', () => {
    it('keeps the span 1087–1100', () => {
      expect(chainDates('1087–1100')).toBe('1087–1100')
    })

    it('leaves out a three-figure year too', () => {
      expect(chainDates('987')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('writes nothing for a title with no dates', () => {
      expect(chainDates(null)).toBeNull()
    })
  })

  // L3, L4: N/A — a pure reading of a string
})
