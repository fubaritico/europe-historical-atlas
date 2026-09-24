import type { RgbColor } from '../utils/color'

/** A named colour pinned to whichever polities match a pattern. */
export interface RegionColorRule {
  /** What the rule is for, in plain words. */
  label: string
  /** Matched case-insensitively against the polity's name. */
  pattern: RegExp
  /** The colour those polities take. */
  color: RgbColor
}

/**
 * Editorial colour choices for the powers a reader looks for first.
 *
 * Matched by pattern rather than by exact name because the dataset renames a polity from one century to
 * the next — France is `Kingdom of France` in 1000 and `France` in 1500, England becomes
 * `United Kingdom of Great Britain and Ireland` by 1900. Order matters and is load-bearing: that last
 * name contains "Ireland", so the British rule has to be tested before the Irish one.
 *
 * Everything not matched here is coloured automatically, from the editable palette, so that no two
 * neighbours share a tint.
 */
export const REGION_COLOR_RULES: RegionColorRule[] = [
  {
    label: 'British Isles under one crown, and England before it',
    pattern: /united kingdom|great britain|\bengland\b/i,
    color: { r: 168, g: 67, b: 58 }, // red
  },
  { label: 'Ireland', pattern: /\bireland\b/i, color: { r: 63, g: 158, b: 87 } }, // bright green
  { label: 'France', pattern: /\bfrance\b/i, color: { r: 58, g: 94, b: 168 } }, // blue
  {
    label: 'Iberian crowns that became Spain',
    pattern: /castil|arag[oó]n|\bspain\b|espa[nñ]a/i,
    color: { r: 212, g: 178, b: 74 }, // yellow
  },
  { label: 'Portugal', pattern: /portug/i, color: { r: 92, g: 127, b: 78 } }, // green
  { label: 'Holy Roman Empire', pattern: /holy roman/i, color: { r: 200, g: 118, b: 58 } }, // orange
  { label: 'Ottoman Empire', pattern: /ottoman/i, color: { r: 42, g: 146, b: 78 } }, // bright green
  {
    // The dataset calls it `Eastern Roman Empire` until 800 and `Byzantine Empire` after: one state,
    // two names. The pattern deliberately requires "eastern", since "Holy Roman Empire" also ends in
    // "Roman Empire" and is a different power in a different colour.
    label: 'Byzantium, under either of its names',
    pattern: /byzan|eastern roman/i,
    color: { r: 122, g: 90, b: 158 }, // violet
  },
]

/**
 * The pinned colour for a polity, if any rule claims it.
 * @param name - the polity's name, or `null`
 * @returns the colour, or `null` when nothing matches and the automatic palette should decide
 */
export function pinnedRegionColor(name: string | null): RgbColor | null {
  if (!name) return null
  for (const rule of REGION_COLOR_RULES) if (rule.pattern.test(name)) return rule.color
  return null
}
