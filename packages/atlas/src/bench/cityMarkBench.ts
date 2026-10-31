/**
 * The city marks' bench (ATLAS-295, `files/plans/atlas/cities.md`): one mark an order of importance — capital, large
 * city, city — with its name to the right (Imhof), over the parchment, the relief and the strong colours of 1100 —
 * `/cities.html` on the atlas's dev server, never built. It shows the map's own marks (`scene/cities/cityMarks`); a
 * candidate is tried here before it moves there — « C4 avec le blanc à 60 % » was chosen this way by the dev on
 * 2026-10-31, after the value alone (« C »), the size alone, rings around the point and a square for the capital.
 */

import { cityMarkSvg } from '../scene/cities/cityMarks'
import { NAME_FACE_URL } from '../scene/political/names/nameFace'

import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** The three orders, highest first, and the city each shows. */
const ORDERS: readonly { order: CityImportance; city: string; label: string }[] = [
  { order: 'capital', city: 'Paris', label: 'capitale' },
  { order: 'large-city', city: 'Cologne', label: 'grande ville' },
  { order: 'city', city: 'Metz', label: 'ville' },
]

/** The grounds, as on the flat icons' bench. */
const GROUNDS: [string, string][] = [
  ['parchemin', '#efe6d2'],
  ['relief', '#a89474'],
  ['rouge', '#b32018'],
  ['orange', '#fda000'],
  ['bleu', '#2e5ff0'],
  ['rose', '#e95689'],
  ['vert', '#6f8a52'],
]

/** The name's size and letters per order: larger first, read with the mark (Bertin). */
const NAME_STYLE: Readonly<Record<CityImportance, string>> = {
  capital: 'font-size:15px;letter-spacing:0.08em;text-transform:uppercase',
  'large-city': 'font-size:14px',
  city: 'font-size:12px',
}

/**
 * The three orders on one ground: each mark, with its name to the right as the map would set it.
 * @param scale - the marks' scale
 * @param withNames - whether the names are set beside the marks
 * @returns the HTML
 */
function legend(scale: number, withNames: boolean): string {
  return ORDERS.map(({ order, city }) => {
    const name = withNames ? `<span class="name" style="${NAME_STYLE[order]}">${city}</span>` : ''
    // The map's own document, inline so it stays crisp at its size: what the dev judges is what the layer loads.
    return `<div class="entry">${cityMarkSvg(order, scale)}${name}</div>`
  }).join('')
}

/**
 * The marks' table: a row per ground, the map's size with the names, then three times larger to see the shape.
 * @returns the HTML
 */
function table(): string {
  const head = `<tr><th></th><th>sur la carte</th><th>agrandi ×3</th></tr>`
  const rows = GROUNDS.map(
    ([label, colour]) =>
      `<tr><th>${label}</th><td style="background:${colour}">${legend(1, true)}</td><td style="background:${colour}">${legend(3, false)}</td></tr>`
  ).join('')
  return `<h2>Les marques des villes (choisies le 31/10, « C4 avec le blanc à 60 % »)</h2><table>${head}${rows}</table>`
}

const face = new FontFace('Fondamento', `url(${NAME_FACE_URL})`)
document.fonts.add(face)
const bench = document.querySelector('#bench')
if (bench === null) throw new Error('[Atlas] city marks bench: no #bench')
const caption = ORDERS.map(({ city, label }) => `${city} : ${label}`).join(' · ')
bench.innerHTML = `<p>${caption}</p>${table()}`
face.load().catch((error: unknown) => {
  console.error('[Atlas] city marks bench: the names’ face did not load', error)
})
