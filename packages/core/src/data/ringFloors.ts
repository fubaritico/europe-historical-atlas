/**
 * The fewest anchors an outline holds (`files/plans/cartographer/open-outlines.md`) — apart from `yearFormat.ts`, which
 * loads Zod, so the editor's geometry reaches them without pulling a schema into the worker's chunk.
 */

/** The fewest indices of a closed ring — closure implied, so a triangle. */
export const CLOSED_RING_FLOOR = 3

/** The fewest indices of an open outline — a line. */
export const OPEN_RING_FLOOR = 2
