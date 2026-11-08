import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  anchorsAddedSince,
  citySide,
  doubledPoints,
  enclaveRule,
  slivers,
  planPolygon,
  riverCandidates,
  spikes,
  stiffSegments,
  undatedPolities,
  verdictAfterMove,
  verdictChanges,
} from './measures.mjs'
import { yearMapFrom } from './yearMap.mjs'

/*
 * Two polities side by side along latitude 40° N, west and east of longitude 1, sharing the segment 1-2:
 *   West  0 (0,39) – 1 (1,39) – 2 (1,41) – 3 (0,41)
 *   East  1 (1,39) – 4 (2,39) – 5 (2,41) – 2 (1,41)
 * The shared border runs north along longitude 1 for 222 km.
 */
const map = yearMapFrom(
  {
    year: 1100,
    anchors: [
      [0, 39],
      [1, 39],
      [1, 41],
      [0, 41],
      [2, 39],
      [2, 41],
    ],
    claims: [
      { polity: 'west', rings: [[0, 1, 2, 3]] },
      { polity: 'east', rings: [[1, 4, 5, 2]] },
    ],
  },
  {
    polities: [
      { id: 'west', name: 'West', wikidata: 'Q1' },
      { id: 'east', name: 'East', wikidata: 'Q2' },
    ],
  }
)

/**
 * A city for the tests.
 * @param {string} name - its name
 * @param {[number, number]} at - its position
 * @param {string | null} holderQid - its sourced holder
 * @returns {import('./cities.mjs').City} the city
 */
function city(name, at, holderQid) {
  return { id: 0, name, at, holderName: holderQid, holderQid }
}

describe('citySide', () => {
  it('is ok on its sourced holder ground', () => {
    assert.equal(citySide(map, city('a', [0.5, 40], 'Q1')).verdict, 'ok')
  })

  it('is wrong on the other polity ground', () => {
    assert.equal(citySide(map, city('a', [1.5, 40], 'Q1')).verdict, 'wrong')
  })

  it('is absent when its holder is not a polity of the map', () => {
    assert.equal(citySide(map, city('a', [0.5, 40], 'Q9')).verdict, 'absent')
  })

  it('is unsourced without a holder', () => {
    assert.equal(citySide(map, city('a', [0.5, 40], null)).verdict, 'unsourced')
  })
})

describe('enclaveRule', () => {
  const stranded = city('stranded', [1.5, 40], 'Q1')

  it('offers an enclave capped at 8 km when the opposing witness is 21 km away', () => {
    const rule = enclaveRule(stranded, [stranded, city('far', [1.5, 40.19], 'Q2')])
    assert.equal(rule.verdict, 'enclave')
    assert.equal(rule.radiusKm, 8)
  })

  it('offers half the gap when the opposing witness is 13.6 km away — Almenar facing Tamarite', () => {
    const rule = enclaveRule(stranded, [
      stranded,
      city('tamarite', [1.5, 40 + 13.6 / 111.32], 'Q2'),
    ])
    assert.equal(rule.radiusKm.toFixed(1), '6.8')
  })

  it('makes the zone disputed when the opposing witness is 1.5 km away', () => {
    const rule = enclaveRule(stranded, [stranded, city('near', [1.5, 40.0135], 'Q2')])
    assert.equal(rule.verdict, 'disputed')
    assert.equal(rule.radiusKm, 0)
  })

  it('counts a witness whose holder the map does not draw — Zaidín facing Velilla', () => {
    const rule = enclaveRule(stranded, [
      stranded,
      city('velilla', [1.5, 40.0135], 'Q9'),
      city('far', [1.5, 40.5], 'Q2'),
    ])
    assert.equal(rule.nearest?.name, 'velilla')
    assert.equal(rule.verdict, 'disputed')
  })

  it('ignores a witness of the same holder', () => {
    const rule = enclaveRule(stranded, [
      stranded,
      city('ally', [1.5, 40.001], 'Q1'),
      city('far', [1.5, 40.1], 'Q2'),
    ])
    assert.equal(rule.nearest?.name, 'far')
  })
})

describe('spikes', () => {
  it('finds none on two squares', () => {
    assert.deepEqual(spikes(map, undefined), [])
  })

  // A sliver: its tip at anchor 0 is 18° once longitude is shrunk at 40° N (atan(27.8 / 85.3)).
  const sliver = yearMapFrom(
    {
      year: 1100,
      anchors: [
        [0, 40],
        [1, 40.25],
        [1, 40],
      ],
      claims: [{ polity: 'west', rings: [[0, 1, 2]] }],
    },
    { polities: [{ id: 'west', name: 'West' }] }
  )

  it('finds the 18° tip of a sliver', () => {
    const found = spikes(sliver, 'west')
    assert.equal(found[0].anchor, 0)
    assert.equal(Math.round(found[0].degrees), 18)
  })

  it('leaves out a spike none of whose three anchors was touched', () => {
    assert.deepEqual(
      spikes(sliver, 'west', (anchor) => anchor === 99),
      []
    )
  })

  it('keeps a spike whose neighbour was touched', () => {
    assert.equal(spikes(sliver, 'west', (anchor) => anchor === 1)[0].anchor, 0)
  })
})

describe('slivers', () => {
  // A polity with a hole whose corner (anchor 5) comes 100 m from its own outline (0-1-2-3): a blade, as at Besalú.
  const bladed = yearMapFrom(
    {
      year: 1100,
      anchors: [
        [0, 40],
        [1, 40],
        [1, 41],
        [0, 41],
        [0.5, 40.5],
        [0.999, 40.5],
        [0.5, 40.6],
      ],
      claims: [
        {
          polity: 'host',
          rings: [
            [0, 1, 2, 3],
            [4, 5, 6],
          ],
        },
      ],
    },
    { polities: [{ id: 'host', name: 'Host' }] }
  )

  it('finds the hole corner 85 m from the outline', () => {
    const found = slivers(bladed, (anchor) => anchor === 5)
    assert.equal(found.length, 1)
    assert.equal(found[0].anchor, 5)
    assert.ok(found[0].km < 0.1)
  })

  it('finds nothing at an anchor far from every other segment', () => {
    assert.deepEqual(
      slivers(bladed, (anchor) => anchor === 4),
      []
    )
  })

  it('never measures an anchor against its own two segments', () => {
    assert.deepEqual(
      slivers(map, () => true),
      []
    )
  })
})

describe('undatedPolities', () => {
  const registered = yearMapFrom(
    { year: 1100, anchors: [], claims: [] },
    {
      polities: [
        { id: 'roussillon', name: 'Roussillon', wikidata: 'Q1541813' },
        {
          id: 'barcelona',
          name: 'Barcelona',
          wikidata: 'Q1233672',
          existsFrom: 801,
          existsTo: 1164,
        },
        { id: 'cerdanya', name: 'Cerdanya', wikidata: 'Q652275', existsFrom: 798, existsTo: null },
        { id: 'tribe', name: 'Tribe' },
      ],
    }
  )

  it('lists a polity with a Wikidata id and no dates, and one with a date missing', () => {
    assert.deepEqual(
      undatedPolities(registered).map((p) => [p.id, p.missing]),
      [
        ['cerdanya', ['existsTo']],
        ['roussillon', ['existsFrom', 'existsTo']],
      ]
    )
  })

  it('leaves out a dated polity and one without a Wikidata id', () => {
    const ids = undatedPolities(registered).map((p) => p.id)
    assert.equal(ids.includes('barcelona'), false)
    assert.equal(ids.includes('tribe'), false)
  })
})

describe('doubledPoints', () => {
  // Two anchors at one position, one after the other on the ring — the import's defect near Cuenca.
  const doubled = yearMapFrom(
    {
      year: 1100,
      anchors: [
        [0, 40],
        [1, 40],
        [1, 40],
        [1, 41],
      ],
      claims: [{ polity: 'west', rings: [[0, 1, 2, 3]] }],
    },
    { polities: [{ id: 'west', name: 'West' }] }
  )

  it('names the segment between two anchors at one position', () => {
    assert.deepEqual(doubledPoints(doubled, undefined), [
      { polity: 'west', a: 1, b: 2, at: [1, 40] },
    ])
  })

  it('finds none on a clean map', () => {
    assert.deepEqual(doubledPoints(map, undefined), [])
  })

  it('is what spikes cannot see: the same ring gives no spike there', () => {
    assert.equal(
      spikes(doubled, 'west').some((s) => s.anchor === 1 || s.anchor === 2),
      false
    )
  })
})

describe('stiffSegments', () => {
  it('lists the 223 km shared border once, with both polities', () => {
    const stiff = stiffSegments(map, undefined)
    assert.equal(stiff.length, 1)
    assert.deepEqual(stiff[0].polities, ['east', 'west'])
    assert.equal(Math.round(stiff[0].km), 223)
  })

  it('leaves out the borders of a polity not named', () => {
    assert.deepEqual(stiffSegments(map, 'south'), [])
  })
})

describe('verdictAfterMove', () => {
  const wrong = citySide(map, city('a', [1.5, 40], 'Q1'))

  it('lands ok when the zone goes to its sourced holder', () => {
    assert.equal(verdictAfterMove(wrong, 'west'), 'ok')
  })

  it('lands wrong when the zone goes to another polity', () => {
    assert.equal(verdictAfterMove(citySide(map, city('b', [0.5, 40], 'Q1')), 'east'), 'wrong')
  })

  it('in an overlap, keeps right a city of the polity already there', () => {
    const western = citySide(map, city('d', [0.5, 40], 'Q1'))
    assert.equal(verdictAfterMove(western, 'east', true), 'ok')
    assert.equal(verdictAfterMove(western, 'east'), 'wrong')
  })

  it('keeps absent for a holder the map does not draw', () => {
    assert.equal(verdictAfterMove(citySide(map, city('c', [0.5, 40], 'Q9')), 'west'), 'absent')
  })
})

describe('verdictChanges and anchorsAddedSince', () => {
  // The same two polities after a retouch: the border pushed east to longitude 1.6, so a city at 1.5 changes side.
  // The anchors are renumbered, as the Cartographer does at every save.
  const after = yearMapFrom(
    {
      year: 1100,
      anchors: [
        [1.6, 41],
        [0, 39],
        [1.6, 39],
        [0, 41],
        [2, 39],
        [2, 41],
      ],
      claims: [
        { polity: 'west', rings: [[1, 2, 0, 3]] },
        { polity: 'east', rings: [[2, 4, 5, 0]] },
      ],
    },
    {
      polities: [
        { id: 'west', name: 'West', wikidata: 'Q1' },
        { id: 'east', name: 'East', wikidata: 'Q2' },
      ],
    }
  )

  it('lists the city that changed side, with its verdict before', () => {
    const moved = city('moved', [1.5, 40], 'Q1')
    const still = city('still', [0.5, 40], 'Q1')
    const changes = verdictChanges(map, after, [moved, still])
    assert.deepEqual(
      changes.map((c) => [c.side.city.name, c.before, c.side.verdict]),
      [['moved', 'wrong', 'ok']]
    )
  })

  it('compares anchors by position, not by index, across a renumbering', () => {
    const added = anchorsAddedSince(after, map)
    // Anchor 3 of the new file is (0, 41), anchor 3 of the old one: unchanged, though not at the same index.
    assert.equal(added(3), false)
    assert.equal(added(0), true)
    assert.equal(added(2), true)
  })
})

describe('riverCandidates', () => {
  it('finds a river 5 km from the shared border along its length, and not along the coast', () => {
    const river = {
      name: 'Meridian',
      points: /** @type {[number, number][]} */ ([
        [1.06, 38.9],
        [1.06, 41.1],
      ]),
    }
    const found = riverCandidates(map, 'west', [river])
    assert.equal(found.length, 1)
    assert.equal(found[0].river, 'Meridian')
    assert.equal(found[0].neighbour, 'east')
    assert.ok(found[0].km > 200)
  })

  it('finds nothing when the river is 20 km away', () => {
    const river = {
      name: 'Far',
      points: /** @type {[number, number][]} */ ([
        [1.25, 38.9],
        [1.25, 41.1],
      ]),
    }
    assert.deepEqual(riverCandidates(map, 'west', [river]), [])
  })

  it('cuts the run where the river leaves the 8 km band, and keeps both halves', () => {
    // Near the border (5 km) from 39° to 39.8°, 20 km away from 39.9° to 40.1°, near again from 40.2° to 41°.
    const river = {
      name: 'Bend',
      points: /** @type {[number, number][]} */ ([
        [1.06, 38.9],
        [1.06, 39.8],
        [1.25, 39.9],
        [1.25, 40.1],
        [1.06, 40.2],
        [1.06, 41.1],
      ]),
    }
    const found = riverCandidates(map, 'west', [river])
    assert.equal(found.length, 2)
    assert.ok(found.every((run) => run.km > 70 && run.km < 100))
  })

  it('drops a run shorter than 30 km — a crossing, not a course', () => {
    const river = {
      name: 'Short',
      points: /** @type {[number, number][]} */ ([
        [1.06, 39],
        [1.06, 39.2],
        [1.5, 39.2],
      ]),
    }
    assert.deepEqual(riverCandidates(map, 'west', [river]), [])
  })

  it('never joins two unnamed rivers into one run', () => {
    const unnamed = (from, to) => ({
      name: null,
      points: /** @type {[number, number][]} */ ([
        [1.06, from],
        [1.06, to],
      ]),
    })
    const found = riverCandidates(map, 'west', [unnamed(38.9, 40), unnamed(40, 41.1)])
    assert.equal(found.length, 2)
  })

  it('joins two pieces of one name, as the dataset cuts a river', () => {
    const piece = (from, to) => ({
      name: 'Cut',
      points: /** @type {[number, number][]} */ ([
        [1.06, from],
        [1.06, to],
      ]),
    })
    assert.equal(riverCandidates(map, 'west', [piece(38.9, 40), piece(40, 41.1)]).length, 1)
  })
})

describe('planPolygon', () => {
  it('reads anchor indices and positions in one plan', () => {
    assert.deepEqual(planPolygon(map, [1, [1.5, 40], 2]), [
      [1, 39],
      [1.5, 40],
      [1, 41],
    ])
  })

  it('refuses an anchor the map does not have', () => {
    assert.throws(() => planPolygon(map, [99]), /anchor 99/)
  })
})
