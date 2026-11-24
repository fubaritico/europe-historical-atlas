import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachClient } from './attachClient'
import { mapYear } from './mapYear'
import { numberOf, yearOf } from './readYear'
import { resultSentence, resultsSummary } from './resultSentence'

import type { AttachResult } from '../../../titles/attachCities'

/**
 * A fetch answering one response.
 * @param status - its status
 * @param body - its JSON body
 * @returns the stub
 */
function answering(status: number, body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

const CREATED: AttachResult = { place: 1, name: 'Nîmes', result: 'created', sheet: 5 }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mapYear', () => {
  it('proposes the map that covers the title, else its first year', () => {
    expect(mapYear(1094, 1105)).toBe(1100)
    expect(mapYear(1100, null)).toBe(1100)
    expect(mapYear(1120, 1150)).toBe(1120)
    expect(mapYear(null, null)).toBeNull()
  })
})

describe('readYear', () => {
  it('reads a whole year typed, its sign kept, and a number a field holds', () => {
    expect([yearOf('1100'), yearOf(' -50 '), yearOf('12a'), yearOf('')]).toEqual([
      1100,
      -50,
      null,
      null,
    ])
    expect([numberOf(1094), numberOf(null), numberOf('1094'), numberOf(Number.NaN)]).toEqual([
      1094,
      null,
      null,
      null,
    ])
  })
})

describe('resultSentence', () => {
  it('says each result in a sentence', () => {
    expect(resultSentence(CREATED)).toBe(
      'Nîmes : fiche créée, tenue par ce titre, déduite de son district.'
    )
    expect(resultSentence({ ...CREATED, result: 'attached' })).toContain('rattachée à ce titre')
    expect(resultSentence({ ...CREATED, result: 'unchanged' })).toContain('déjà tenue par ce titre')
    expect(
      resultSentence({
        ...CREATED,
        result: 'conflict',
        reason: { kind: 'otherTitle', title: 9 },
        holder: 'Bernard Aton IV — vicomté d’Albi, 1100',
      })
    ).toBe(
      'Nîmes : laissée telle quelle — elle est tenue par Bernard Aton IV — vicomté d’Albi, 1100.'
    )
    expect(
      resultSentence({
        ...CREATED,
        result: 'conflict',
        reason: { kind: 'otherLine', holder: 'évêché de Nîmes' },
      })
    ).toContain('une ligne la donne à évêché de Nîmes')
    expect(
      resultSentence({ ...CREATED, result: 'failed', sheet: null, error: 'Not Found' })
    ).toContain('Not Found')
  })

  it('sums the whole answer in one line', () => {
    expect(
      resultsSummary([
        CREATED,
        { ...CREATED, place: 2, result: 'attached' },
        { ...CREATED, place: 3, result: 'unchanged' },
        { ...CREATED, place: 4, result: 'conflict', reason: { kind: 'otherLine', holder: 'x' } },
      ])
    ).toBe('4 villes : 2 rattachées ou créées, 1 déjà tenue, 1 laissée telle quelle.')
    expect(resultsSummary([CREATED])).toBe('1 ville : 1 rattachée ou créée.')
  })
})

describe('attachClient', () => {
  it('posts the year and the places to the title’s route, and answers the results', async () => {
    const fetchFile = answering(200, { results: [CREATED] })
    expect(await attachClient(7, 1100, [1], fetchFile)).toEqual({ ok: true, results: [CREATED] })
    expect(fetchFile).toHaveBeenCalledWith('/api/titles/7/cities', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: 1100, places: [1] }),
    })
  })

  it('shows the route’s refusal, and says an answer it cannot read with its status, both logged', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(
      await attachClient(7, 1110, [1], answering(422, { error: 'L’année 1110 sort…' }))
    ).toEqual({
      ok: false,
      message: 'L’année 1110 sort…',
    })
    const unreadable = { ok: false, status: 502, json: () => Promise.reject(new Error('html')) }
    expect(await attachClient(7, 1100, [1], vi.fn().mockResolvedValue(unreadable))).toEqual({
      ok: false,
      message: 'Réponse inattendue du rattachement (502).',
    })
    expect(error).toHaveBeenCalledTimes(2)
  })

  it('says the CMS does not answer when the route cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const answer = await attachClient(
      7,
      1100,
      [1],
      vi.fn().mockRejectedValue(new TypeError('Failed'))
    )
    expect(answer).toEqual({
      ok: false,
      message: 'L’outil de contribution ne répond pas : aucune ville n’a été rattachée, réessayez.',
    })
  })
})
