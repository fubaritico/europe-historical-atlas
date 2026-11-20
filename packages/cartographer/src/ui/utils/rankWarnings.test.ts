import { describe, expect, it } from 'vitest'

import { rankWarnings } from './rankWarnings'

const FRANCE = { id: 'france', name: 'France', rank: 'kingdom', suzerain: null }
const ANJOU = { id: 'anjou', name: 'Anjou', rank: 'county', suzerain: 'france' }
const MAINE = { id: 'maine', name: 'Maine', rank: 'county', suzerain: 'anjou' }
const YEAR = [FRANCE, ANJOU, MAINE]

describe('rankWarnings', () => {
  describe('happy path', () => {
    it('says nothing of a county under a kingdom', () => {
      expect(
        rankWarnings({ name: 'Anjou', rank: 'county', suzerain: 'france' }, 'anjou', YEAR)
      ).toEqual([])
    })

    it('says a kingdom put under a county, with the two names and the two ranks', () => {
      expect(
        rankWarnings({ name: 'Navarre', rank: 'kingdom', suzerain: 'anjou' }, null, YEAR)
      ).toEqual([
        { vassal: 'Navarre', vassalRank: 'kingdom', suzerain: 'Anjou', suzerainRank: 'county' },
      ])
    })
  })

  describe('variants', () => {
    it('says a vassal that outranks the polity once its own rank is lowered', () => {
      // Anjou made a viscounty: Maine, a county, now outranks its suzerain.
      expect(
        rankWarnings({ name: 'Anjou', rank: 'viscounty', suzerain: 'france' }, 'anjou', YEAR)
      ).toEqual([
        { vassal: 'Maine', vassalRank: 'county', suzerain: 'Anjou', suzerainRank: 'viscounty' },
      ])
    })

    it('says its own suzerain first, then its vassals', () => {
      const year = [{ ...FRANCE, rank: 'tribe' }, ANJOU, MAINE]
      const found = rankWarnings(
        { name: 'Anjou', rank: 'march', suzerain: 'france' },
        'anjou',
        year
      )
      expect(found.map(({ vassal }) => vassal)).toEqual(['Anjou', 'Maine'])
    })

    it('says nothing of two equal scores: a principality under a county', () => {
      expect(
        rankWarnings({ name: 'Orange', rank: 'principality', suzerain: 'anjou' }, null, YEAR)
      ).toEqual([])
    })

    it('uses the name being typed, not the one on file', () => {
      const [found] = rankWarnings(
        { name: 'Grand Anjou', rank: 'empire', suzerain: 'france' },
        'anjou',
        YEAR
      )
      expect(found?.vassal).toBe('Grand Anjou')
    })
  })

  describe('managed errors', () => {
    it('says nothing while the polity has no rank, or its suzerain none', () => {
      expect(rankWarnings({ name: 'X', rank: null, suzerain: 'anjou' }, 'x', YEAR)).toEqual([])
      const unranked = [{ ...ANJOU, rank: null }]
      expect(
        rankWarnings({ name: 'X', rank: 'empire', suzerain: 'anjou' }, null, unranked)
      ).toEqual([])
    })

    it('says nothing of a rank the dev has not scored, or that is outside the list', () => {
      expect(rankWarnings({ name: 'X', rank: 'despotate', suzerain: 'anjou' }, null, YEAR)).toEqual(
        []
      )
      expect(rankWarnings({ name: 'X', rank: 'state', suzerain: 'anjou' }, null, YEAR)).toEqual([])
    })
  })

  // L4: N/A — a pure read over an array

  describe('edge cases', () => {
    it('says nothing of a suzerain the year does not hold', () => {
      expect(rankWarnings({ name: 'X', rank: 'empire', suzerain: 'gone' }, null, YEAR)).toEqual([])
    })

    it('gives a new polity no vassal: none can name it yet', () => {
      const orphan = [{ id: 'a', name: 'A', rank: 'empire', suzerain: null }]
      expect(rankWarnings({ name: 'B', rank: 'tribe', suzerain: null }, null, orphan)).toEqual([])
    })

    it('does not take the polities with no suzerain for the vassals of a new polity', () => {
      // A new polity's id is `null` in the form, and so is the suzerain of a sovereign: they must not be matched.
      expect(rankWarnings({ name: 'B', rank: 'tribe', suzerain: null }, null, [FRANCE])).toEqual([])
    })
  })
})
