import type { MergeAsked } from './mergeRecords'

/** The command's own usage, said with each refusal. */
export const MERGE_USAGE =
  'usage : pnpm cms:merge <collection> <id gardé> <id retiré> — ex. pnpm cms:merge territories 367 412'

const id = (text: string): number => {
  if (!/^[1-9]\d*$/.test(text))
    throw new Error(`« ${text} » n’est pas un identifiant de fiche — ${MERGE_USAGE}`)
  return Number(text)
}

/**
 * Read the merge command's arguments: a collection, the id kept, the id merged away (CMS-509). Anything else is
 * refused with the usage — a misread id would merge the wrong record.
 * @param argv - the arguments after the script's name
 * @returns what is asked
 * @throws {Error} when an argument is missing, more are given, or an id is not a whole positive number
 */
export function parseMergeArgs(argv: readonly string[]): MergeAsked {
  const [collection, keep, remove, ...more] = argv
  if (collection === undefined || keep === undefined || remove === undefined || more.length > 0)
    throw new Error(`trois arguments attendus — ${MERGE_USAGE}`)
  return { collection, keep: id(keep), remove: id(remove) }
}
