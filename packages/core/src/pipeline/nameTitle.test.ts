import { describe, expect, it } from 'vitest'

import { untitledName } from './nameTitle'

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
