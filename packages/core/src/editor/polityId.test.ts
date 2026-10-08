import { describe, expect, it } from 'vitest'

import { proposePolityId, slugifyPolityName } from './polityId'

describe('slugifyPolityName', () => {
  describe('happy path', () => {
    it('turns the name of the central case into a readable fragment', () => {
      expect(slugifyPolityName('Reaume de France')).toBe('reaume-de-france')
    })
  })

  describe('variants', () => {
    // The plausible naive version skips `normalize('NFD')` and strips the accented letter itself,
    // which yields `boh-me`. Bohemia is a real 1100 entry, so this is not a contrived input.
    it('folds latin accents instead of dropping the letters under them', () => {
      expect(slugifyPolityName('Bohême')).toBe('boheme')
      expect(slugifyPolityName('Côme')).toBe('come')
      expect(slugifyPolityName('Ängland')).toBe('angland')
    })

    it('collapses any run of punctuation or space into one hyphen', () => {
      expect(slugifyPolityName('Saint   Empire romain germanique')).toBe(
        'saint-empire-romain-germanique'
      )
      // Deliberately unaccented: this test is about the apostrophe and the spaces. With `Comté` in it
      // it also failed when the unicode fold was sabotaged, and a test that falls for two independent
      // reasons cannot say which one broke.
      expect(slugifyPolityName("Comte d'Anjou")).toBe('comte-d-anjou')
      expect(slugifyPolityName('Al-Andalus')).toBe('al-andalus')
    })

    it('keeps digits, which a regnal name needs', () => {
      expect(slugifyPolityName('Taifa 3')).toBe('taifa-3')
    })

    it('leaves an already-slugged id alone, so re-proposing is idempotent', () => {
      expect(slugifyPolityName('fr-couronne')).toBe('fr-couronne')
    })
  })

  describe('managed errors', () => {
    // Declared outcome, not a failure: transliterating would invent a romanisation.
    it('yields nothing for a name in a non-latin script', () => {
      expect(slugifyPolityName('Βυζάντιον')).toBe('')
      expect(slugifyPolityName('Русь')).toBe('')
    })

    it('yields nothing for an empty name', () => {
      expect(slugifyPolityName('')).toBe('')
    })
  })

  describe('unmanaged errors', () => {
    it('yields nothing for a name made only of things it strips', () => {
      expect(slugifyPolityName('   ')).toBe('')
      expect(slugifyPolityName('—   ·  —')).toBe('')
    })
  })

  describe('edge cases', () => {
    // The plausible naive version forgets the final trim and returns `-anjou-`.
    it('trims the hyphens its own substitution created at the ends', () => {
      expect(slugifyPolityName(' (Anjou) ')).toBe('anjou')
      expect(slugifyPolityName('…France…')).toBe('france')
    })

    it('keeps the latin part of a mixed-script name rather than refusing the whole', () => {
      expect(slugifyPolityName('Rus Киев')).toBe('rus')
    })
  })
})

describe('proposePolityId', () => {
  describe('happy path', () => {
    it('proposes the plain slug when nothing holds it', () => {
      expect(proposePolityId('Reaume de France', [])).toBe('reaume-de-france')
    })
  })

  describe('variants', () => {
    it('counts the suffix from 2, so a first entry never looks numbered', () => {
      expect(proposePolityId('Reaume de France', ['reaume-de-france'])).toBe('reaume-de-france-2')
    })

    it('reads the taken ids from any iterable', () => {
      expect(proposePolityId('Anjou', new Set(['anjou']))).toBe('anjou-2')
    })

    it('ignores ids that are not in the way', () => {
      expect(proposePolityId('Anjou', ['fr-couronne', 'hre', 'anjou-7'])).toBe('anjou')
    })
  })

  describe('managed errors', () => {
    // An empty proposal leaves the form's id field blank and required — the author is asked rather
    // than handed `polity-1`, which is the opaque counter this decision rejected.
    it('proposes nothing when the name yields no slug', () => {
      expect(proposePolityId('Βυζάντιον', [])).toBe('')
      expect(proposePolityId('', ['anything'])).toBe('')
    })
  })

  describe('unmanaged errors', () => {
    it('does not propose an empty id even when the empty string is somehow taken', () => {
      expect(proposePolityId('', [''])).toBe('')
    })
  })

  describe('edge cases', () => {
    // THE guard of this module. The plausible implementation is
    //   `if (used.has(base)) return `${base}-2``
    // which is right for one duplicate and hands back an id that is already taken for two. Verified
    // by writing that version: this test fails and the four above it still pass.
    it('steps past every taken suffix, not just the first', () => {
      const taken = ['anjou', 'anjou-2', 'anjou-3']
      expect(proposePolityId('Anjou', taken)).toBe('anjou-4')
    })

    it('fills a gap in the suffixes rather than counting how many exist', () => {
      // `-2` is free although `-3` is taken: a version deriving the suffix from the count of
      // matching ids would answer `anjou-4` and leave `-2` unused for ever.
      expect(proposePolityId('Anjou', ['anjou', 'anjou-3'])).toBe('anjou-2')
    })

    it('treats a name that already carries a suffix as its own base', () => {
      expect(proposePolityId('anjou-2', ['anjou', 'anjou-2'])).toBe('anjou-2-2')
    })
  })
})
