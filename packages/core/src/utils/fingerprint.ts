/**
 * A text's fingerprint — what a file baked at the build is matched against the year the page shows (ATLAS-333, the
 * names; ATLAS-399, the overlaps). Moved from the atlas's `nameCache`, so the build and the page compute one key.
 */

/**
 * Two 32-bit FNV-1a hashes of a text, from two offsets, and its length: a 64-bit fingerprint, so two different years
 * share a key with a chance of the order of one in 10^19 — never a plausible wrong result in practice.
 * @param text - what to fingerprint
 * @returns the fingerprint
 */
export function fingerprint(text: string): string {
  let a = 0x811c9dc5
  let b = 0x01000193
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    a = Math.imul(a ^ code, 0x01000193)
    b = Math.imul(b ^ code, 0x811c9dc5)
  }
  return `${(a >>> 0).toString(36)}.${(b >>> 0).toString(36)}.${String(text.length)}`
}
