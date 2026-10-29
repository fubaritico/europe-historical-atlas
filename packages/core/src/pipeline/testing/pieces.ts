/**
 * An owner's pieces as the names' tests build their spaces: its realms with no strait spanned and no far piece left out
 * (`nameRealm`), which are exactly its pieces — the one way production crops a space, so a test exercises the spaces
 * the names are really placed in.
 */

import { ownerRealms } from '../nameRealm'

import type { NameSpace } from '../nameSpace'

/**
 * Every piece of every owner of a grid, cropped as a space.
 * @param owners - row-major, the owner of each cell, any negative value for none
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @param ring - the ring of outside cells kept around each piece, a whole cell at least
 * @returns each owner's pieces, by owner, the largest first
 */
export function piecesOf(
  owners: ArrayLike<number>,
  width: number,
  height: number,
  ring = 1
): Map<number, NameSpace[]> {
  return ownerRealms(owners, width, height, { strait: 0, farShare: 0, farCells: 0, ring })
}
