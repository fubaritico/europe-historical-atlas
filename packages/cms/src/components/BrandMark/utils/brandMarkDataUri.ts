import { brandMarkSvg } from '@europe-historical-atlas/core/utils/brandMark'

/**
 * The atlas's mark as a `data:` address, for an `<img>` or a favicon — no file to serve. The drawing is core's
 * (`utils/brandMark`), the one the atlas and the Cartographer show in their tab too (REPO-415).
 * @param side - the tile's side, in CSS pixels
 * @returns the address
 */
export function brandMarkDataUri(side: number): string {
  return `data:image/svg+xml,${encodeURIComponent(brandMarkSvg(side))}`
}
