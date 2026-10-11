import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import {
  actionSentence,
  idleSession,
  overlayScene,
  ringNeighbours,
  targetHandles,
} from './toolSession'

import type { ActionInputs, OverlayInputs, SessionPoint } from './toolSession'

/**
 * A point of an outline in progress, reported by eye.
 * @param lon - its longitude, which these tests read as a screen x
 * @param lat - its latitude, read as a screen y
 * @returns the session point
 */
function here(lon: number, lat: number): SessionPoint {
  return { at: [lon, lat], provenance: { name: 'reported by eye', licence: 'fact' }, anchor: null }
}

/** A sentence's inputs with the Pen in hand, aimed at France, the pointer on the canvas. */
function action(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    tool: 'draw',
    targetName: 'Reaume de France',
    onCanvas: true,
    closing: false,
    snapping: null,
    following: null,
    joining: null,
    inserting: false,
    session: idleSession(),
    ...overrides,
  }
}

/** Overlay inputs where degrees and screen pixels are the same numbers. */
function overlay(overrides: Partial<OverlayInputs> = {}): OverlayInputs {
  return {
    session: idleSession(),
    tool: 'draw',
    pointer: [50, 50],
    toScreen: (lonLat) => [lonLat[0], lonLat[1]],
    anchors: [],
    movingFrom: [],
    closeRadius: 8,
    snapTarget: null,
    snapPreview: null,
    ...overrides,
  }
}

describe('toolSession', () => {
  describe('happy path', () => {
    // s02 — the bar names the action and whose it is.
    it('says who the Pen is drawing in', () => {
      expect(actionSentence(action())).toBe('Drawing in Reaume de France')
    })

    it('lists the target’s anchors only, each once', () => {
      // France holds 0 1 2 3, the Empire 1 4 5 2: anchors 1 and 2 are both's.
      expect(targetHandles(sharedBorderDocument(), 'fr-couronne')).toEqual([0, 1, 2, 3])
    })

    // s02 — "a rubber band runs from the eleventh anchor to the pointer".
    it('runs the rubber band from the last anchor to the pointer', () => {
      const session = {
        ...idleSession(),
        outline: [here(10, 10), here(20, 10)],
      }
      const scene = overlayScene(overlay({ session }))
      expect(scene.outline).toEqual([
        [10, 10],
        [20, 10],
      ])
      expect(scene.rubberTo).toEqual([50, 50])
    })
  })

  describe('variants', () => {
    it('says when a click would close the outline', () => {
      expect(actionSentence(action({ closing: true }))).toBe(
        'Closing the outline of Reaume de France'
      )
    })

    // s02 — "Selecting path from…", then "Moving path from…" while dragging.
    it('names the white arrow’s selection and its drag', () => {
      const selected = { ...idleSession(), selected: 3 }
      expect(actionSentence(action({ tool: 'edit', session: selected }))).toBe(
        'Selecting path from Reaume de France'
      )
      const moving = { ...selected, moving: { index: 3, to: [0, 0] as [number, number] } }
      expect(actionSentence(action({ tool: 'edit', session: moving }))).toBe(
        'Moving path from Reaume de France'
      )
    })

    // s03 — the white arrow over a stretch, where a click inserts an anchor; a drag still says it moves.
    it('names the insertion offered over a stretch, under the drag', () => {
      expect(actionSentence(action({ tool: 'edit', inserting: true }))).toBe(
        'Inserting a point into Reaume de France'
      )
      const moving = { ...idleSession(), moving: { index: 3, to: [0, 0] as [number, number] } }
      expect(actionSentence(action({ tool: 'edit', inserting: true, session: moving }))).toBe(
        'Moving path from Reaume de France'
      )
    })

    it('names the Pen’s insertion over the target’s stretch', () => {
      expect(actionSentence(action({ inserting: true }))).toBe(
        'Inserting a point into Reaume de France'
      )
    })

    it('offers to close once the pointer is on the first anchor of three', () => {
      const outline = [here(50, 52), here(90, 50), here(90, 90)]
      expect(overlayScene(overlay({ session: { ...idleSession(), outline } })).closing).toBe(true)
    })

    it('draws an anchor being dragged with the stretches it pulls', () => {
      const session = { ...idleSession(), moving: { index: 0, to: [5, 6] as [number, number] } }
      const scene = overlayScene(
        overlay({
          tool: 'edit',
          session,
          anchors: [
            [0, 0],
            [10, 0],
            [0, 10],
          ],
          movingFrom: [1, 2],
        })
      )
      expect(scene.moving).toEqual({
        at: [5, 6],
        from: [
          [10, 0],
          [0, 10],
        ],
      })
    })
  })

  describe('managed errors', () => {
    // s02 — "no subject, so the bar says what to do about it".
    it('tells the author to select a polity when there is nobody to act on', () => {
      expect(actionSentence(action({ targetName: null }))).toBe('Select a polity to draw in')
      expect(actionSentence(action({ tool: 'edit', targetName: null }))).toBe(
        'Select a polity to draw in'
      )
    })

    it('lists no handle when nobody is aimed at', () => {
      expect(targetHandles(sharedBorderDocument(), null)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('lists no handle for a target the document does not hold', () => {
      expect(targetHandles(sharedBorderDocument(), 'nobody')).toEqual([])
    })

    it('finds no neighbour for an anchor no ring holds', () => {
      expect(ringNeighbours(sharedBorderDocument(), 99)).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('says nothing under the hand, which has no subject', () => {
      expect(actionSentence(action({ tool: 'navigate' }))).toBeNull()
    })

    // Off the canvas the refusal is not repeated: the author is looking at the chrome, choosing.
    it('says nothing off the canvas when there is nobody to act on', () => {
      expect(actionSentence(action({ targetName: null, onCanvas: false }))).toBeNull()
    })

    it('takes a shared anchor’s neighbours from every ring holding it', () => {
      // Anchor 1 is France's (0 1 2 3) and the Empire's (1 4 5 2): its neighbours are 0, 2 and 4.
      expect(ringNeighbours(sharedBorderDocument(), 1).sort()).toEqual([0, 2, 4])
    })

    // Off the canvas, a band to the last known position would point where the author is not aiming.
    it('draws no rubber band when the pointer is off the canvas', () => {
      const session = { ...idleSession(), outline: [here(10, 10)] }
      expect(overlayScene(overlay({ session, pointer: null })).rubberTo).toBeNull()
    })

    it('does not offer to close an outline of two anchors, which encloses nothing', () => {
      const outline = [here(50, 52), here(90, 50)]
      expect(overlayScene(overlay({ session: { ...idleSession(), outline } })).closing).toBe(false)
    })
  })

  describe('the coast preview', () => {
    // The preview is the line the click will lay, so it takes the rubber band's place.
    it('shows the stretch instead of the rubber band', () => {
      const session = { ...idleSession(), outline: [here(10, 10)] }
      const stretch = [
        [10, 10],
        [20, 10],
        [30, 10],
      ] as const
      const scene = overlayScene(overlay({ session, snapTarget: [30, 10], snapPreview: stretch }))
      expect(scene.snapPreview).toBe(stretch)
      expect(scene.rubberTo).toBeNull()
    })

    // Without a stretch to offer, the band still runs — to the vertex the click would snap onto.
    it('runs the rubber band to the snap target, not to the pointer beside it', () => {
      const session = { ...idleSession(), outline: [here(10, 10)] }
      const scene = overlayScene(overlay({ session, pointer: [52, 49], snapTarget: [50, 50] }))
      expect(scene.rubberTo).toEqual([50, 50])
      expect(scene.snapTarget).toEqual([50, 50])
    })

    it('offers nothing under the arrow', () => {
      const scene = overlayScene(overlay({ tool: 'edit', snapTarget: [50, 50], snapPreview: [] }))
      expect(scene.snapTarget).toBeNull()
      expect(scene.snapPreview).toBeNull()
    })

    // s02 — "Following the coastline for Kingdom of France".
    // QUAL-003: over an existing anchor the bar says so, above the coast's sentences, under closing.
    it('names the shared anchor before the coast, and closing before the shared anchor', () => {
      const joining = 'Branching from a shared anchor — held by 1 path'
      expect(actionSentence(action({ joining, snapping: 'coastline' }))).toBe(joining)
      expect(actionSentence(action({ joining, closing: true }))).toBe(
        'Closing the outline of Reaume de France'
      )
    })

    // QUAL-110: s02's "place points freely", for the coast — on screen, before the click.
    it('says the Pen will place points freely when the coast is out of reach', () => {
      expect(actionSentence(action({ following: 'coastline' }))).toBe(
        'Drawing in Reaume de France — no coastline within reach, placing points freely'
      )
    })

    it('says the Pen is following the coastline while it is within reach', () => {
      expect(actionSentence(action({ snapping: 'coastline' }))).toBe(
        'Following the coastline for Reaume de France'
      )
      expect(actionSentence(action({ snapping: 'coastline', closing: true }))).toBe(
        'Closing the outline of Reaume de France'
      )
    })

    // s02 — "Following the Maas for Kingdom of France": the river's name verbatim, as the dataset has it.
    it('names the river under the pointer, verbatim', () => {
      expect(actionSentence(action({ following: 'river', snapping: 'Maas' }))).toBe(
        'Following the Maas for Reaume de France'
      )
    })

    it('says the Pen will place points freely when no river is within reach', () => {
      expect(actionSentence(action({ following: 'river' }))).toBe(
        'Drawing in Reaume de France — no river within reach, placing points freely'
      )
    })
  })
})
