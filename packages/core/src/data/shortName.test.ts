import { describe, expect, it } from 'vitest'

import { shortNameOf, untitledName } from './shortName'

describe('untitledName', () => {
  describe('happy path', () => {
    it('takes the title off a formal name', () => {
      expect(untitledName('Kingdom of France')).toBe('France')
    })
  })

  describe('variants', () => {
    it.each([
      ['Principality of Rostov-Suzdal', 'Rostov-Suzdal'],
      ['Kingdom of the Almoravids', 'Almoravids'],
      ['Grand Duchy of Lithuania', 'Lithuania'],
      ['Zirid Emirate of Ifriqiya', 'Ifriqiya'],
      ['Banu Jami Lordship of Gabès', 'Gabès'],
      ['Palatine County of Chester', 'Chester'],
      ['Principality of the Kievan Rus', 'Kievan Rus'],
      ['Kingdom of England', 'England'],
      ['Republic of Novgorod', 'Novgorod'],
    ])('writes %s as %s', (formal, short) => {
      expect(untitledName(formal)).toBe(short)
    })

    it.each([
      'State of the Church',
      'Khazar Lordship in Decay',
      'Byzantine Empire',
      'Holy Roman Empire',
      'Cumans',
    ])('leaves %s, with no title before an « of », whole', (formal) => {
      expect(untitledName(formal)).toBe(formal)
    })
  })

  // L3, L4: N/A — a string in, a string out.

  describe('edge cases', () => {
    // 1100 has « county of Anjou », in lower case: a title is read with its capital only.
    it('leaves a title written without its capital whole', () => {
      expect(untitledName('county of Anjou')).toBe('county of Anjou')
    })
  })
})

// CARTO-307: the short name the author entered, else the formal name without its title.
describe('shortNameOf', () => {
  describe('happy path', () => {
    it('writes the short name entered, as is', () => {
      expect(shortNameOf({ name: 'Kingdom of England', shortName: 'England' })).toBe('England')
    })
  })

  describe('variants', () => {
    it('writes the formal name without its title where none was entered', () => {
      expect(shortNameOf({ name: 'Kingdom of France' })).toBe('France')
    })

    it('keeps a short name entered that the title rule would not give', () => {
      expect(shortNameOf({ name: 'Obotrite Tribes Confederation', shortName: 'Obotrites' })).toBe(
        'Obotrites'
      )
    })
  })

  // L3, L4: N/A — the format refuses an empty short name, so one entered is never blank.

  describe('edge cases', () => {
    it('writes a name with no title whole where none was entered', () => {
      expect(shortNameOf({ name: 'Cumans' })).toBe('Cumans')
    })
  })
})
