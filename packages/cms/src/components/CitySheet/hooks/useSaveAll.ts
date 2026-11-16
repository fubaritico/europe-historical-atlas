import type { ChainSaver } from './useChainSaver'
import type { CitySheetMessageKey } from '../i18n'
import type { ChainAnswer } from '../utils/saveLines'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'
import type { FormikHelpers } from 'formik'

/** What the sheet's « Enregistrer » saves. */
export interface SaveTargets {
  /** The chain's lines waiting. */
  readonly saver: ChainSaver
  /** The sheet's values as opened — what tells whether the sheet itself changed. */
  readonly initialValues: SheetValues
  /** Saves the sheet itself. */
  readonly saveSheet: (values: SheetValues, helpers: FormikHelpers<SheetValues>) => Promise<void>
}

/** The sheet's « Enregistrer ». */
export interface SaveAll {
  /** Formik's `onSubmit`. */
  readonly submit: (values: SheetValues, helpers: FormikHelpers<SheetValues>) => Promise<void>
}

/**
 * What the top of the sheet says of a chain not saved, by where it stopped — `null` where nothing is to add: a link
 * the server kept is said by its toast alone (the dev, 2026-11-16), a save already running says the rest itself.
 */
const STOPPED: Readonly<Record<Exclude<ChainAnswer, 'saved'>, CitySheetMessageKey | null>> = {
  line: 'chainNotSaved',
  holder: 'chainHolderNotSaved',
  'no-year': 'chainNotSavedNoYear',
  'no-holder': 'chainNotSavedNoHolder',
  removal: null,
  busy: null,
}

/**
 * The sheet's « Enregistrer » (the dev, 2026-11-16: nothing saves itself, and the button says what is missing): the
 * chain's lines first — links the sheet does not hold — then the sheet, when its own fields changed. Where the chain
 * stops, the sheet is not saved, and the top says where to look ({@link STOPPED}); nothing changed at all is said too.
 * @param targets - the chain's lines, the values as opened, the sheet's own save
 * @param say - the translator
 * @returns the submit
 */
export function useSaveAll(targets: SaveTargets, say: Say): SaveAll {
  const { saver, initialValues, saveSheet } = targets
  return {
    submit: async (values, helpers) => {
      helpers.setStatus(undefined)
      const waiting = saver.waiting
      const answer = await saver.saveAll()
      if (answer !== 'saved') {
        const stopped = STOPPED[answer]
        if (stopped !== null) helpers.setStatus(say(stopped))
        return
      }
      // The values are plain data, as Formik's own `dirty` compares them
      const changed = JSON.stringify(values) !== JSON.stringify(initialValues)
      if (changed) await saveSheet(values, helpers)
      else if (waiting === 0) helpers.setStatus(say('nothingToSave'))
    },
  }
}
