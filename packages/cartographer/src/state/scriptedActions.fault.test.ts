import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scriptedActions } from './scriptedActions'

import type { ScriptedAnswer } from '@europe-historical-atlas/core/editor/scriptedOutlines'

// A ring closed but not carved needs a carving fault, which no fixture of core gives on demand: the gesture is stood in
vi.mock('@europe-historical-atlas/core/editor/scriptedOutlines', () => ({
  placeScriptedRing: (): ScriptedAnswer => ({
    ok: true,
    ring: [0, 1, 2],
    reused: 0,
    created: 3,
    carved: null,
    crossings: 0,
    refusal: 'not carved out of "hre": the cut failed',
  }),
  replaceScriptedRun: (): ScriptedAnswer => ({
    ok: false,
    ring: [],
    reused: 0,
    created: 0,
    carved: null,
    crossings: 0,
    refusal: 'no ring holds both anchors',
  }),
}))

const STEP = { kind: 'place-ring', label: 'place a ring' }

/**
 * The actions over a runner that runs the edit and records whether it was done.
 * @returns the actions and the steps recorded
 */
function actions() {
  const recorded: boolean[] = []
  const record = (edit: (document: never) => boolean): boolean => {
    const done = edit({} as never)
    recorded.push(done)
    return done
  }
  return { ...scriptedActions(record, { name: 'eye', licence: 'fact' }), recorded }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('scriptedActions, what is said', () => {
  it('says a ring closed but not carved as an error, the step kept (review QUAL-001)', () => {
    const { placeRing, recorded } = actions()

    const answer = placeRing('county', [], STEP)

    expect(answer.ok).toBe(true)
    expect(recorded).toEqual([true])
    expect(console.error).toHaveBeenCalledWith(
      '[Cartographer] placeRing: the ring is closed, not carved out of "hre": the cut failed'
    )
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('says a refusal as a warning, no step kept', () => {
    const { replaceRun, recorded } = actions()

    replaceRun(1, 2, [], STEP)

    expect(recorded).toEqual([false])
    expect(console.warn).toHaveBeenCalledWith(
      '[Cartographer] replaceRun refused: no ring holds both anchors'
    )
    expect(console.error).not.toHaveBeenCalled()
  })

  it('throws when the runner never runs the edit — a defect of the wiring', () => {
    const { placeRing } = scriptedActions(() => false, { name: 'eye', licence: 'fact' })

    expect(() => placeRing('county', [], STEP)).toThrow('the scripted edit was never run')
  })
})
