import { describe, expect, it } from 'vitest'

import { REFUSED, cursorCss, cursorFor } from './cursors'

import type { CursorState } from './cursors'

/** The resting state: the hand, nothing aimed at, no gesture under way. */
const AT_REST: CursorState = {
  tool: 'navigate',
  hasTarget: false,
  tooFar: false,
  panning: false,
  closing: false,
  overHandle: false,
  overStretch: false,
  snapping: false,
  overFill: false,
  spaceHeld: false,
}

describe('cursorFor', () => {
  describe('too far out to act (H-34)', () => {
    it('refuses with the Pen and the arrow when the view is too far out, a polity aimed at or not', () => {
      expect(cursorFor({ ...AT_REST, tool: 'draw', hasTarget: true, tooFar: true })).toBe(REFUSED)
      expect(cursorFor({ ...AT_REST, tool: 'edit', hasTarget: true, tooFar: true })).toBe(REFUSED)
    })

    it('keeps the arrow over a fill from afar, where its click chooses the polity', () => {
      expect(
        cursorFor({ ...AT_REST, tool: 'edit', hasTarget: true, tooFar: true, overFill: true })
      ).toBe('arrow')
    })

    it('never refuses the hand, nor a hand borrowed with space or a pan under way', () => {
      expect(cursorFor({ ...AT_REST, tooFar: true })).toBe('hand-open')
      expect(
        cursorFor({ ...AT_REST, tool: 'draw', hasTarget: true, tooFar: true, spaceHeld: true })
      ).toBe('hand-open')
      expect(
        cursorFor({ ...AT_REST, tool: 'draw', hasTarget: true, tooFar: true, panning: true })
      ).toBe('hand-closed')
    })

    it('hides the Pen’s own marks from afar — no snap mark promises a click that will be refused', () => {
      expect(
        cursorFor({
          ...AT_REST,
          tool: 'draw',
          hasTarget: true,
          tooFar: true,
          snapping: true,
          closing: true,
        })
      ).toBe(REFUSED)
    })
  })

  describe('happy path', () => {
    it('gives each tool its own cursor once there is a subject', () => {
      expect(cursorFor({ ...AT_REST, tool: 'draw', hasTarget: true })).toBe('cross')
      expect(cursorFor({ ...AT_REST, tool: 'edit', hasTarget: true })).toBe('arrow')
      expect(cursorFor(AT_REST)).toBe('hand-open')
    })
  })

  describe('variants', () => {
    it('shows the closed hand while the view is dragged, whatever is in hand', () => {
      for (const tool of ['navigate', 'draw', 'edit'] as const)
        expect(cursorFor({ ...AT_REST, tool, hasTarget: true, panning: true })).toBe('hand-closed')
    })

    // CURSORS.md — `cross-close` on the first anchor, `arrow-handle` over a handle.
    it('marks the closing offer and the handle under the arrow', () => {
      expect(cursorFor({ ...AT_REST, tool: 'draw', hasTarget: true, closing: true })).toBe(
        'cross-close'
      )
      expect(cursorFor({ ...AT_REST, tool: 'edit', hasTarget: true, overHandle: true })).toBe(
        'arrow-handle'
      )
    })

    // The dev, 2026-10-14: the white arrow never inserts, so a stretch under it shows no plus.
    it('keeps the plain arrow over a stretch, and the handle mark over a handle', () => {
      const arrow = { ...AT_REST, tool: 'edit' as const, hasTarget: true, overStretch: true }
      expect(cursorFor(arrow)).toBe('arrow')
      expect(cursorFor({ ...arrow, overHandle: true })).toBe('arrow-handle')
    })

    // The Pen's plus, as Illustrator's over a selected path.
    it('shows the Pen’s plus over the target’s stretch, under the closing mark', () => {
      const pen = { ...AT_REST, tool: 'draw' as const, hasTarget: true, overStretch: true }
      expect(cursorFor(pen)).toBe('cross-add')
      // Inserting wins over the snap: over its own stretch the idle Pen inserts, it does not follow.
      expect(cursorFor({ ...pen, snapping: true })).toBe('cross-add')
      expect(cursorFor({ ...pen, snapping: true, closing: true })).toBe('cross-close')
    })

    // CURSORS.md — `cross-snap` while the coastline is within reach; the closing mark still wins.
    it('marks the coast within reach, under the closing mark', () => {
      const pen = { ...AT_REST, tool: 'draw' as const, hasTarget: true, snapping: true }
      expect(cursorFor(pen)).toBe('cross-snap')
      expect(cursorFor({ ...pen, closing: true })).toBe('cross-close')
    })

    // With nobody aimed at, the arrow over a fill can still choose its polity — so it does not refuse.
    it('lets the arrow over a fill even with nobody aimed at, and refuses elsewhere', () => {
      expect(cursorFor({ ...AT_REST, tool: 'edit', overFill: true })).toBe('arrow')
      expect(cursorFor({ ...AT_REST, tool: 'edit' })).toBe(REFUSED)
      expect(cursorFor({ ...AT_REST, tool: 'draw', overFill: true })).toBe(REFUSED)
    })

    it('lends the open hand to ‹space› over any tool', () => {
      expect(cursorFor({ ...AT_REST, tool: 'draw', hasTarget: true, spaceHeld: true })).toBe(
        'hand-open'
      )
    })

    it('lets the drag win over ‹space›, a held key being the weaker claim', () => {
      expect(cursorFor({ ...AT_REST, panning: true, spaceHeld: true })).toBe('hand-closed')
    })

    it('needs no subject for ⟨navigate⟩ — panning belongs to no polity', () => {
      expect(cursorFor({ ...AT_REST, hasTarget: false })).toBe('hand-open')
    })
  })

  describe('managed errors', () => {
    /*
     * THE guard, in two halves.
     *
     * The plausible version reads the tool first and the subject last, so a Pen with nobody selected
     * shows a crosshair — an invitation to place four hundred anchors nowhere, which is the mistake
     * this whole dispositif exists to prevent.
     *
     * And it almost always forgets ⟨edit⟩, which is the half the cursor handoff never even asked about
     * and the dev did: "tu sélectionnes les points de qui?" The arrow has the same missing subject.
     */
    it('refuses under BOTH tools while nobody is selected', () => {
      expect(cursorFor({ ...AT_REST, tool: 'draw' })).toBe(REFUSED)
      expect(cursorFor({ ...AT_REST, tool: 'edit' })).toBe(REFUSED)
    })

    it('still lends the hand to ‹space› while refusing', () => {
      // Panning is always allowed, so the refusal must not swallow the borrow — otherwise the one way
      // out of a refused state would itself look refused.
      expect(cursorFor({ ...AT_REST, tool: 'draw', spaceHeld: true })).toBe('hand-open')
    })
  })

  describe('unmanaged errors', () => {
    it('is total — every combination answers something', () => {
      for (const tool of ['navigate', 'draw', 'edit'] as const)
        for (const hasTarget of [true, false])
          for (const panning of [true, false])
            for (const spaceHeld of [true, false])
              expect(
                cursorFor({
                  tool,
                  hasTarget,
                  tooFar: false,
                  panning,
                  spaceHeld,
                  closing: false,
                  overHandle: false,
                  overStretch: false,
                  snapping: false,
                  overFill: false,
                })
              ).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('refuses with a CSS keyword rather than an image of ours', () => {
      // Settled 2026-09-22 and re-affirmed on 2026-10-08, the dev dropping a badged cross on its cost:
      // "on ne va pas se faire chier à faire un autre curseur."
      expect(REFUSED).toBe('not-allowed')
      expect(cursorCss(cursorFor({ ...AT_REST, tool: 'draw' }))).toBe('not-allowed')
    })
  })
})

describe('cursorCss', () => {
  describe('happy path', () => {
    it('writes the image, its hot spot and a fallback', () => {
      const css = cursorCss('cross')

      expect(css).toMatch(/^url\("data:image\/svg\+xml,/)
      expect(css).toMatch(/\) 16 16, crosshair$/)
    })
  })

  describe('variants', () => {
    it('gives the arrow its own hot spot, which is its tip and not its centre', () => {
      expect(cursorCss('arrow')).toMatch(/\) 6 4, default$/)
    })

    it('names a fallback suited to each, so a failed image still means something', () => {
      expect(cursorCss('hand-open')).toMatch(/, grab$/)
      expect(cursorCss('hand-closed')).toMatch(/, grabbing$/)
    })
  })

  describe('managed errors', () => {
    it('passes the refusal through untouched, it being a keyword and not an image', () => {
      expect(cursorCss(REFUSED)).toBe('not-allowed')
    })
  })

  describe('unmanaged errors', () => {
    it('inlines every image, so none of them can 404 into a silent fallback', () => {
      for (const name of ['hand-open', 'hand-closed', 'cross', 'arrow'] as const)
        expect(cursorCss(name)).toContain('url("data:image/svg+xml,')
    })
  })

  describe('edge cases', () => {
    it('ships no provenance manifest — the drawing, not the design tool’s metadata', () => {
      // 8.1 kB per file as exported, of which ~7.7 kB was a C2PA manifest. Stripped on the way into
      // the package; the source asset in `design/cursors/` keeps it. Measured, and asserted here
      // because an unstripped copy would quietly put 77 kB of base64 in the bundle.
      for (const name of ['hand-open', 'hand-closed', 'cross', 'arrow'] as const) {
        expect(cursorCss(name)).not.toContain('c2pa:manifest')
        expect(cursorCss(name).length).toBeLessThan(2500)
      }
    })
  })
})
