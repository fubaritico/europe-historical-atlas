import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import {
  actionSentence,
  extentHandles,
  idleSession,
  isolatedAnchors,
  neighbourAnchors,
  overlayScene,
  penSnapAnchors,
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
    edge: null,
    inserting: false,
    tooFar: false,
    session: idleSession(),
    retracing: null,
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
    moves: [],
    neighboursOf: () => [],
    closeRadius: 8,
    snapTarget: null,
    snapPreview: null,
    replaced: null,
    ...overrides,
  }
}

describe('toolSession', () => {
  describe('the action sentence from too far out (H-34)', () => {
    it('asks to zoom in to draw, still naming the polity the Pen would draw in', () => {
      expect(actionSentence(action({ tooFar: true }))).toBe('Zoom in to draw in Reaume de France')
    })

    it('asks to zoom in to edit with the arrow', () => {
      expect(actionSentence(action({ tool: 'edit', tooFar: true }))).toBe(
        'Zoom in to edit Reaume de France'
      )
    })

    it('wins over what the Pen would otherwise offer — no promise of a snap that will be refused', () => {
      expect(actionSentence(action({ tooFar: true, snapping: 'Maas', closing: true }))).toBe(
        'Zoom in to draw in Reaume de France'
      )
    })

    it('still asks for a polity first when nobody is aimed at', () => {
      expect(actionSentence(action({ tooFar: true, targetName: null }))).toBe(
        'Select a polity to draw in'
      )
    })

    it('says nothing for the hand, far or near', () => {
      expect(actionSentence(action({ tool: 'navigate', tooFar: true }))).toBeNull()
    })
  })

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
      const selected = { ...idleSession(), selected: [3] }
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
      const scene = overlayScene(
        overlay({
          tool: 'edit',
          anchors: [
            [0, 0],
            [10, 0],
            [0, 10],
          ],
          moves: [{ index: 0, at: [5, 6] }],
          neighboursOf: () => [1, 2],
        })
      )
      expect(scene.moving).toEqual([
        {
          at: [5, 6],
          from: [
            [10, 0],
            [0, 10],
          ],
        },
      ])
    })

    // s03 — "all twelve move together": a neighbour that moves too is drawn where it lands.
    it('draws two neighbours dragged together, each pulled to where the other lands', () => {
      const scene = overlayScene(
        overlay({
          tool: 'edit',
          anchors: [
            [0, 0],
            [10, 0],
          ],
          moves: [
            { index: 0, at: [5, 5] },
            { index: 1, at: [15, 5] },
          ],
          neighboursOf: (index) => (index === 0 ? [1] : [0]),
        })
      )
      expect(scene.moving).toEqual([
        { at: [5, 5], from: [[15, 5]] },
        { at: [15, 5], from: [[5, 5]] },
      ])
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

    // CARTO-257 — a free point near the frame lands on its edge, or in its corner.
    it("says a free point lands on the map's edge, or in its corner", () => {
      expect(actionSentence(action({ edge: 'edge' }))).toBe(
        "Drawing in Reaume de France — on the map's edge"
      )
      expect(actionSentence(action({ edge: 'corner' }))).toBe(
        "Drawing in Reaume de France — in the map's corner"
      )
    })

    // CARTO-257 QUAL-003 — ⟨retrace⟩ clamps its free points too, and says so.
    it("says the map's edge or corner under ⟨retrace⟩ as well", () => {
      expect(actionSentence(action({ tool: 'retrace', edge: 'corner' }))).toBe(
        "Retracing Reaume de France — in the map's corner"
      )
      expect(actionSentence(action({ tool: 'retrace', edge: 'edge' }))).toBe(
        "Retracing Reaume de France — on the map's edge"
      )
    })

    // CARTO-257 — the coast comes first: near both, the Pen follows the coastline.
    it("names the coast before the map's edge", () => {
      expect(actionSentence(action({ edge: 'corner', snapping: 'coastline' }))).toBe(
        'Following the coastline for Reaume de France'
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

// The walk of 2026-10-13: following France's and Burgundy's borders for the Empire, the anchors to aim at
// could not be seen. France holds 0 1 2 3, the Empire 1 4 5 2: anchors 1 and 2 are both's.
describe('neighbourAnchors and penSnapAnchors', () => {
  describe('happy path', () => {
    it('lists the anchors only a neighbour holds, the target’s own left to its handles', () => {
      expect(neighbourAnchors(sharedBorderDocument(), 'fr-couronne')).toEqual([4, 5])
    })

    it('shows them with the Pen in hand, a target, and the view close enough', () => {
      expect(penSnapAnchors(sharedBorderDocument(), 'draw', 'hre', false)).toEqual([0, 3])
    })
  })

  describe('variants', () => {
    it('shows none to the white arrow, which takes the target’s points alone', () => {
      expect(penSnapAnchors(sharedBorderDocument(), 'edit', 'hre', false)).toEqual([])
    })

    it('shows none to the hand', () => {
      expect(penSnapAnchors(sharedBorderDocument(), 'navigate', 'hre', false)).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('shows none with nobody aimed at, where the Pen refuses anyway', () => {
      expect(penSnapAnchors(sharedBorderDocument(), 'draw', null, false)).toEqual([])
    })

    it('shows none from afar, where the tools wait for the zoom (s17)', () => {
      expect(penSnapAnchors(sharedBorderDocument(), 'draw', 'hre', true)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('treats an unknown target as holding nothing: every claimed anchor is a neighbour’s', () => {
      expect(neighbourAnchors(sharedBorderDocument(), 'nobody')).toEqual([0, 1, 2, 3, 4, 5])
    })
  })

  describe('edge cases', () => {
    it('lists an anchor held by two neighbours once', () => {
      const document = sharedBorderDocument()
      const [france] = document.polities
      if (france === undefined) throw new Error('the fixture has no polity')
      document.polities.push({ ...france, id: 'third', name: 'Third' })
      expect(neighbourAnchors(document, 'third')).toEqual([0, 1, 2, 3, 4, 5])
    })
  })
})

// 2026-10-13: a dot on every coast anchor made a solid blue band that swallowed the Pen's last anchor.
// France holds the ring 0 1 2 3; on screen, 0 and 1 are 4 px apart, 2 and 3 far from everything.
describe('isolatedAnchors', () => {
  const onScreen: [number, number][] = [
    [100, 100],
    [104, 100],
    [300, 300],
    [100, 300],
    [500, 100],
    [500, 300],
  ]

  describe('happy path', () => {
    it('keeps an anchor whose ring neighbours are both far, drops one a near neighbour shows', () => {
      expect(isolatedAnchors(sharedBorderDocument(), [0, 2, 3], onScreen, 12)).toEqual([2, 3])
    })
  })

  describe('variants', () => {
    it('keeps everything when the gap asked is zero', () => {
      expect(isolatedAnchors(sharedBorderDocument(), [0, 1, 2], onScreen, 0)).toEqual([0, 1, 2])
    })
  })

  // L3: N/A — a filter; an empty list is a valid answer.

  describe('unmanaged errors', () => {
    it('keeps an anchor with no projection rather than guessing its distance', () => {
      expect(isolatedAnchors(sharedBorderDocument(), [2], [], 12)).toEqual([2])
    })
  })

  describe('edge cases', () => {
    it('drops a shared anchor when any ring puts a neighbour near it', () => {
      // Anchor 1 is France's and the Empire's: near 0 in France's ring, far from 4 in the Empire's.
      expect(isolatedAnchors(sharedBorderDocument(), [1], onScreen, 12)).toEqual([])
    })

    it('measures across the ring’s closure, last to first', () => {
      // France's ring is 0 1 2 3: 3 closes onto 0, 200 px away — still isolated.
      expect(isolatedAnchors(sharedBorderDocument(), [3], onScreen, 12)).toEqual([3])
    })
  })
})

describe('toolSession — ⟨retrace⟩ (H-46)', () => {
  it('says ⟨retrace⟩’s own sentence while it is in hand', () => {
    const said = actionSentence(
      action({ tool: 'retrace', retracing: 'Retracing Reaume de France — start on this anchor' })
    )
    expect(said).toBe('Retracing Reaume de France — start on this anchor')
  })

  it('says the water a click would follow while the run is drawn', () => {
    expect(actionSentence(action({ tool: 'retrace', snapping: 'coastline' }))).toBe(
      'Retracing Reaume de France — following the coastline'
    )
    expect(actionSentence(action({ tool: 'retrace', joining: 'Branching from…' }))).toBe(
      'Retracing Reaume de France — on a neighbour’s anchor'
    )
    expect(actionSentence(action({ tool: 'retrace' }))).toBe(
      'Retracing Reaume de France — click one of its anchors to end'
    )
  })

  it('asks to zoom in to retrace from too far out', () => {
    expect(actionSentence(action({ tool: 'retrace', tooFar: true, retracing: 'x' }))).toBe(
      'Zoom in to retrace Reaume de France'
    )
  })

  it('shows the run in progress and the stretch it would replace, never a closing offer', () => {
    const session = idleSession()
    session.outline = [here(50, 50), here(100, 50), here(100, 100)]
    const scene = overlayScene(
      overlay({
        tool: 'retrace',
        session,
        pointer: [51, 51],
        replaced: [
          [0, 0],
          [1, 1],
        ],
      })
    )
    expect(scene.outline).toHaveLength(3)
    expect(scene.closing).toBe(false)
    expect(scene.replaced).toEqual([
      [0, 0],
      [1, 1],
    ])
  })

  it('shows no replaced stretch under the white arrow', () => {
    const scene = overlayScene(overlay({ tool: 'edit', replaced: [[0, 0]] }))
    expect(scene.replaced).toBeNull()
  })
})

describe('extentHandles', () => {
  it('adds the extent outline’s anchors to the target’s own, each once, ascending', () => {
    expect(extentHandles(sharedBorderDocument(), 'fr-couronne', [[5, 4, 1], [4]])).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  it('gives the target’s own anchors when the outline is empty', () => {
    expect(extentHandles(sharedBorderDocument(), 'fr-couronne', [])).toEqual([0, 1, 2, 3])
  })

  it('gives nothing when nobody is aimed', () => {
    expect(extentHandles(sharedBorderDocument(), null, [[4]])).toEqual([])
  })
})

/** France `0 1 2 3` as a vassal of the Empire `1 4 5 2`: they share anchors 1 and 2. */
function franceUnderTheEmpire(): ReturnType<typeof sharedBorderDocument> {
  const doc = sharedBorderDocument()
  const france = doc.polities.find((polity) => polity.id === 'fr-couronne')
  if (france) france.suzerain = 'hre'
  return doc
}

// The dev, 2026-10-15: the limit between a suzerain and its vassal is the vassal's to edit.
describe('extentHandles — the limits with the vassals', () => {
  it('leaves out the anchors the target shares with its vassal', () => {
    expect(extentHandles(franceUnderTheEmpire(), 'hre', [])).toEqual([4, 5])
  })

  it('keeps a shared anchor that lies on the extent outline — a tripoint against a foreign polity', () => {
    expect(extentHandles(franceUnderTheEmpire(), 'hre', [[1, 0]])).toEqual([0, 1, 4, 5])
  })

  it('keeps every own anchor of a polity with no vassal', () => {
    expect(extentHandles(sharedBorderDocument(), 'hre', [])).toEqual([1, 2, 4, 5])
  })
})
