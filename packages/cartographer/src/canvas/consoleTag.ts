/**
 * How the Cartographer's canvas says what it declined or could not do — the dev's rule, 2026-10-11:
 * *"faut prévenir, faut tout couvrir."* Every refusal says so, in the console at least, with this tag.
 * Two levels, and the line between them is whether anything should have prevented it:
 *
 * - `console.warn` for a gesture of the author's the tool declines — a click off the backdrop, ‹enter›
 *   on two anchors. Ordinary, and worth a line because the screen may show nothing;
 * - `console.error` for what no gesture should reach — the document refusing what the tool already
 *   checked. A defect, said loudly, never swallowed.
 *
 * Its own module so every gesture module says it the same way (QUAL-006 / QUAL-007).
 */

/** The prefix of every line the canvas writes to the console. */
export const TAG = '[Cartographer]'
