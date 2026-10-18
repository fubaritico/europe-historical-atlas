/**
 * The fingerprint of a year's three files, as text — what tells a save that the year on disk is still the one
 * the page opened (CARTO-238, rung 3).
 *
 * **Computed on both sides of the wire, so it lives here**: the Cartographer hashes the texts it read at the
 * opening, the dev server hashes the files on disk as it is about to write, and the two must agree byte for
 * byte. `core` is the one place both may import (`persistence/` and `devServer/` are forbidden each other).
 *
 * **FNV-1a, 32 bits, over UTF-16 code units** — the same JavaScript string on both sides, so no encoding
 * step can differ. **Except one, handled here**: a leading byte-order mark is dropped by the page's
 * `response.text()` and kept by Node's `readFileSync(…, 'utf8')`, so it is dropped before hashing — a year
 * file saved with one by some editor would otherwise ask for an overwrite at every save.
 *
 * It detects a change; it does not resist an adversary, and nothing here needs it to: the worst a collision
 * does is let a save through that a dialogue would have questioned.
 */

/** The three files of a year, as the texts on disk — `null` for a file that is not there. */
export interface YearTexts {
  /** `registry.json`. */
  registry: string | null
  /** `polities.json`. */
  polities: string | null
  /** `borders.json`. */
  borders: string | null
}

/**
 * The fingerprint of a year with no file on disk — what a page that never read its year expects to find, so a
 * year written meanwhile by something else is not saved over without a question (ARCH-002).
 */
export const ABSENT_YEAR = {
  registry: null,
  polities: null,
  borders: null,
} as const satisfies YearTexts

/** FNV-1a's 32-bit offset basis. */
const FNV_OFFSET = 0x811c9dc5

/** FNV-1a's 32-bit prime. */
const FNV_PRIME = 0x01000193

/**
 * Fold a text into a running FNV-1a hash.
 * @param hash - the hash so far
 * @param text - the text to fold in
 * @returns the hash after it
 */
function fold(hash: number, text: string): number {
  let next = hash
  for (let i = 0; i < text.length; i++) {
    next ^= text.charCodeAt(i)
    next = Math.imul(next, FNV_PRIME) >>> 0
  }
  return next
}

/**
 * The fingerprint of a year's files: the three texts in a fixed order, each closed by a separator a JSON
 * text cannot hold raw, and a missing file marked apart from an empty one.
 * @param texts - the three files
 * @returns eight hexadecimal digits
 */
export function yearStamp(texts: YearTexts): string {
  let hash = FNV_OFFSET
  for (const text of [texts.registry, texts.polities, texts.borders]) {
    hash = fold(hash, text === null ? '\u0001' : `${text.replace(/^\uFEFF/, '')}\u0000`)
  }
  return hash.toString(16).padStart(8, '0')
}
