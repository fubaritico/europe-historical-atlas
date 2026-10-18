import { describe, expect, it } from 'vitest'

import { addPolity } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { createYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { describeDrawingTarget } from './drawingTarget'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** An identity with a pinned colour, which the fixture's two polities deliberately lack. */
const PINNED: YearPolity = {
  id: 'hre-bourgogne',
  name: 'Royaume de Bourgogne',
  rank: 'kingdom',
  status: 'country',
  suzerain: 'hre',
  existsFrom: 933,
  existsTo: null,
  colour: '#d4b24a',
  wikidata: null,
}

describe('describeDrawingTarget', () => {
  describe('happy path', () => {
    // The plausible naive version trusts the id and answers `{ id: target, name: target }` without
    // looking anything up — which puts `fr-couronne` in the banner instead of the polity's name, and
    // never returns null. This asserts the name, which is the half that catches it here.
    it('reads the aimed-at polity out of the document', () => {
      const document = sharedBorderDocument()

      expect(describeDrawingTarget(document, 'fr-couronne')).toEqual({
        id: 'fr-couronne',
        name: 'Reaume de France',
        colour: null,
      })
    })
  })

  describe('variants', () => {
    it('passes a pinned colour through', () => {
      const document = sharedBorderDocument()
      addPolity(document, PINNED)

      expect(describeDrawingTarget(document, 'hre-bourgogne')?.colour).toBe('#d4b24a')
    })

    // A null colour means "the palette decides", and the palette is `assignRegionColors`, which needs
    // the raster — H-08 has not settled when the editor runs it. Substituting a swatch here would be a
    // value nobody chose standing in for one that has not arrived.
    it('passes a null colour through rather than inventing a swatch', () => {
      const document = sharedBorderDocument()

      expect(describeDrawingTarget(document, 'hre')?.colour).toBeNull()
    })

    it('tells the two polities of the fixture apart', () => {
      const document = sharedBorderDocument()

      expect(describeDrawingTarget(document, 'hre')?.name).toBe('Sacrum Imperium')
    })
  })

  describe('managed errors', () => {
    it('answers nothing when nobody has been aimed at', () => {
      expect(describeDrawingTarget(sharedBorderDocument(), null)).toBeNull()
    })

    // The self-correcting half: an id the document no longer holds resolves to nobody, so the banner
    // disappears and the Pen refuses with nothing to clear anywhere.
    it('answers nothing for an id the document does not hold', () => {
      expect(describeDrawingTarget(sharedBorderDocument(), 'aquitaine')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('answers nothing against a document with no polities at all', () => {
      const empty = createYearDocument(1100)

      expect(describeDrawingTarget(empty, 'fr-couronne')).toBeNull()
    })

    it('answers nothing for the empty id', () => {
      expect(describeDrawingTarget(sharedBorderDocument(), '')).toBeNull()
    })
  })

  describe('edge cases', () => {
    // An id is matched whole. A prefix match would make `fr` resolve to `fr-couronne`, so aiming at a
    // polity that was deleted could silently land on a different one — the worst available outcome,
    // since the banner would look right.
    it('matches an id exactly, never as a prefix', () => {
      const document = sharedBorderDocument()

      expect(describeDrawingTarget(document, 'fr')).toBeNull()
      expect(describeDrawingTarget(document, 'fr-couronne-2')).toBeNull()
    })

    it('does not hand back the stored polity, so the banner cannot mutate the document', () => {
      const document = sharedBorderDocument()
      const stored = document.polities[0]

      expect(describeDrawingTarget(document, 'fr-couronne')).not.toBe(stored)
    })
  })
})
