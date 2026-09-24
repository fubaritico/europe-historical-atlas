// Spike: generate procedural compass-rose variants as an HTML preview (no license, on-brand, scalable).
// Run: node files/spikes/compass-rose/gen.mjs  → writes preview.html next to this file, open in a browser.
// Base chosen: ornate portolan (32 winds). These variants add text labels (abbrev / wind names / degrees).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const INK = '#4a3424' // sepia ink (matches the coastline default)
const LIGHT = '#b7935a' // warm light half of the two-tone spikes
const PARCH = '#e4d4a8' // parchment swatch background

const C = 186 // svg centre (extra margin for outer labels)
const SIZE = 372

/** Polar → cartesian, angle in degrees from North (up), clockwise. */
function pt(r, aDeg, cx = C, cy = C) {
  const a = (aDeg * Math.PI) / 180
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
}
const f = (n) => n.toFixed(2)
const poly = (points, fill, stroke = INK, sw = 1) =>
  `<polygon points="${points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
const line = (r1, a1, r2, a2, stroke = INK, sw = 1) => {
  const [x1, y1] = pt(r1, a1)
  const [x2, y2] = pt(r2, a2)
  return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}"/>`
}
const circle = (r, sw = 1, stroke = INK, fill = 'none') =>
  `<circle cx="${C}" cy="${C}" r="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`

/** A two-tone compass spike (light left half, ink right half) from centre to tip at angle a. */
function spike(a, R, halfBaseDeg = 7, baseR = 15) {
  const tip = pt(R, a)
  return (
    poly([[C, C], pt(baseR, a - halfBaseDeg), tip], LIGHT, INK, 1) +
    poly([[C, C], pt(baseR, a + halfBaseDeg), tip], INK, INK, 1)
  )
}
/** A slim single-tone spike (secondary winds). */
function slimSpike(a, R, halfBaseDeg = 4, baseR = 8, fill = INK) {
  return poly([pt(baseR, a - halfBaseDeg), pt(R, a), pt(baseR, a + halfBaseDeg)], fill, INK, 0.8)
}
/** Stylised fleur-de-lis North marker centred on (cx, cy), scaled by s. */
function fleur(cx, cy, s) {
  const p = (x, y) => `${f(cx + x * s)},${f(cy + y * s)}`
  return (
    `<path d="M ${p(0, -18)} L ${p(3, -4)} L ${p(0, 2)} L ${p(-3, -4)} Z" fill="${INK}"/>` +
    `<path d="M ${p(0, 2)} C ${p(9, -2)} ${p(9, 8)} ${p(0, 6)} C ${p(-9, 8)} ${p(-9, -2)} ${p(0, 2)} Z" fill="${INK}"/>`
  )
}
/** An upright text label centred at polar (r, a). */
function label(text, r, aDeg, size, italic = false, weight = 'normal') {
  const [x, y] = pt(r, aDeg)
  return `<text x="${f(x)}" y="${f(y)}" font-family="Georgia, 'Times New Roman', serif" font-style="${italic ? 'italic' : 'normal'}" font-weight="${weight}" font-size="${size}" fill="${INK}" text-anchor="middle" dominant-baseline="central">${text}</text>`
}

/** The shared ornate 32-wind rose core (rings, ticks, spikes, fleur) — no labels. */
function roseCore(ringR = 150) {
  let s = ''
  s += circle(ringR, 1) + circle(ringR - 6, 0.6)
  for (let i = 0; i < 64; i++)
    s += line(ringR - 6, i * 5.625, i % 8 === 0 ? ringR - 16 : ringR - 10, i * 5.625, INK, i % 8 === 0 ? 1 : 0.5)
  s += circle(120, 0.6)
  for (let i = 0; i < 16; i++) if (i % 2 === 1 && i % 4 !== 2) s += line(0, i * 22.5, 118, i * 22.5, INK, 0.6)
  for (let i = 0; i < 8; i++) s += slimSpike(22.5 + i * 45, 82, 4, 7, LIGHT)
  for (let i = 0; i < 8; i++) s += spike(i * 45, i % 2 === 0 ? 118 : 104, i % 2 === 0 ? 7 : 6, 15)
  s += circle(15, 1, INK, PARCH) + circle(5, 1, INK, INK)
  s += fleur(C, C - 118, 1.1)
  return s
}

function svgWrap(inner) {
  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="300" height="300" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

// B — reference (no text)
const roseB = () => svgWrap(roseCore())

// D — French 8-wind abbreviations (N NE E SE S SO O NO), upright outside the ring
function roseD() {
  let s = roseCore(146)
  const fr = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  fr.forEach((t, i) => (s += label(t, 164, i * 45, i % 2 === 0 ? 15 : 11, false, i % 2 === 0 ? 'bold' : 'normal')))
  return svgWrap(s)
}

// E — traditional portolan wind names, italic
function roseE() {
  let s = roseCore(140)
  const names = ['Tramontana', 'Greco', 'Levante', 'Scirocco', 'Ostro', 'Libeccio', 'Ponente', 'Maestro']
  names.forEach((t, i) => (s += label(t, 162, i * 45, 10, true)))
  return svgWrap(s)
}

// F — degree ring numbers + cardinal initials (scientific / renaissance)
function roseF() {
  let s = roseCore(150)
  for (let d = 0; d < 360; d += 30) s += label(String(d), 165, d, 10)
  const card = [['N', 0], ['E', 90], ['S', 180], ['O', 270]]
  card.forEach(([t, a]) => (s += label(t, 96, a, 13, false, 'bold')))
  return svgWrap(s)
}

const variants = [
  ['B — référence (sans texte)', roseB()],
  ['D — abréviations FR (N · NE · … · NO)', roseD()],
  ['E — noms portulan (Tramontana…)', roseE()],
  ['F — degrés + initiales', roseF()],
]

const html = `<!doctype html><meta charset="utf-8"><title>compass rose variants</title>
<style>
  body { margin: 0; background: #cbb98a; font-family: Georgia, serif; color: #3a2a1a; }
  h1 { text-align: center; font-weight: normal; padding: 18px; margin: 0; font-size: 20px; }
  .row { display: flex; gap: 24px; justify-content: center; flex-wrap: wrap; padding: 12px 24px 40px; }
  .card { background: ${PARCH}; border: 1px solid #a98b5a; border-radius: 6px; padding: 14px; box-shadow: 0 2px 10px rgba(0,0,0,.15); }
  .card h2 { font-size: 14px; font-weight: normal; text-align: center; margin: 4px 0 10px; }
  .swatch { display:flex; gap:10px; justify-content:center; margin-top:6px; }
  .mini { width:110px; height:110px; }
</style>
<h1>Roses des vents — variante B + texte (sépia sur parchemin)</h1>
<div class="row">
  ${variants
    .map(
      ([name, svg]) => `<div class="card"><h2>${name}</h2>${svg}
      <div class="swatch"><div class="mini">${svg.replace('width="300" height="300"', 'width="110" height="110"')}</div>
      <div class="mini" style="opacity:.32">${svg.replace('width="300" height="300"', 'width="110" height="110"')}</div></div>
      <div style="text-align:center;font-size:12px;opacity:.7">plein · sur la carte (estompé)</div></div>`
    )
    .join('\n')}
</div>`

const out = join(dirname(fileURLToPath(import.meta.url)), 'preview.html')
writeFileSync(out, html)
console.warn('wrote', out)
