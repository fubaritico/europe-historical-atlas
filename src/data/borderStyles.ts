/**
 * How a border between two particular polities is drawn.
 *
 * A border is not one thing. Between two sovereigns it is a solid line; between two crowns held by one
 * person it is a fiction the map should admit to, and atlases say so with a broken line; where two states
 * both claim the ground, a doubled line reads as a limit neither side conceded. The distinction is
 * editorial, so it lives in a table beside the colours rather than being inferred from geometry.
 */
export type BorderPattern = 'solid' | 'dashed' | 'double'

/** A drawing pattern pinned to whichever pair of polities matches two patterns. */
export interface BorderStyleRule {
  /** What the rule is for, in plain words. */
  label: string
  /** The two names to match, case-insensitively, one each — in either order. */
  between: readonly [RegExp, RegExp]
  /** How that border is drawn. */
  pattern: BorderPattern
}

/**
 * Editorial border styles, in priority order — the first rule that matches a pair wins.
 *
 * Matched by pattern rather than by exact name, for the same reason the colours are: the dataset renames
 * a polity from one century to the next. Anything unmatched is drawn solid, which is the honest default —
 * a line the map has nothing special to say about.
 *
 * Seeded with the unions a reader of a 1500 map will look for. Expect this table to grow: it is data, and
 * editing it needs no code change.
 */
export const BORDER_STYLE_RULES: BorderStyleRule[] = [
  {
    // Ferdinand and Isabella from 1479: two crowns, one household, and a border that stayed on the maps
    // for two centuries without ever being a border between strangers.
    label: 'Castile and Aragon in personal union',
    between: [/castil/i, /arag[oó]n/i],
    pattern: 'dashed',
  },
  {
    label: 'Poland and Lithuania in union',
    between: [/poland|polish/i, /lithuania/i],
    pattern: 'dashed',
  },
  {
    label: 'Austria and Hungary under one crown',
    between: [/austria|habsburg/i, /hungary/i],
    pattern: 'dashed',
  },
  {
    label: 'Sweden and Norway under one crown',
    between: [/sweden/i, /norway/i],
    pattern: 'dashed',
  },
]

/**
 * Pick how the border between two polities is drawn.
 * @param a - one polity's name, or `null` where the dataset has none
 * @param b - the other polity's name
 * @returns the rule's pattern, or `solid` when no rule claims the pair
 */
export function borderPatternFor(a: string | null, b: string | null): BorderPattern {
  if (a === null || b === null) return 'solid'
  // Once a union has been absorbed into a single name the rule must stop firing, or two fragments of
  // that same polity get a broken line between them. `Poland-Lithuania` is exactly this: by 1500 the
  // dataset carries one name containing both halves of the rule, so a name compared with itself would
  // satisfy both patterns at once.
  if (a === b) return 'solid'
  for (const rule of BORDER_STYLE_RULES) {
    const [first, second] = rule.between
    // Either order: the pair comes from a raster scan and carries no notion of which side is which.
    if ((first.test(a) && second.test(b)) || (first.test(b) && second.test(a))) return rule.pattern
  }
  return 'solid'
}
