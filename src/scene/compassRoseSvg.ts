/** The portolan colour code of a compass rose (principal winds inked, half-winds + quarter-winds accented). */
export interface CompassRoseColors {
  /** Principal winds, rings, ticks, fleur-de-lis, labels (sepia ink). */
  ink: string
  /** Half-wind spikes (traditionally green — "vert anglais"). */
  halfWind: string
  /** Quarter-wind rays (traditionally red — "bordeaux"). */
  quarterWind: string
}

/** Options for the procedural compass-rose SVG. */
export interface CompassRoseSvgOptions {
  /** The portolan colour code. */
  colors: CompassRoseColors
  /** Draw the French 8-wind labels (N · NE · … · NO). */
  labels: boolean
}

// SVG canvas + the named polar radii that place each ring / spike / ray (all in viewBox units).
const SIZE = 372 // svg viewBox side
const C = SIZE / 2 // centre (derived so it can't drift from SIZE)
const RING_R = 150 // outer degree ring
const RING_R_LABELED = 146 // outer ring pulled in to make room for labels
const INNER_RING_R = 120 // thin ring the spikes sit inside
const QUARTER_RAY_R = 118 // length of the quarter-wind rays (red)
const HALF_WIND_R = 82 // tip radius of the half-wind spikes (green)
const PRINCIPAL_R = 118 // tip radius of cardinal principal spikes
const PRINCIPAL_R_INTER = 104 // tip radius of intercardinal principal spikes
const HUB_R = 15 // hub disc
const HUB_CORE_R = 5 // hub centre dot
const LABEL_R = 164 // radius of the wind labels
const FLEUR_R = 118 // radius the North fleur-de-lis sits at
const LIGHT = '#b7935a' // light half of the two-tone principal spikes
const HUB_FILL = '#e4d4a8' // parchment fill inside the hub

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

/** Return a colour only if it is a safe hex literal, else a black fallback — prevents SVG attribute
 * breakout from untrusted/future data-driven colour inputs (defence in depth). */
function safeColor(color: string): string {
  return HEX_COLOR.test(color) ? color : '#000000'
}

/** Polar → cartesian, angle in degrees from North (up), clockwise (svg y-down). */
function pt(r: number, aDeg: number): [number, number] {
  const a = (aDeg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)]
}
const f2 = (n: number): string => n.toFixed(2) // coordinate formatter
const numStr = (n: number): string => String(n) // number → attribute string (raw numbers can't be templated)
const poly = (points: [number, number][], fill: string, stroke: string, sw: number): string =>
  `<polygon points="${points.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${numStr(sw)}" stroke-linejoin="round"/>`
const lineSeg = (
  r1: number,
  a1: number,
  r2: number,
  a2: number,
  stroke: string,
  sw: number
): string => {
  const [x1, y1] = pt(r1, a1)
  const [x2, y2] = pt(r2, a2)
  return `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${stroke}" stroke-width="${numStr(sw)}"/>`
}
const ring = (r: number, sw: number, stroke: string, fill = 'none'): string =>
  `<circle cx="${numStr(C)}" cy="${numStr(C)}" r="${f2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${numStr(sw)}"/>`

/** A two-tone principal spike (light left half, ink right half) from centre to tip at angle a. */
function spike(a: number, R: number, ink: string, halfBaseDeg: number, baseR: number): string {
  const tip = pt(R, a)
  return (
    poly([[C, C], pt(baseR, a - halfBaseDeg), tip], LIGHT, ink, 1) +
    poly([[C, C], pt(baseR, a + halfBaseDeg), tip], ink, ink, 1)
  )
}
/** A slim single-tone spike (secondary winds). */
function slimSpike(a: number, R: number, fill: string, stroke: string): string {
  return poly([pt(8, a - 4), pt(R, a), pt(8, a + 4)], fill, stroke, 0.8)
}
/** Stylised fleur-de-lis North marker centred on (cx, cy), scaled by s. */
function fleur(cx: number, cy: number, s: number, ink: string): string {
  const p = (x: number, y: number): string => `${f2(cx + x * s)},${f2(cy + y * s)}`
  return (
    `<path d="M ${p(0, -18)} L ${p(3, -4)} L ${p(0, 2)} L ${p(-3, -4)} Z" fill="${ink}"/>` +
    `<path d="M ${p(0, 2)} C ${p(9, -2)} ${p(9, 8)} ${p(0, 6)} C ${p(-9, 8)} ${p(-9, -2)} ${p(0, 2)} Z" fill="${ink}"/>`
  )
}
/** An upright text label centred at polar (r, a). */
function label(
  text: string,
  r: number,
  aDeg: number,
  size: number,
  bold: boolean,
  ink: string
): string {
  const [x, y] = pt(r, aDeg)
  return `<text x="${f2(x)}" y="${f2(y)}" font-family="Georgia, 'Times New Roman', serif" font-weight="${bold ? 'bold' : 'normal'}" font-size="${numStr(size)}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${text}</text>`
}

/**
 * Build the procedural portolan compass rose (variant D — ornate 32-wind with French labels) as an SVG
 * string, colour-coded: principal winds inked, half-winds green, quarter-wind rays red. Colours are
 * validated to hex; the SVG carries explicit width/height (needed for `<img>`/texture rasterisation).
 * @param options - colours + labels
 * @returns the SVG markup
 */
export function buildCompassRoseSvg(options: CompassRoseSvgOptions): string {
  const ink = safeColor(options.colors.ink)
  const halfWind = safeColor(options.colors.halfWind)
  const quarterWind = safeColor(options.colors.quarterWind)
  const ringR = options.labels ? RING_R_LABELED : RING_R
  let s = ''
  s += ring(ringR, 1, ink) + ring(ringR - 6, 0.6, ink)
  // 64 ticks (every 360/64 = 5.625°), longer every 8th (major, every 45°).
  for (let i = 0; i < 64; i++)
    s += lineSeg(
      ringR - 6,
      i * 5.625,
      i % 8 === 0 ? ringR - 16 : ringR - 10,
      i * 5.625,
      ink,
      i % 8 === 0 ? 1 : 0.5
    )
  s += ring(INNER_RING_R, 0.6, ink)
  // 16 quarter-wind rays (red)
  for (let i = 0; i < 16; i++)
    if (i % 2 === 1 && i % 4 !== 2)
      s += lineSeg(0, i * 22.5, QUARTER_RAY_R, i * 22.5, quarterWind, 0.8)
  // 8 half-winds (green), offset 22.5° from the principals
  for (let i = 0; i < 8; i++) s += slimSpike(22.5 + i * 45, HALF_WIND_R, halfWind, halfWind)
  // 8 principal winds (two-tone ink): cardinals longer than intercardinals
  for (let i = 0; i < 8; i++)
    s += spike(i * 45, i % 2 === 0 ? PRINCIPAL_R : PRINCIPAL_R_INTER, ink, i % 2 === 0 ? 7 : 6, 15)
  s += ring(HUB_R, 1, ink, HUB_FILL) + ring(HUB_CORE_R, 1, ink, ink)
  s += fleur(C, C - FLEUR_R, 1.1, ink)
  if (options.labels) {
    const fr = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
    fr.forEach((t, i) => (s += label(t, LABEL_R, i * 45, i % 2 === 0 ? 15 : 11, i % 2 === 0, ink)))
  }
  // Explicit width/height (not just viewBox): an SVG loaded as an <img> for a texture needs intrinsic
  // dimensions, else it rasterises to 0×0 (blank texture).
  return `<svg width="${numStr(SIZE)}" height="${numStr(SIZE)}" viewBox="0 0 ${numStr(SIZE)} ${numStr(SIZE)}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`
}
