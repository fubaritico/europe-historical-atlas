/**
 * Where a name is broken over two lines, when two make it larger enough (ATLAS-301,
 * `files/plans/atlas/country-names.md`; the dev's request, 2026-10-28: *« s'il n'y a pas la place, pouvoir
 * aller à la ligne »*).
 *
 * At a space only — a word is never cut — and at the space that makes the two lines most even, so the block
 * they make is as short as it can be: « Kingdom of the Almoravids » breaks before « the », not before
 * « Almoravids ».
 */

/** A name broken in two, by code point. */
export interface NameBreak {
  /** The space broken at, by code point: the first line is before it, the second after. */
  readonly at: number
  /** The first line's length, its advances summed, at a size of one. */
  readonly first: number
  /** The second line's. */
  readonly second: number
}

/**
 * The longer of a break's two lines — what makes the block wide.
 * @param b - the break
 * @returns its longer line's length
 */
const longest = (b: NameBreak): number => Math.max(b.first, b.second)

/**
 * The most even break of a name over two lines.
 *
 * Only at a space between two letters: a doubled space would start a line with a space, which shifts it off
 * centre, so a name spaced twice somewhere is broken only where it is spaced once.
 * @param text - the name
 * @param advances - each code point's advance, at a size of one
 * @returns the break, or `null` for a name with no space between two words
 * @throws when there is not one advance per code point — `namePlacement` checks the measure first, so a miss
 *   is a caller's defect
 */
export function breakInTwo(text: string, advances: readonly number[]): NameBreak | null {
  const letters = Array.from(text)
  if (advances.length !== letters.length)
    throw new Error(
      `[atlas] "${text}" has ${String(letters.length)} letters and ${String(advances.length)} advances to break by`
    )
  const total = advances.reduce((sum, advance) => sum + advance, 0)
  let best: NameBreak | null = null
  let before = 0
  letters.forEach((letter, at) => {
    const advance = advances[at] ?? Number.NaN // in range: the lengths were checked above
    const between = isLetter(letters[at - 1]) && isLetter(letters[at + 1])
    if (letter === ' ' && between) {
      const candidate = { at, first: before, second: total - before - advance }
      if (best === null || longest(candidate) < longest(best)) best = candidate
    }
    before += advance
  })
  return best
}

/**
 * Whether a code point is there and is not a space.
 * @param letter - the code point, `undefined` past either end
 * @returns whether it is a letter a line can start or end on
 */
function isLetter(letter: string | undefined): boolean {
  return letter !== undefined && letter !== ' '
}
