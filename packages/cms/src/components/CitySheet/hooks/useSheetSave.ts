import { useChainSaver } from './useChainSaver'
import { useHierarchyLinks } from './useHierarchyLinks'
import { useSaveAll } from './useSaveAll'

import type { ChainWriters } from '../internal/HolderChain'
import type { ChainReading } from '../utils/readHierarchyChain'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'
import type { FormikHelpers } from 'formik'

/** The sheet's save wired: the chain's reader and writers, and « Enregistrer ». */
export interface SheetSave {
  /** The chain of a title at a year. */
  readonly readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  /** What the chain writes, and the bridge to « Enregistrer ». */
  readonly writers: ChainWriters
  /** Formik's `onSubmit`: the chain's block first, then the sheet. */
  readonly submit: (values: SheetValues, helpers: FormikHelpers<SheetValues>) => Promise<void>
}

/**
 * The sheet's save and its chain, wired once (2026-11-16): the chain read and written through the API, its block
 * saved by « Enregistrer » before the sheet.
 * @param api - the API's root
 * @param initialValues - the sheet's values as opened
 * @param saveSheet - saves the sheet itself
 * @param say - the translator
 * @returns the reader, the writers and the submit
 */
export function useSheetSave(
  api: string,
  initialValues: SheetValues,
  saveSheet: (values: SheetValues, helpers: FormikHelpers<SheetValues>) => Promise<void>,
  say: Say
): SheetSave {
  const { readChain, ...links } = useHierarchyLinks(api)
  const saver = useChainSaver()
  const { submit } = useSaveAll({ saver, initialValues, saveSheet }, say)
  return { readChain, writers: { ...links, saver }, submit }
}
