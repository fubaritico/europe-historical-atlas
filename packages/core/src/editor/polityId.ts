/**
 * Where a polity's id comes from — a readable proposal, which the author may rewrite.
 *
 * **The dev's call, 2026-10-08, and it closed a hole nobody had recorded.** `format.md` shows
 * `"fr-couronne"` and says the id is *"ours, readable, unique within this year. Never a display name"*;
 * `s02`'s form asks for eight fields and an id is not one of them; and `s07` requires that renaming a
 * polity **keep its id** (*"it is the same polity, with the same id"*). So nothing said who mints one.
 * Three answers were on the table — a proposal the author may edit, a frozen slug, an opaque counter —
 * and the first was chosen: `fr-couronne` is plainly hand-chosen rather than derived from
 * *"Reaume de France"*, so the proposal has to be editable or that example is unreachable.
 *
 * **Why the proposal is only a proposal.** Once the file is written the id is a key: `borders.json` names
 * a pair of them, a vassal tie names one, a colour override names one. `s07` is explicit that a rename
 * must not break any of those, which it cannot do if the id is re-derived from the name. So the name is
 * read **once**, at creation, and never again.
 *
 * **No character whitelist, deliberately.** `yearPolitySchema` asks only for a non-empty string, and
 * nothing downstream treats an id as a path or a URL, so a space or an underscore breaks nothing. Refusing
 * them would be the tool manufacturing a law where `s00` says every rule here is a **default** — the two
 * real constraints are shared anchors and the licence. What is refused is what genuinely breaks a file:
 * an empty id, and one already taken (`addPolity`).
 */

/**
 * Turn a name into a readable id fragment, or into nothing when it cannot.
 *
 * Latin accents fold (*Bohême* → `boheme`), runs of anything else become one hyphen, and the ends are
 * trimmed. **A name in a non-latin script yields the empty string**, and that is the honest outcome rather
 * than a failure: Byzantium and al-Andalus are real entries in this atlas, transliterating them would be
 * inventing a romanisation, and a proposal that cannot be made is better left blank for the author to
 * fill than filled with something that means nothing.
 * @param name - the polity's name as the author typed it
 * @returns the slug, or `''` when the name holds nothing sluggable
 */
export function slugifyPolityName(name: string): string {
  return (
    name
      .normalize('NFD')
      // U+0300–U+036F, the combining diacritical marks: this is the fold, and it is why `normalize`
      // runs first. Written as escapes rather than as the characters themselves, which are invisible
      // in a source file and survive neither a copy nor a review.
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

/**
 * Propose an id for a new polity, stepping past the ones already in the year.
 *
 * The suffix counts from 2, so the first of a name reads `reaume-de-france` and only a second becomes
 * `reaume-de-france-2` — a bare name is the common case and should not be made to look numbered.
 *
 * **It proposes nothing rather than something arbitrary** when the name yields no slug: an empty return
 * leaves the form's id field blank and required, so the author is asked instead of being handed
 * `polity-1`, which is the opaque counter this decision rejected.
 * @param name - the polity's name as the author typed it
 * @param taken - the ids already used in this year, in any iterable form
 * @returns a free id, or `''` when no slug can be made from the name
 */
export function proposePolityId(name: string, taken: Iterable<string>): string {
  const base = slugifyPolityName(name)
  if (base === '') return ''

  const used = new Set(taken)
  if (!used.has(base)) return base

  // Terminates: `used` is finite, so some suffix is free.
  let suffix = 2
  while (used.has(`${base}-${String(suffix)}`)) suffix += 1
  return `${base}-${String(suffix)}`
}
