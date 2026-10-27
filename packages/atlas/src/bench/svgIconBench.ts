/**
 * The flat icons' legibility bench (ATLAS-156): each kind's drawing at the sizes it has on the map, over the
 * parchment and the strong colours of 1100's countries — `/svg-icons.html` on the atlas's dev server, never built.
 * It shows the map's own drawings (`scene/events/icons/flat/eventIconSvg`); a candidate for a new icon is tried here before it moves
 * there — the battle's was chosen this way, « C2 », on 2026-10-26, and both silhouettes, « B », on 2026-10-27.
 */

import { eventIconSvg } from '../scene/events/icons/flat/eventIconSvg'

/** The sizes a flat icon has on screen, in CSS pixels — 20 is its floor zoomed out. */
const SIZES = [16, 20, 24, 32, 48, 96]

/** The grounds it stands on: the parchment, the relief's brown, and strong country colours of 1100. */
const GROUNDS: [string, string][] = [
  ['parchemin', '#efe6d2'],
  ['relief', '#a89474'],
  ['rouge', '#b32018'],
  ['orange', '#fda000'],
  ['bleu', '#2e5ff0'],
  ['rose', '#e95689'],
  ['vert', '#6f8a52'],
]

/** The kinds, with their names: the map's own drawings, as `eventIconSvg` makes them. */
const CANDIDATES: [string, string][] = [
  ['Bataille — épées croisées (validée le 27/10, « B »)', eventIconSvg('swords')],
  ['Siège, prise — tour (validée le 27/10, « B »)', eventIconSvg('tower')],
  ['Accession — couronne (provisoire)', eventIconSvg('crown')],
]

/**
 * One candidate's table: a row per ground, a column per size.
 * @param name - what it is
 * @param svg - its drawing
 * @returns the HTML
 */
function table(name: string, svg: string): string {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const head = `<tr><th></th>${SIZES.map((size) => `<th>${String(size)} px</th>`).join('')}</tr>`
  const rows = GROUNDS.map(
    ([label, colour]) =>
      `<tr><th>${label}</th>${SIZES.map(
        (size) =>
          `<td style="background:${colour}"><img src="${url}" width="${String(size)}" height="${String(size)}" alt=""></td>`
      ).join('')}</tr>`
  ).join('')
  return `<h2>${name}</h2><table>${head}${rows}</table>`
}

const bench = document.querySelector('#bench')
if (bench === null) throw new Error('[Atlas] svg icons bench: no #bench')
bench.innerHTML = CANDIDATES.map(([name, svg]) => table(name, svg)).join('')
