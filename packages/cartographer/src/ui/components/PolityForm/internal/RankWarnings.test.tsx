import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { RankWarnings } from './RankWarnings'

const NAVARRE = {
  vassal: 'Navarre',
  vassalRank: 'kingdom',
  suzerain: 'Anjou',
  suzerainRank: 'county',
}

// CORE-489, the dev, 2026-11-20: a vassal never outranks its suzerain — said, never refused.
describe('RankWarnings', () => {
  describe('happy path', () => {
    it('says the vassal and its suzerain, each with its rank named', () => {
      renderInEnglish(<RankWarnings warnings={[NAVARRE]} />)
      expect(screen.getByRole('status').textContent).toBe(
        'To check: Navarre (kingdom) ranks higher than its suzerain, Anjou (county). You may save it as it is.'
      )
    })
  })

  describe('variants', () => {
    it('says one sentence per step at fault', () => {
      const maine = { ...NAVARRE, vassal: 'Maine', vassalRank: 'duchy' }
      renderInEnglish(<RankWarnings warnings={[NAVARRE, maine]} />)
      expect(screen.getAllByRole('status')).toHaveLength(2)
    })

    it('names a rank in the page’s words, not as stored', () => {
      const tribe = {
        ...NAVARRE,
        vassalRank: 'archiepiscopal_lordship',
        suzerainRank: 'tribe_outlined',
      }
      renderInEnglish(<RankWarnings warnings={[tribe]} />)
      expect(screen.getByRole('status').textContent).toContain(
        'Navarre (sovereign archbishopric) ranks higher than its suzerain, Anjou (outlined tribe)'
      )
    })
  })

  // L3: N/A — nothing is refused: the warning is the whole of it
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('says nothing when the ranks agree', () => {
      renderInEnglish(<RankWarnings warnings={[]} />)
      expect(screen.queryByRole('status')).toBeNull()
    })
  })
})
