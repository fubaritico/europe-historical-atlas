import { describe, expect, it, vi } from 'vitest'

import { fetchTitleNames, fetchVassalLinks, readVassalChain } from './readVassalChain'

/** Nantes in 1100, as the plan tells it: the count to the duke, the duke to the king, the king to no one. */
const LINKS = [
  { id: 1, vassal: 10, answersTo: 'suzerain', suzerain: 20, date: span(1084, 1103) },
  { id: 2, vassal: 20, answersTo: 'suzerain', suzerain: 30, date: span(1084, 1112) },
  { id: 3, vassal: 30, answersTo: 'no-one', suzerain: null, date: span(1060, 1108) },
]

const NAMES: Record<string, string> = {
  '10': 'Mathias II — comté de Nantes, 1084–1103',
  '20': 'Alain IV — duché de Bretagne, 1084–1112',
  '30': 'Philippe Ier — royaume de France, 1060–1108',
  '40': 'Henri IV — Saint-Empire, 1084–1105',
}

/**
 * A date group from one year to another.
 * @param from - the first year
 * @param to - the last
 * @returns the group
 */
function span(from: number, to: number) {
  return { start: { year: from }, end: { year: to } }
}

/**
 * A `fetch` answering the links and the titles from literals, as Payload's API would.
 * @param links - the links the base holds
 * @param names - the titles' names it holds, by id
 * @returns the fetch
 */
function stubFetch(links: unknown[] = LINKS, names: Record<string, string> = NAMES) {
  return vi.fn<typeof fetch>((input) => {
    const url = new URL(input as string, 'http://cms.test')
    if (url.pathname === '/api/vassal-links') {
      return Promise.resolve(new Response(JSON.stringify({ docs: links })))
    }
    const ids = (url.searchParams.get('where[id][in]') ?? '').split(',')
    const docs = ids.filter((id) => id in names).map((id) => ({ id: Number(id), label: names[id] }))
    return Promise.resolve(new Response(JSON.stringify({ docs })))
  })
}

describe('readVassalChain', () => {
  describe('happy path', () => {
    it('reads the chain of the count of Nantes in 1100, named, up to the king, sovereign', async () => {
      expect(await readVassalChain(stubFetch(), '/api', 10, 1100)).toEqual([
        {
          titles: [
            { id: 10, name: NAMES['10'] },
            { id: 20, name: NAMES['20'] },
            { id: 30, name: NAMES['30'] },
          ],
          // Each step's link, for the sheet to change it — none of these links has a source line
          steps: [
            { link: '1', source: null },
            { link: '2', source: null },
          ],
          end: 'sovereign',
        },
      ])
    })

    // 2026-11-16: the chain is edited in its blocks — each link with its source, read from the base
    it("gives each step the source of its link's first line", async () => {
      const sourced = [
        { ...LINKS[0], lines: [{ source: 4 }] },
        { ...LINKS[1], lines: [] },
        LINKS[2],
      ]
      const [reading] = await readVassalChain(stubFetch(sourced), '/api', 10, 1100)
      expect(reading?.steps).toEqual([
        { link: '1', source: 4 },
        { link: '2', source: null },
      ])
    })

    it('reads every link in one call, its fields only, as the contributor', async () => {
      const fetcher = stubFetch()
      await fetchVassalLinks(fetcher, '/api')
      const [input, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
      const url = new URL(input, 'http://cms.test')
      expect([url.searchParams.get('pagination'), url.searchParams.get('select[date]')]).toEqual([
        'false',
        'true',
      ])
      expect(init.credentials).toBe('include')
    })
  })

  describe('variants', () => {
    it('stops where no link is known in the year: beyond, we do not know', async () => {
      const chain = await readVassalChain(stubFetch(), '/api', 10, 1110)
      expect(chain).toEqual([
        { titles: [{ id: 10, name: NAMES['10'] }], steps: [], end: 'unknown' },
      ])
    })

    it('keeps both readings when the sources diverge', async () => {
      const diverging = [
        ...LINKS,
        { id: 4, vassal: 20, answersTo: 'suzerain', suzerain: 40, date: span(1100, 1100) },
      ]
      const chain = await readVassalChain(stubFetch(diverging), '/api', 10, 1100)
      expect(chain.map((reading) => reading.titles.map((title) => title.id))).toEqual([
        [10, 20, 30],
        [10, 20, 40],
      ])
    })
  })

  describe('managed errors', () => {
    it('lets a refusal of the server through, for the field to say', async () => {
      const refusing = vi.fn(() => Promise.resolve(new Response('', { status: 403 })))
      await expect(
        readVassalChain(refusing as unknown as typeof fetch, '/api', 10, 1100)
      ).rejects.toThrow('could not be read (403)')
    })

    it('refuses a chain naming a title the base does not name, rather than show a hole', async () => {
      const { '20': _duke, ...withoutDuke } = NAMES
      await expect(
        readVassalChain(stubFetch(LINKS, withoutDuke), '/api', 10, 1100)
      ).rejects.toThrow('does not name: 20')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an answer that is not a list', async () => {
      const odd = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ doc: {} }))))
      await expect(fetchVassalLinks(odd as unknown as typeof fetch, '/api')).rejects.toThrow(
        'answered no list'
      )
    })

    it('refuses a link without its id', async () => {
      const fetcher = stubFetch([{ vassal: 10, answersTo: 'no-one', date: span(1100, 1100) }])
      await expect(fetchVassalLinks(fetcher, '/api')).rejects.toThrow('without its id')
    })
  })

  describe('edge cases', () => {
    it('counts two links entered alike as one reading, not a divergence', async () => {
      const twice = [...LINKS, { ...LINKS[0], id: 9 }]
      const chain = await readVassalChain(stubFetch(twice), '/api', 10, 1100)
      expect(chain).toHaveLength(1)
    })

    it('leaves out a link whose suzerain is gone — the chain then says we do not know', async () => {
      const broken = [
        { id: 1, vassal: 10, answersTo: 'suzerain', suzerain: null, date: span(1084, 1103) },
      ]
      const chain = await readVassalChain(stubFetch(broken), '/api', 10, 1100)
      expect(chain[0]?.end).toBe('unknown')
    })

    it('asks each title of the chain once, however many readings pass through it', async () => {
      const fetcher = stubFetch()
      await fetchTitleNames(fetcher, '/api', ['10', '20'])
      const url = new URL(fetcher.mock.calls[0]?.[0] as string, 'http://cms.test')
      expect(url.searchParams.get('where[id][in]')).toBe('10,20')
    })
  })
})
