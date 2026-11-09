import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { inlandOf, offCoastStretches, ringsOnContours, segmentGrid, shoreDistance, shoreRetraces, unclaimedShores } from './offcoast.mjs'
import { holdersAt, yearMapFrom } from './yearMap.mjs'

/*
 * The shore runs along longitude 2°E, from 44°N to 46°N; the sea is east of it.
 * `west` holds 0..2°E: its east edge lies on the shore from 44 to 45°N, then bulges 0.3° (24 km) into the sea up to 46°N.
 * Its north and south edges are land borders with nobody's ground: on land, never off the shore.
 * `far` lies at sea 10..11°E, 630 km off: out of reach, never measured.
 */
/** Land west of the shore. */
const isLand = (/** @type {readonly [number, number]} */ p) => p[0] < 2

const shores = [{ points: /** @type {[number, number][]} */ ([[2, 44], [2, 45], [2, 46]]), closed: false }]

const map = yearMapFrom(
  {
    year: 1300,
    anchors: [
      [0, 44],
      [2, 44],
      [2, 45],
      [2.3, 45.5],
      [2, 46],
      [0, 46],
      [10, 44],
      [11, 44],
      [11, 45],
    ],
    claims: [
      { polity: 'west', rings: [[0, 1, 2, 3, 4, 5]] },
      { polity: 'far', rings: [[6, 7, 8]] },
    ],
  },
  { polities: [{ id: 'west', name: 'West' }, { id: 'far', name: 'Far' }] }
)

describe('shoreDistance', () => {
  const distance = shoreDistance(shores)

  it('measures to the segment, not to its points', () => {
    assert.ok(distance([2, 44.5]) < 0.01)
  })

  it('is Infinity beyond the shore reach', () => {
    assert.equal(distance([10, 44]), Infinity)
  })
})

describe('offCoastStretches', () => {
  const found = offCoastStretches(map, shoreDistance(shores), isLand)

  it('finds the bulge into the sea, from the anchor where it leaves the shore to the one where it comes back', () => {
    const west = found.filter((s) => s.polity === 'west')
    assert.equal(west.length, 1)
    assert.equal(west[0].from, 2)
    assert.equal(west[0].to, 4)
    assert.ok(west[0].worstKm > 20 && west[0].worstKm < 30, String(west[0].worstKm))
  })

  it('never counts a land border with nobody\u2019s ground as off the shore', () => {
    assert.equal(found.filter((s) => s.polity === 'west').length, 1)
  })

  it('leaves a polity out of reach of the sea alone', () => {
    assert.equal(found.some((s) => s.polity === 'far'), false)
  })

  it('leaves an edge another polity also draws: a land border is not a coast', () => {
    const shared = yearMapFrom(
      {
        year: 1300,
        anchors: map.anchors,
        claims: [
          { polity: 'west', rings: [[0, 1, 2, 3, 4, 5]] },
          { polity: 'other', rings: [[2, 3, 4, 7]] },
        ],
      },
      { polities: [{ id: 'west', name: 'West' }, { id: 'other', name: 'Other' }] }
    )
    const west = offCoastStretches(shared, shoreDistance(shores), isLand).filter((s) => s.polity === 'west')
    assert.deepEqual(west, [])
  })
})

describe('unclaimedShores', () => {
  /*
   * The shore along 2°E from 44 to 46°N, sampled every 0.1°. `short` holds 0..1.8°E: its coast stops 16 km short of the
   * sea. `inland` holds 0..1.4°E: 47 km short — the shore is truly empty there.
   */
  const shore = [{ points: Array.from({ length: 21 }, (_, k) => /** @type {[number, number]} */ ([2, 44 + k / 10])), closed: false }]
  const square = (/** @type {number} */ east) =>
    yearMapFrom(
      { year: 1300, anchors: [[0, 43.5], [east, 43.5], [east, 46.5], [0, 46.5]], claims: [{ polity: 'p', rings: [[0, 1, 2, 3]] }] },
      { polities: [{ id: 'p', name: 'P' }] }
    )

  it('finds the shore a polity stops short of, all along it', () => {
    const m = square(1.8)
    const found = unclaimedShores(m, shore, isLand, (p) => holdersAt(m, p))
    assert.equal(found.length, 1)
    assert.equal(found[0].polity, 'p')
    assert.equal(found[0].points, 21)
    assert.ok(found[0].worstKm > 14 && found[0].worstKm < 18, String(found[0].worstKm))
  })

  it('leaves a shore alone when the nearest polity is farther than a coast drawn short', () => {
    const m = square(1.4)
    assert.deepEqual(unclaimedShores(m, shore, isLand, (p) => holdersAt(m, p)), [])
  })

  it('finds nothing where the polity reaches the shore', () => {
    const m = square(2)
    assert.deepEqual(unclaimedShores(m, shore, isLand, (p) => holdersAt(m, p)), [])
  })
})

describe('shoreRetraces', () => {
  /*
   * The shore along 2°E, sampled every 0.1° from 44 to 46°N. `p`'s east side: on the shore at 44.0, 44.5, 45.5 and
   * 46.0°N, bulging out to 2.3°E at 45.0°N between 44.5 and 45.5 — one stretch over the sea, framed by two shore anchors.
   */
  const shore = [{ points: Array.from({ length: 21 }, (_, k) => /** @type {[number, number]} */ ([2, 44 + k / 10])), closed: false }]
  const m = yearMapFrom(
    {
      year: 1300,
      anchors: [[0, 44], [2, 44], [2, 44.5], [2.3, 45], [2, 45.5], [2, 46], [0, 46]],
      claims: [{ polity: 'p', rings: [[0, 1, 2, 3, 4, 5, 6]] }],
    },
    { polities: [{ id: 'p', name: 'P' }] }
  )
  const distance = shoreDistance(shore)
  const out = offCoastStretches(m, distance, isLand)
  const { runs, refused } = shoreRetraces(m, shore, distance, isLand, out, [])

  it('retraces only between the two shore anchors that frame the stretch over the sea', () => {
    assert.deepEqual(refused, [])
    assert.equal(runs.length, 1)
    assert.deepEqual([runs[0].startAt, runs[0].endAt], [[2, 44.5], [2, 45.5]])
    assert.equal(runs[0].interior, 1)
  })

  it('needs no inland point: both ends are anchors already there', () => {
    assert.equal(runs[0].startEdge, null)
    assert.equal(runs[0].endEdge, null)
  })

  it('refuses, saying why, a stretch with no land within reach to take a junction from', () => {
    const lone = yearMapFrom(
      { year: 1300, anchors: [[2.3, 44], [3, 44], [3, 46], [2.3, 46]], claims: [{ polity: 'p', rings: [[0, 1, 2, 3]] }] },
      { polities: [{ id: 'p', name: 'P' }] }
    )
    const r = shoreRetraces(lone, shore, distance, isLand, offCoastStretches(lone, distance, isLand), [])
    assert.equal(r.runs.length, 0)
    assert.match(r.refused[0].why, /no junction point inland/)
  })

  it('brings a polity that stops short of the sea out to it, through a junction inland at each end', () => {
    const short = yearMapFrom(
      {
        year: 1300,
        anchors: [[0, 44.2], [1.8, 44.2], [1.8, 44.6], [1.8, 45], [1.8, 45.4], [1.8, 45.8], [0, 45.8]],
        claims: [{ polity: 'p', rings: [[0, 1, 2, 3, 4, 5, 6]] }],
      },
      { polities: [{ id: 'p', name: 'P' }] }
    )
    const shoreFound = unclaimedShores(short, shore, isLand, (q) => holdersAt(short, q))
    const r = shoreRetraces(short, shore, distance, isLand, [], shoreFound)
    assert.equal(r.runs.length, 1, JSON.stringify(r.refused))
    assert.ok(r.runs[0].path.length > 2)
  })

  it('does not plan a retrace that would change nothing', () => {
    const onIt = yearMapFrom(
      { year: 1300, anchors: [[0, 44], [2, 44], [2, 46], [0, 46]], claims: [{ polity: 'p', rings: [[0, 1, 2, 3]] }] },
      { polities: [{ id: 'p', name: 'P' }] }
    )
    const r = shoreRetraces(onIt, shore, distance, isLand, [{ polity: 'p', ring: 0, from: 1, to: 2 }], [])
    assert.equal(r.runs.length, 0)
  })
})

describe('inlandOf', () => {
  // A fjord: water between 2.00 and 2.02°E (1.6 km), land on both banks. The shore point is on the west bank.
  const fjordLand = (/** @type {readonly [number, number]} */ p) => p[0] < 2 || p[0] > 2.02
  const bank = /** @type {[number, number][]} */ ([[2, 44.9], [2, 45], [2, 45.1]])

  it('takes the point square to the shore on its own bank, not across the fjord', () => {
    const at = inlandOf(bank, 1, false, fjordLand)
    assert.ok(at !== undefined && at[0] < 2, JSON.stringify(at))
  })

  it('finds no inland point where both sides a kilometre off are water', () => {
    assert.equal(inlandOf(bank, 1, false, () => false), undefined)
  })
})

describe('ringsOnContours', () => {
  it('names a ring drawn on its contour, and not one off it', () => {
    const loop = /** @type {[number, number][]} */ ([[5, 44], [5.2, 44], [5.2, 44.2], [5, 44.2]])
    const m = yearMapFrom(
      { year: 1300, anchors: [...loop, [6, 44], [6.4, 44], [6.4, 44.4]], claims: [{ polity: 'p', rings: [[0, 1, 2, 3], [4, 5, 6]] }] },
      { polities: [{ id: 'p', name: 'P' }] }
    )
    const on = ringsOnContours(m, shoreDistance([{ points: loop, closed: true }]))
    assert.deepEqual([...on], [m.claims[0].rings[0]])
  })
})

describe('segmentGrid', () => {
  // One segment 4° long along 60° N, from 10 to 14° E.
  const nearest = segmentGrid([{ a: [10, 60], b: [14, 60], item: 'shore' }])

  it('finds a long segment from near its middle, cells away from both its ends', () => {
    const found = nearest([12, 60.1], 50)
    assert.equal(found.item, 'shore')
    assert.ok(found.km > 10 && found.km < 12, String(found.km))
  })

  it('reaches as far in longitude as the reach asks, cells beyond the segment\u2019s last one at 60° N', () => {
    // The segment's last cell is 14; the point is in cell 16, 2.2° east of its end: 123 km at 60° N. A search of one
    // cell round the point (15 to 17) would miss it; a reach of 130 km searches three cells across.
    assert.equal(nearest([16.2, 60], 130).item, 'shore')
  })

  it('finds nothing beyond the reach', () => {
    assert.equal(nearest([16.2, 60], 100).item, null)
  })
})
