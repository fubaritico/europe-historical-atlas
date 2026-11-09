/**
 * The pilot — the agent's hand in the Cartographer's page. Loaded in the page by Vite (`await import('/@fs/<this
 * file>')`), it sets `window.pilot`.
 *
 * **What it touches, and what it never does.** The store is reached through React's tree, and only for what a gesture
 * already does: the view (`setViewport`, the hand and the wheel), the polity aimed (`aimAt`, a row clicked), the tool
 * (`selectTool`, the rail). **Every drawing is pointer events on the canvas** — hover, press, release — so the Pen
 * follows the coast, snaps and closes exactly as under the dev's mouse, and every gesture lands in the history.
 *
 * The rules learnt the hard way (journal, 2026-11-08): read the bar after every click; a closing click draws a
 * straight segment, so the last click before closing is the coast point next to the first; check « closed » in the
 * result; one island first, a capture, then a series that stops at the first miss.
 */

/**
 * @typedef {readonly [number, number]} LonLat
 */

const canvas = () => /** @type {HTMLCanvasElement} */ (document.querySelectorAll('canvas')[1])

/**
 * The Cartographer's store and the backdrop's frame, read from React's tree above the canvas.
 * @returns {{ store: any, frame: { size: { width: number, height: number }, bounds: { west: number, south: number,
 *   east: number, north: number } } }} the two
 */
function reach() {
  const node = canvas()
  const key = Object.keys(node).find((k) => k.startsWith('__reactFiber'))
  let fiber = key === undefined ? null : node[key]
  let store = null
  let frame = null
  for (let depth = 0; fiber && depth < 30 && (store === null || frame === null); depth++) {
    const props = fiber.memoizedProps ?? {}
    if (store === null && typeof props.store?.getState === 'function') store = props.store
    if (frame === null && props.frame?.size !== undefined) frame = props.frame
    fiber = fiber.return
  }
  if (store === null || frame === null) throw new Error('[pilot] the store or the frame is not above the canvas')
  return { store, frame }
}

const mercatorY = (/** @type {number} */ lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))

/**
 * A position in backdrop pixels (`lonLatToBackdrop`: x linear in longitude, y in Mercator).
 * @param {LonLat} p - the position
 * @returns {[number, number]} backdrop pixels
 */
function toBackdrop(p) {
  const { frame } = reach()
  const { west, east, north, south } = frame.bounds
  const u = (p[0] - west) / (east - west)
  const v = (mercatorY(north) - mercatorY(p[1])) / (mercatorY(north) - mercatorY(south))
  return [u * frame.size.width, v * frame.size.height]
}

/**
 * A position in the page's CSS pixels, through the current view (the viewport is in device pixels).
 * @param {LonLat} p - the position
 * @returns {[number, number]} client x and y
 */
function toClient(p) {
  const { store } = reach()
  const { scale, originX, originY } = store.getState().viewport
  const [bx, by] = toBackdrop(p)
  const ratio = window.devicePixelRatio
  const offset = [(bx * scale + originX) / ratio, (by * scale + originY) / ratio]
  const fit = offsetFit()
  return [(offset[0] - fit.bx) / fit.ax, (offset[1] - fit.by) / fit.ay]
}

/**
 * How the canvas turns a dispatched event's client position into the `offsetX`/`offsetY` it reads — measured, not
 * assumed. Chrome computes them for a constructed event as if the client position were in device pixels
 * (`offsetX = clientX / 2 − 38` on a 2× screen, measured 2026-11-08), so the pilot probes two points and inverts the
 * line it finds.
 * @returns {{ ax: number, bx: number, ay: number, by: number }} offset = a · client + b, per axis
 */
function offsetFit() {
  const node = canvas()
  const probe = (/** @type {number} */ x, /** @type {number} */ y) => {
    /** @type {number[]} */
    let seen = []
    node.addEventListener(
      'pointermove',
      (event) => {
        seen = [event.offsetX, event.offsetY]
        event.stopImmediatePropagation()
      },
      { once: true, capture: true }
    )
    node.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' }))
    return seen
  }
  const [a, b] = [probe(400, 300), probe(800, 700)]
  return { ax: (b[0] - a[0]) / 400, bx: a[0] - ((b[0] - a[0]) / 400) * 400, ay: (b[1] - a[1]) / 400, by: a[1] - ((b[1] - a[1]) / 400) * 300 }
}

/**
 * Centre the view on a position at a scale — what the hand and the wheel would reach, without the drift.
 * @param {LonLat} p - the position
 * @param {number} scale - device pixels per backdrop pixel
 * @returns {void}
 */
function centre(p, scale) {
  const { store } = reach()
  const [bx, by] = toBackdrop(p)
  const node = canvas()
  store.getState().setViewport({ scale, originX: node.width / 2 - bx * scale, originY: node.height / 2 - by * scale })
}

/**
 * The scale at which a box of positions fills a share of the canvas.
 * @param {readonly LonLat[]} points - the positions
 * @param {number} [fill] - the share of the canvas's smaller side
 * @param {number} [most] - the scale never exceeded
 * @returns {number} the scale
 */
function scaleFor(points, fill = 0.6, most = 400) {
  const xy = points.map(toBackdrop)
  const w = Math.max(...xy.map((p) => p[0])) - Math.min(...xy.map((p) => p[0]))
  const h = Math.max(...xy.map((p) => p[1])) - Math.min(...xy.map((p) => p[1]))
  const node = canvas()
  return Math.min(most, (Math.min(node.width, node.height) * fill) / Math.max(w, h, 1e-6))
}

const wait = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms))
const frameDone = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

/**
 * Send one pointer event to the canvas.
 * @param {string} type - `pointermove`, `pointerdown`, `pointerup`
 * @param {[number, number]} at - client x and y
 * @param {number} buttons - the buttons held
 * @returns {void}
 */
function send(type, at, buttons) {
  canvas().dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: at[0],
      clientY: at[1],
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: type === 'pointermove' ? -1 : 0,
      buttons,
    })
  )
}

/** The status bar and the result zone, as text. */
function bar() {
  return {
    status: document.querySelector('.shell__status')?.textContent ?? '',
    result: document.querySelector('.shell__result')?.textContent ?? '',
  }
}

/**
 * Hover a position, then click it — the way the skill asks: hover, let the Pen decide its role, read, click.
 * @param {LonLat} p - the position
 * @returns {Promise<{ hover: string, result: string }>} the bar before the click, and the result after
 */
async function click(p) {
  const at = toClient(p)
  send('pointermove', at, 0)
  await frameDone()
  const hover = bar().status
  send('pointerdown', at, 1)
  send('pointerup', at, 0)
  await frameDone()
  return { hover, result: bar().result }
}

/**
 * Draw an island for a polity: aim it, the Pen, three coast clicks round the loop, the point just before the first,
 * and close on the first. The loop is the coast the Pen follows (`islands.mjs --json`), so every click is on it.
 * @param {string} polity - the polity's id
 * @param {readonly LonLat[]} coast - the island's coast loop
 * @returns {Promise<{ steps: { hover: string, result: string }[] }>} what the bar said at every click
 */
async function island(polity, coast) {
  const { store } = reach()
  store.getState().aimAt(polity)
  // The Pen's name in the store (`EditorTool`: navigate · draw · edit · retrace).
  store.getState().selectTool('draw')
  const n = coast.length
  const picks = n <= 4 ? [0, 1, 2, 3] : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]
  const steps = []
  // Each click seen from close: the nearest two neighbouring coast points at least CLICK_GAP device pixels apart, so
  // the Pen takes the point aimed and never its neighbour (a 4-point islet at the fixed scale of 80 had its clicks
  // a few pixels apart, and the follow went round the wrong way — 2026-11-08).
  const xy = coast.map(toBackdrop)
  let closest = Infinity
  for (let k = 0; k < n; k++) {
    const [a, b] = [xy[k], xy[(k + 1) % n]]
    closest = Math.min(closest, Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const scale = Math.max(CLICK_SCALE, CLICK_GAP / Math.max(closest, 1e-3))
  for (const i of [...picks, 0]) {
    // The view moving between clicks leaves the run as it is.
    centre(coast[i], scale)
    await frameDone()
    steps.push(await click(coast[i]))
  }
  return { steps }
}

/** The view's scale for a click: the coast traced at 2 560 has a point every ~half backdrop pixel. */
const CLICK_SCALE = 80

/** The least distance, in device pixels, between two neighbouring coast points when the Pen clicks. */
const CLICK_GAP = 120

/**
 * Show a whole island, for a capture.
 * @param {readonly LonLat[]} coast - its coast loop
 * @returns {void}
 */
function show(coast) {
  centre(
    [
      (Math.min(...coast.map((p) => p[0])) + Math.max(...coast.map((p) => p[0]))) / 2,
      (Math.min(...coast.map((p) => p[1])) + Math.max(...coast.map((p) => p[1]))) / 2,
    ],
    scaleFor(coast)
  )
}

/**
 * The rings of a polity in the page's document.
 * @param {string} polity - its id
 * @returns {number[][]} its rings, as anchor indices
 */
function ringsOf(polity) {
  const doc = reach().store.getState().document
  return doc.claims.find((/** @type {{ polity: string }} */ c) => c.polity === polity)?.rings ?? []
}

/**
 * Whether a polity's newest ring is the island: one ring more than before, its points exactly the coast loop's.
 * @param {string} polity - its id
 * @param {readonly LonLat[]} coast - the island's coast loop
 * @param {number} before - how many rings it had before the gesture
 * @returns {string | null} what is wrong, or `null`
 */
function check(polity, coast, before) {
  const rings = ringsOf(polity)
  if (rings.length !== before + 1) return `${rings.length - before} rings added, not 1`
  const anchors = reach().store.getState().document.anchors
  const ring = rings[rings.length - 1]
  if (ring.length !== coast.length) return `${ring.length} points for a coast of ${coast.length}`
  // The page projects the coast through the backdrop's pixels, the measure straight from the mask: the same points
  // to a few metres, never to the last decimal — so a distance, not a key.
  const near = (/** @type {LonLat} */ p) => coast.some((q) => Math.abs(q[0] - p[0]) < 2e-5 && Math.abs(q[1] - p[1]) < 2e-5)
  const off = ring.filter((/** @type {number} */ i) => !near(anchors[i])).length
  return off === 0 ? null : `${off} points off the coast`
}

/**
 * Whether a point lies inside a closed ring, even-odd.
 * @param {LonLat} p - the point
 * @param {readonly LonLat[]} ring - the ring
 * @returns {boolean} inside
 */
function inside(p, ring) {
  let within = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) within = !within
  }
  return within
}

/**
 * Erase the old ring a polity draws on an island (Cliopatria's coarse one) before drawing its coast: ‹delete› on
 * the ring's points, one step, through the action the white arrow's ‹delete› calls. Refused when the island holds
 * not exactly one such ring, or when another polity shares its points — those go to the agent, not to a series.
 * @param {string} polity - the island's polity
 * @param {readonly LonLat[]} coast - the island's coast loop
 * @returns {string | null} what stopped it, or `null` once erased
 */
function erase(polity, coast) {
  const { store } = reach()
  const doc = store.getState().document
  const xs = coast.map((p) => p[0])
  const ys = coast.map((p) => p[1])
  // As the measure's `islandMargin`: a quarter of the island's extent, 5 km at least (Cyprus's ring lies far off).
  const m = Math.max(0.05, 0.25 * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)))
  const inBox = (/** @type {LonLat} */ p) =>
    p[0] >= Math.min(...xs) - m && p[0] <= Math.max(...xs) + m && p[1] >= Math.min(...ys) - m && p[1] <= Math.max(...ys) + m
  // In the island's box and centred on it: a neighbouring islet just drawn falls in the box too (Zante, 2026-11-08).
  const centred = (/** @type {number[]} */ r) => {
    const c = /** @type {LonLat} */ ([
      r.reduce((s, i) => s + doc.anchors[i][0], 0) / r.length,
      r.reduce((s, i) => s + doc.anchors[i][1], 0) / r.length,
    ])
    return inside(c, coast)
  }
  const rings = ringsOf(polity).filter(
    (/** @type {number[]} */ r) => r.every((i) => inBox(doc.anchors[i])) && centred(r)
  )
  if (rings.length !== 1) return `${rings.length} rings of ${polity} on the island, not 1`
  const ring = rings[0]
  const mine = new Set(ring)
  const shared = doc.claims.some((/** @type {{ polity: string, rings: number[][] }} */ c) =>
    c.rings.some((r) => r !== ring && r.some((i) => mine.has(i)))
  )
  if (shared) return 'its points are shared with another ring'
  const before = ringsOf(polity).length
  store.getState().deleteAnchors(ring, { kind: 'delete-anchor', label: `Delete ${ring.length} anchors` }, polity)
  return ringsOf(polity).length === before - 1 ? null : 'the ring did not go'
}

/**
 * Redo islands: erase the old ring, then draw the coast; stop at the first that does not go through.
 * @param {readonly { id: number, owner: string, points: LonLat[] }[]} islands - the `redo` ones of `islands.mjs`
 * @returns {Promise<{ drawn: number[], stopped: { id: number, why: string } | null }>} as {@link series}
 */
async function redo(islands) {
  /** @type {number[]} */
  const drawn = []
  for (const item of islands) {
    const why = erase(item.owner, item.points)
    if (why !== null) return { drawn, stopped: { id: item.id, why } }
    const done = await series([item])
    if (done.stopped !== null) return { drawn, stopped: { id: item.id, why: done.stopped.why } }
    drawn.push(item.id)
  }
  return { drawn, stopped: null }
}

/**
 * Take back the last points of an open run, one ‹Backspace› each.
 * @param {number} count - how many
 * @returns {Promise<void>} once done
 */
async function takeBack(count) {
  const node = canvas()
  node.focus()
  for (let k = 0; k < count; k++) {
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', bubbles: true, cancelable: true }))
    await frameDone()
  }
}

/**
 * Draw islands one after the other; stop at the first one that is not exactly its coast.
 * @param {readonly { id: number, owner: string, points: LonLat[] }[]} islands - from `islands.mjs --json`
 * @returns {Promise<{ drawn: number[], stopped: { id: number, why: string, steps: unknown } | null }>} the islands
 *   drawn, and the one that stopped the series
 */
async function series(islands) {
  /** @type {number[]} */
  const drawn = []
  for (const item of islands) {
    const before = ringsOf(item.owner).length
    const { steps } = await island(item.owner, item.points)
    await frameDone()
    const why = check(item.owner, item.points, before)
    if (why !== null) {
      // Nothing closed: the run is still open in the page — take its points back, the way ‹Backspace› does, so the
      // next gesture does not start from it. A ring added but wrong is left for the agent to look at and undo.
      if (ringsOf(item.owner).length === before) await takeBack(item.points.length + 2)
      return { drawn, stopped: { id: item.id, why, steps } }
    }
    drawn.push(item.id)
  }
  return { drawn, stopped: null }
}

/**
 * Hover a position and read the bar, the ‹alt› key held or not.
 * @param {LonLat} p - the position
 * @param {boolean} alt - ‹alt› held
 * @returns {Promise<string>} the status
 */
async function hoverRead(p, alt) {
  const exact = toClient(p)
  // With ‹alt›, a pixel aside: a move to the very same pixel may not recompute the preview (Hungary, 2026-11-08).
  const at = alt ? [exact[0] + 0.5, exact[1]] : exact
  canvas().dispatchEvent(
    new PointerEvent('pointermove', { bubbles: true, clientX: at[0], clientY: at[1], pointerId: 1, pointerType: 'mouse', altKey: alt })
  )
  // The bar is React's: it shows the move a frame or two later — read too soon, it still says the last one.
  await frameDone()
  await wait(60)
  await frameDone()
  return bar().status
}

/**
 * Retrace a coast run: aim the polity, ‹R›, its first anchor, the coast click by click, and its last anchor — clicked
 * only once the bar says it replaces exactly the run's own anchors (‹alt› for the other side when the default is not
 * it). The run's old anchors must then be out of the polity.
 * @param {{ polity: string, from: number, to: number, fromAt: LonLat, toAt: LonLat, interior: number, path: LonLat[] }}
 *   run - from `coasts.mjs --json`
 * @returns {Promise<string | null>} what went wrong, or `null`
 */
async function retrace(run) {
  const { store } = reach()
  store.getState().aimAt(run.polity)
  store.getState().selectTool('retrace')
  const path = run.path
  // Coast clicks close enough that each pair follows the coast the right way, never round a closed sea the long way.
  const step = Math.max(1, Math.min(150, Math.floor(path.length / 4)))
  const picks = []
  for (let i = 0; i < path.length - 1; i += step) picks.push(path[i])
  picks.push(path[path.length - 1])
  centre(run.fromAt, CLICK_SCALE)
  await frameDone()
  await click(run.fromAt)
  let laid = 0
  for (const p of picks) {
    centre(p, CLICK_SCALE)
    await frameDone()
    // A coast point on the polity's own border would move the start there (the retrace's rule, 5b8c0c0), not
    // follow the coast — skipped; the next one carries the run (Hungary at Rijeka, 2026-11-08).
    // Nor a coast point on one of its own anchors, where the click would end the retrace there ("replaces N
    // anchors") and leave the rest of the run in place (Sandomierz, 3 offered for 34, 2026-11-08).
    if (/moves the start|replaces \d+ anchor/.test(await hoverRead(p, false))) continue
    await click(p)
    laid += 1
  }
  centre(run.toAt, CLICK_SCALE)
  await frameDone()
  // The bar offers one side; ‹alt› takes the other. The bar does not show the flip to a dispatched ‹alt›, but the
  // click reads it (`known-issues/cartographer.md`, ‹alt›) — so the side is chosen from the count, and the document
  // checked after.
  const status = await hoverRead(run.toAt, false)
  const offered = Number(/replaces (\d+) anchors?/.exec(status)?.[1] ?? NaN)
  const ringLength = ringsOf(run.polity).find((r) => r.some((i) => samePlace(i, run.fromAt)))?.length ?? NaN
  // Within two of the plan: the junction point itself may be an anchor of the run or not (inserted, or already
  // there); what leaves is checked in the document after the click anyway.
  const near = (/** @type {number} */ n) => Math.abs(offered - n) <= 2
  const other = ringLength - run.interior - 2
  let alt
  if (near(run.interior) && (!near(other) || Math.abs(offered - run.interior) <= Math.abs(offered - other))) alt = false
  else if (near(other)) alt = true
  else {
    await takeBack(laid + 2)
    return `the bar offers ${offered} anchors, neither ${run.interior} nor the other side: ${status}`
  }
  const at = toClient(run.toAt)
  const options = { bubbles: true, clientX: at[0], clientY: at[1], pointerId: 1, pointerType: 'mouse', altKey: alt }
  canvas().dispatchEvent(new PointerEvent('pointerdown', { ...options, button: 0, buttons: 1 }))
  canvas().dispatchEvent(new PointerEvent('pointerup', { ...options, button: 0, buttons: 0 }))
  await frameDone()
  // The run's own anchors out of the polity, every other anchor of the ring still in it — else undone.
  // In the ring retraced only: an anchor of the run may also be one of another ring of the polity (an island).
  const held = new Set(ringsOf(run.polity).find((r) => r.some((i) => samePlace(i, run.fromAt))) ?? [])
  const stillThere = run.interiorAt.filter((p) => [...held].some((i) => samePlace(i, p))).length
  if (stillThere > 0) {
    reach().store.getState().undo()
    await frameDone()
    return `${stillThere} of the run's ${run.interior} anchors still in ${run.polity} — undone`
  }
  if ((ringsOf(run.polity).find((r) => r.some((i) => samePlace(i, run.fromAt)))?.length ?? 0) < ringLength - run.interior) {
    reach().store.getState().undo()
    await frameDone()
    return `the ring of ${run.polity} lost more than the run — undone`
  }
  return null
}

/**
 * Whether an anchor of the page's document sits at a position.
 * @param {number} index - the anchor
 * @param {LonLat} p - the position
 * @returns {boolean} at the same place, to a metre
 */
function samePlace(index, p) {
  const a = reach().store.getState().document.anchors[index]
  return a !== undefined && Math.abs(a[0] - p[0]) < 1e-5 && Math.abs(a[1] - p[1]) < 1e-5
}

/**
 * Retrace coast runs one after the other; a refused one is left as it was and listed.
 * @param {readonly Parameters<typeof retrace>[0][]} runs - from `coasts.mjs --json`
 * @returns {Promise<{ done: number, skipped: { run: unknown, why: string }[] }>} how many went through, and the
 *   ones left
 */
async function coastSeries(runs) {
  let done = 0
  /** @type {{ run: unknown, why: string }[]} */
  const skipped = []
  for (const run of runs) {
    // Every refusal leaves the map as it was (taken back or undone), so the series goes on and lists it.
    const why = await retrace(run)
    if (why !== null) skipped.push({ run: { polity: run.polity, from: run.from, to: run.to }, why })
    else done += 1
  }
  return { done, skipped }
}

/**
 * The anchor of the page's document at a position.
 * @param {LonLat} p - the position
 * @returns {number} its index, or -1
 */
function anchorAt(p) {
  const anchors = reach().store.getState().document.anchors
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i]
    if (Math.abs(a[0] - p[0]) < 1e-5 && Math.abs(a[1] - p[1]) < 1e-5) return i
  }
  return -1
}

/**
 * A ring's area on a local plane, in km².
 * @param {readonly number[]} ring - anchor indices
 * @returns {number} the area, unsigned
 */
function ringAreaKm(ring) {
  // Spherical, edge by edge: no reference latitude, so adding points along a coast cannot move the area of the rest
  // (a mean latitude did — the Holy Roman Empire's area "changed" by 54 515 km² for 5 520 planned, 2026-11-08).
  const anchors = reach().store.getState().document.anchors
  const radius = 6371.0088
  const rad = Math.PI / 180
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lon1, lat1] = anchors[ring[j]]
    const [lon2, lat2] = anchors[ring[i]]
    sum += (lon2 - lon1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad))
  }
  return Math.abs((sum * radius * radius) / 2)
}

/**
 * Retrace a coast the dev's way (`references/gestures.md`, the junction point): insert the junction point inland on
 * each land border when it is not an anchor yet, retrace from one to the other along the coast, and check — the run's
 * old anchors out, the area changed as planned. Anything else is undone, inserts included.
 * @param {{ polity: string, startAt: LonLat, startEdge: LonLat[] | null, endAt: LonLat, endEdge: LonLat[] | null,
 *   interior: number, interiorAt: LonLat[], path: LonLat[], expectedKm2: number }} plan - from `coasts.mjs --json`
 * @returns {Promise<string | null>} what went wrong, or `null`
 */
async function junction(plan) {
  const { store } = reach()
  let steps = 0
  const undoAll = async () => {
    for (let k = 0; k < steps; k++) {
      store.getState().undo()
      await frameDone()
    }
  }
  for (const [at, edge] of [
    [plan.startAt, plan.startEdge],
    [plan.endAt, plan.endEdge],
  ]) {
    // Already there: the neighbour retraced first and inserted it on their common border, which both rings hold.
    if (edge === null || anchorAt(at) >= 0) continue
    const a = anchorAt(edge[0])
    const b = anchorAt(edge[1])
    if (a < 0 || b < 0) {
      await undoAll()
      return 'the edge to insert the junction on is not in the page'
    }
    const index = store.getState().insertAnchor(a, b, [at[0], at[1]], { kind: 'insert-anchor', label: 'Insert an anchor' })
    if (index === null) {
      await undoAll()
      return 'the junction point could not be inserted'
    }
    steps += 1
  }
  const ring = () => ringsOf(plan.polity).find((r) => r.some((i) => samePlace(i, plan.startAt)))
  const before = ring()
  if (before === undefined) {
    await undoAll()
    return 'no ring of the polity holds the junction'
  }
  const areaBefore = ringAreaKm(before)
  const why = await retrace({
    polity: plan.polity,
    fromAt: plan.startAt,
    toAt: plan.endAt,
    interior: plan.interior,
    interiorAt: plan.interiorAt,
    path: plan.path,
  })
  if (why !== null) {
    await undoAll()
    return why
  }
  steps += 1
  const after = ring()
  const change = after === undefined ? Infinity : Math.abs(ringAreaKm(after) - areaBefore)
  if (change > 1.5 * plan.expectedKm2 + 300) {
    await undoAll()
    return `the area changed by ${change.toFixed(0)} km², ${plan.expectedKm2.toFixed(0)} planned — undone`
  }
  return null
}

/**
 * Retrace coasts the dev's way one after the other; a refused one is undone and listed.
 * @param {readonly Parameters<typeof junction>[0][]} plans - from `coasts.mjs --json`
 * @returns {Promise<{ done: number, skipped: { polity: string, at: LonLat, why: string }[] }>} the outcome
 */
async function junctions(plans) {
  let done = 0
  /** @type {{ polity: string, at: LonLat, why: string }[]} */
  const skipped = []
  for (const plan of plans) {
    const why = await junction(plan)
    if (why === null) done += 1
    else skipped.push({ polity: plan.polity, at: plan.startAt, why: why.slice(0, 160) })
  }
  return { done, skipped }
}

/**
 * Open a lake two polities share and close each shore — the dev's gesture (CARTO-397): erase the border's edges over the
 * water, which opens both outlines; then each polity, with the Pen, takes its open outline up by one end, follows its
 * own shore, and closes on the other end. Checked after: no outline left open. Anything else is undone, whole.
 * @param {{ lake: number, sides: { polity: string, ends: LonLat[], edges: LonLat[][], shore: LonLat[] }[] }} plan -
 *   from `lakes.mjs --crossed --json`
 * @returns {Promise<string | null>} what went wrong, or `null`
 */
async function crossLake(plan) {
  const { store } = reach()
  const before = store.getState().document.claims.length
  let steps = 0
  const undoAll = async () => {
    for (let k = 0; k < steps; k++) {
      store.getState().undo()
      await frameDone()
    }
  }
  const erased = new Set()
  for (const side of plan.sides) {
    for (const [p, q] of side.edges) {
      const a = anchorAt(p)
      const b = anchorAt(q)
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (a < 0 || b < 0 || erased.has(key)) continue
      erased.add(key)
      if (store.getState().eraseEdge(a, b, { kind: 'erase-edge', label: 'erase edge' }) !== null) steps += 1
    }
  }
  for (const side of plan.sides) {
    store.getState().aimAt(side.polity)
    store.getState().selectTool('draw')
    const n = side.shore.length
    const step = Math.max(1, Math.min(150, Math.floor(n / 4)))
    const picks = []
    for (let i = 0; i < n - 1; i += step) picks.push(side.shore[i])
    picks.push(side.shore[n - 1])
    for (const p of [side.ends[0], ...picks, side.ends[1]]) {
      centre(p, CLICK_SCALE)
      await frameDone()
      await click(p)
    }
    steps += 1
    const claim = store.getState().document.claims.find((c) => c.polity === side.polity)
    if (claim?.open !== undefined) {
      await takeBack(picks.length + 2)
      await undoAll()
      return `${side.polity} is still open after its shore`
    }
  }
  if (store.getState().document.claims.length !== before) {
    await undoAll()
    return 'the claims changed in number'
  }
  return null
}

/**
 * Cut a ring along the sea and close each piece on its own coast (`coasts.mjs --sea`): erase the edges crossing the
 * sea — no other polity draws them — then for each piece, with the Pen, take it up by its end, follow the coast, and
 * close it on its start. Checked after: none of the polity's outlines left open. Anything else is undone, whole.
 * @param {{ polity: string, edges: LonLat[][], closings: { endAt: LonLat, startAt: LonLat, path: LonLat[] }[] }} plan
 * @returns {Promise<string | null>} what went wrong, or `null`
 */
async function seaCut(plan) {
  const { store } = reach()
  const startRow = store.getState().rows.find((row) => row.current)?.index ?? null
  // Back to the history's row before the cut: ‹escape› first hands the outline in hand to the document (a step),
  // then the cursor goes back — never ‹backspace›, which would take back the resumed outline's own points.
  const undoAll = async () => {
    const node = canvas()
    node.focus()
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
    await frameDone()
    if (startRow !== null) store.getState().goTo(startRow)
    await frameDone()
  }
  for (const [p, q] of plan.edges) {
    const a = anchorAt(p)
    const b = anchorAt(q)
    if (a < 0 || b < 0) continue
    store.getState().eraseEdge(a, b, { kind: 'erase-edge', label: 'erase edge' })
  }
  store.getState().aimAt(plan.polity)
  for (const closing of plan.closings) {
    store.getState().selectTool('draw')
    const n = closing.path.length
    const step = Math.max(1, Math.min(150, Math.floor(n / 4)))
    const picks = []
    for (let i = 0; i < n - 1; i += step) picks.push(closing.path[i])
    picks.push(closing.path[n - 1])
    for (const p of [closing.endAt, ...picks, closing.startAt]) {
      centre(p, CLICK_SCALE)
      await frameDone()
      await click(p)
    }
  }
  const claim = store.getState().document.claims.find((c) => c.polity === plan.polity)
  if (claim?.open !== undefined) {
    await undoAll()
    return `${plan.polity} still has an open outline`
  }
  return null
}

window.pilot = {
  seaCut,
  crossLake,
  junction,
  junctions,
  retrace,
  coastSeries, reach, toClient, centre, scaleFor, click, bar, island, show, wait, ringsOf, check, series, erase, redo }
