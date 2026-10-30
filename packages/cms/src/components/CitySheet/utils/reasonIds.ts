import type { RecordChoice } from './sheetValues'

/**
 * The reasons' ids for what the multi-select chose: it speaks strings, a reason's id is a number in SQLite. Each
 * choice is mapped back to the id the list holds, so a saved id never turns into its text — and a choice the list
 * does not hold is dropped, and said.
 * @param chosen - the multi-select's values, in the order chosen
 * @param reasons - the reasons offered
 * @returns their ids, in that order
 */
export function reasonIds(
  chosen: readonly string[],
  reasons: readonly RecordChoice[]
): (number | string)[] {
  return chosen.flatMap((value) => {
    const reason = reasons.find((one) => String(one.id) === value)
    if (reason !== undefined) return [reason.id]
    console.error(`[CMS] a reason was chosen that the list does not hold: ${value}`)
    return []
  })
}
