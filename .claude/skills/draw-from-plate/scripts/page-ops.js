/**
 * The page side of a drawing plan: plays an `ops.json` written by a plan script in the Cartographer, through the
 * pilot (`use-cartographer/scripts/pilot.js`, loaded first). Generalised from the Iberia 1200 run (2026-11-24) for the
 * Empire of 1200 (2026-11-27).
 *
 * Every anchor is found by its POSITION in the page's live document, never by an index read in a file. A planned point
 * the Pen placed elsewhere (a snap) is remembered, and the later operations use where it actually went.
 *
 * The operations — each a JSON array:
 *   ["delete", [[lon, lat], …]]                         anchors removed from every ring (one history step)
 *   ["chain", [lon, lat], [lon, lat], [[lon, lat], …]]  points inserted one after the other on the stretch a–b, which
 *                                                       every ring holding both shares (one step per point)
 *   ["create", {polity}]                                a new polity of the registry (rank, suzerain, colour, wikidata)
 *   ["ring", "polity-id", [[lon, lat], …], {options}]   an outline laid in one step (`placeRing`, CARTO-584): an anchor
 *                                                       within 1 m reused, no snap, then the Pen's closing — a vassal
 *                                                       is carved out of its suzerain
 *   ["replace", [lon, lat], [lon, lat], [[lon, lat], …], {options}]
 *                                                       the stretch between two anchors replaced (`replaceRun`)
 *   ["pen", "polity-id", [[lon, lat], …]]               the same outline with the Pen, a click per point (the old way)
 *   ["edit", "polity-id", {fields}]                     a polity's registry fields changed
 *
 * Loaded with: await import('http://127.0.0.1:<port>/page-ops.js') — `serve.py` serves it beside the plan's ops.json;
 * then `await ops.load()` and `await ops.run(from, to)`. `ops.run` stops at the first operation that fails, with why.
 */
const P = () => window.pilot
const S = () => P().reach().store.getState()
const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)))
const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-7 && Math.abs(p[1] - q[1]) < 1e-7
const sub = new Map() // planned "lon,lat" → actual [lon, lat]
const key = (p) => `${p[0]},${p[1]}`
const where = (p) => sub.get(key(p)) ?? p
const log = []

/** @returns {Set<number>} the anchors some ring holds */
function live() {
  const s = new Set()
  for (const c of S().document.claims) for (const r of c.rings) for (const i of r) s.add(i)
  return s
}

/**
 * @param {number[]} p0 - a planned position
 * @returns {number} the live anchor at that position (or where a snap put it), -1 when none
 */
function idx(p0) {
  const p = where(p0)
  const A = S().document.anchors
  const L = live()
  let best = -1
  for (let i = 0; i < A.length; i++) if (A[i] && near(A[i], p) && L.has(i)) best = i
  return best
}

/** @returns {number[][]} the rings of a polity, as anchor indices */
const rings = (polity) => S().document.claims.find((c) => c.polity === polity)?.rings ?? []

/**
 * Draw an outline with the Pen, a click per point, closed on the first.
 * @param {string} polity - the polity aimed
 * @param {number[][]} pts - the planned points
 * @returns {Promise<object>} what was drawn: points planned and got, the points the Pen moved (over 1 m)
 */
async function drawRing(polity, pts) {
  S().aimAt(polity)
  S().selectTool('draw')
  await frame()
  const before = new Set(rings(polity).map((r) => r.join(',')))
  const targets = pts.map(where)
  const odd = []
  for (const [k, p] of [...targets, targets[0]].entries()) {
    P().centre(p, 60)
    await frame()
    const r = await P().click(p)
    if (k > 0 && k < targets.length && /^(Suit|Following)/.test(r.hover)) odd.push([k, r.hover.slice(0, 60)])
  }
  await frame()
  const fresh = rings(polity).filter((r) => !before.has(r.join(',')))
  if (fresh.length !== 1) return { ok: false, why: `${fresh.length} new rings`, odd }
  const A = S().document.anchors
  const ring = fresh[0].map((i) => A[i])
  const moved = []
  for (const p of targets) {
    let bd = Infinity
    let bq = null
    for (const q of ring) {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (d < bd) {
        bd = d
        bq = q
      }
    }
    if (bd > 1e-5) {
      moved.push([p, bq, Math.round(bd * 111000)])
      sub.set(key(p), [bq[0], bq[1]])
    }
  }
  return { ok: true, planned: pts.length, got: ring.length, moved: moved.length, far: moved.filter((m) => m[2] > 300), odd }
}

/**
 * Play one operation.
 * @param {Array} o - the operation
 * @returns {Promise<object>} its answer, `ok: false` with why on a failure
 */
async function op(o) {
  const [kind] = o
  if (kind === 'delete') {
    const ids = o[1].map(idx)
    if (ids.some((i) => i < 0)) return { ok: false, why: 'missing', at: o[1].filter((_, k) => ids[k] < 0) }
    const r = S().deleteAnchors(ids, { kind: 'delete-anchor', label: `Delete ${ids.length} anchors` })
    return { ok: r !== null }
  }
  if (kind === 'chain') {
    let prev = idx(o[1])
    const end = idx(o[2])
    if (prev < 0 || end < 0) return { ok: false, why: 'chain ends', a: prev, b: end }
    for (const p of o[3]) {
      const n = S().insertAnchor(prev, end, [p[0], p[1]], { kind: 'insert-anchor', label: 'Insert an anchor' })
      if (n === null) return { ok: false, why: 'insert refused', at: p }
      prev = n
    }
    return { ok: true, n: o[3].length }
  }
  if (kind === 'create') return { ok: S().createPolity(o[1], { kind: 'create-polity', label: `Create ${o[1].name}` }) }
  if (kind === 'ring') {
    // CARTO-584: the whole outline in one step, an anchor within 1 m reused, no snap, then the Pen's own closing
    const r = S().placeRing(o[1], o[2], { kind: 'place-ring', label: `Place an outline of ${o[1]}` }, o[3] ?? {})
    return { ...r, ring: r.ring?.length }
  }
  if (kind === 'replace') {
    // CARTO-584: the stretch between two anchors replaced in every ring holding it, in one step
    const a = idx(o[1])
    const b = idx(o[2])
    if (a < 0 || b < 0) return { ok: false, why: 'replace ends', a, b }
    const r = S().replaceRun(a, b, o[3], { kind: 'replace-run', label: 'Replace a stretch' }, o[4] ?? {})
    return { ...r, ring: r.ring?.length }
  }
  if (kind === 'pen') return drawRing(o[1], o[2])
  if (kind === 'edit') {
    const cur = S().document.polities.find((p) => p.id === o[1])
    return { ok: S().editPolity({ ...cur, ...o[2] }, { kind: 'edit-polity', label: `Edit ${o[1]}` }) }
  }
  return { ok: false, why: 'unknown op' }
}

let OPS = null
let BASE = null

/**
 * Fetch the plan's operations from the server this file came from.
 * @returns {Promise<number>} how many
 */
async function load() {
  BASE = new URL('.', import.meta.url).href
  OPS = await (await fetch(`${BASE}ops.json`, { cache: 'no-store' })).json()
  return OPS.length
}

/**
 * Play the operations from..to, stopping at the first failure.
 * @param {number} from - the first
 * @param {number} to - one past the last
 * @returns {Promise<Array>} each operation's answer
 */
async function run(from, to) {
  if (OPS === null) await load()
  const out = []
  for (let k = from; k < Math.min(to, OPS.length); k++) {
    const t0 = performance.now()
    const r = await op(OPS[k])
    out.push([k, OPS[k][0], typeof OPS[k][1] === 'string' ? OPS[k][1] : '', r, Math.round(performance.now() - t0)])
    log.push(out[out.length - 1])
    if (!r || r.ok === false || r.refusal) break
  }
  return out
}

window.ops = { run, load, op, idx, sub, log, rings }
