// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CITY_SHEET_MESSAGES } from '../i18n'
import { EMPTY_MOMENT } from '../utils/sheetValues'

import { useSaveAll } from './useSaveAll'

import type { ChainSaver } from './useChainSaver'
import type { ChainAnswer } from '../utils/saveLines'
import type { SheetValues } from '../utils/sheetValues'
import type { FormikHelpers } from 'formik'

const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

const OPENED: SheetValues = {
  place: null,
  date: { start: { ...EMPTY_MOMENT, year: '1100' }, end: EMPTY_MOMENT },
  importance: '',
  reasons: [],
  testimonies: [],
  communities: [],
  holderTitle: 10,
  periodName: null,
  holderName: '',
  holderQid: '',
  showInAtlas: false,
}

/**
 * « Enregistrer » over a chain answering as told, with this many changes waiting in it.
 * @param answer - how the chain's save ends
 * @param waiting - how many changes wait in the chain
 * @returns the submit, the sheet's own save and Formik's helpers
 */
function setUp(answer: ChainAnswer, waiting = 1) {
  const saver: ChainSaver = {
    waiting,
    setWaiting: vi.fn(),
    register: vi.fn(),
    saveAll: vi.fn(() => Promise.resolve(answer)),
  }
  const saveSheet = vi.fn(() => Promise.resolve())
  const helpers = { setStatus: vi.fn() } as unknown as FormikHelpers<SheetValues>
  const { submit } = renderHook(() => useSaveAll({ saver, initialValues: OPENED, saveSheet }, say))
    .result.current
  return { submit, saveSheet, helpers }
}

/** The sheet with one of its own fields changed. */
const CHANGED: SheetValues = { ...OPENED, importance: 'city' }

describe('useSaveAll', () => {
  describe('happy path', () => {
    it('saves the chain, then the sheet whose fields changed', async () => {
      const { submit, saveSheet, helpers } = setUp('saved')
      await submit(CHANGED, helpers)
      expect(saveSheet).toHaveBeenCalledWith(CHANGED, helpers)
    })
  })

  describe('variants', () => {
    it('saves the chain alone when only it changed, and says nothing more', async () => {
      const { submit, saveSheet, helpers } = setUp('saved')
      await submit(OPENED, helpers)
      expect(saveSheet).not.toHaveBeenCalled()
      expect(helpers.setStatus).toHaveBeenLastCalledWith(undefined)
    })

    it('says nothing is to save when neither the chain nor the sheet changed', async () => {
      const { submit, helpers } = setUp('saved', 0)
      await submit(OPENED, helpers)
      expect(helpers.setStatus).toHaveBeenLastCalledWith(say('nothingToSave'))
    })
  })

  describe('managed errors', () => {
    it.each([
      ['line', 'chainNotSaved'],
      ['holder', 'chainHolderNotSaved'],
      ['no-year', 'chainNotSavedNoYear'],
      ['no-holder', 'chainNotSavedNoHolder'],
    ] as const)(
      'stops at a chain answering %s: the sheet is not saved, the top says %s',
      async (answer, key) => {
        const { submit, saveSheet, helpers } = setUp(answer)
        await submit(CHANGED, helpers)
        expect(saveSheet).not.toHaveBeenCalled()
        expect(helpers.setStatus).toHaveBeenLastCalledWith(say(key))
      }
    )

    it('stops at a link the server kept, and leaves the top empty: its toast says it', async () => {
      const { submit, saveSheet, helpers } = setUp('removal')
      await submit(CHANGED, helpers)
      expect(saveSheet).not.toHaveBeenCalled()
      expect(helpers.setStatus).toHaveBeenLastCalledWith(undefined)
    })
  })

  // L4: N/A — a thrown chain save is said by the chain itself (saveLines catches every write)

  describe('edge cases', () => {
    it('sends nothing more while another save runs: the sheet is not written twice', async () => {
      const { submit, saveSheet, helpers } = setUp('busy')
      await submit(CHANGED, helpers)
      expect(saveSheet).not.toHaveBeenCalled()
      expect(helpers.setStatus).toHaveBeenLastCalledWith(undefined)
    })
  })
})
