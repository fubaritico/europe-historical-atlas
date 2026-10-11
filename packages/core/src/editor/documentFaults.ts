import { paintOrder } from '../data/paintOrder'

import type { YearDocument } from './yearDocument'

/**
 * What is wrong with a document that no operation should have produced — said, never skipped.
 *
 * **Every consumer of a document has a branch for these**, and each one used to skip the bad entry in
 * silence: the scene drops an index past the anchor table, the fills drop a claim whose polity has no
 * colour. Skipping is right for painting — a frame is not the place to throw — and wrong as the only
 * answer, because nothing then tells anyone. The dev's rule, 2026-10-11: *"on ne peut pas se permettre de
 * laisser les choses sans message."* So the faults are listed here, once, and the caller reports them.
 * @param doc - the document to check
 * @returns one sentence per fault, empty when the document is sound
 */
export function documentFaults(doc: YearDocument): string[] {
  const faults: string[] = []
  const polities = new Set(doc.polities.map((polity) => polity.id))
  for (const claim of doc.claims) {
    if (!polities.has(claim.polity)) {
      faults.push(`a claim names "${claim.polity}", which the registry does not hold`)
    }
    for (const ring of claim.rings) {
      const outside = ring.filter((index) => index < 0 || index >= doc.anchors.length)
      if (outside.length > 0) {
        faults.push(
          `a ring of "${claim.polity}" points past the anchor table: ${outside.join(', ')}`
        )
      }
    }
  }
  // Painted last rather than lost (`paintOrder`), and said here once per version, not per frame.
  const looped = paintOrder(doc.polities).looped
  if (looped.length > 0) {
    faults.push(`homage forms a loop through ${looped.map((id) => `"${id}"`).join(', ')}`)
  }
  return faults
}
