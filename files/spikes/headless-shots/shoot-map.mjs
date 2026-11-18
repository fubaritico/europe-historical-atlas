// Photographs the atlas at given places in a headless Chrome, through the debugging protocol (port 9377): the camera
// is set through the page's own saved view (sessionStorage `europe-map:map-camera`), so the dev's screen is never touched.
// usage: node shoot-map.mjs <label> <baseUrl> <outDir> [zoom 0..1] [waitSeconds] [places, comma separated]
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [label, base, outDir, zoomArg = '0.97', waitArg = '25', only = ''] = process.argv.slice(2)
// A profile of its own, removed once the shots are taken: nothing is left on the disk.
const profile = mkdtempSync(join(tmpdir(), 'eha-headless-'))
const PORT = 9377
const PLACES = {
  poitiers: [0.335, 46.58],
  rome: [12.4828, 41.9],
  malagon: [-3.8547, 39.17],
  haifa: [34.999, 32.82],
  newforest: [-1.5667, 50.87],
  lyon: [4.84, 45.76],
}
const BBOX = { west: -45, south: 11.178401873711783, east: 78.75, north: 76.84081641443098 }
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const WIDTH = 12
const depth = (WIDTH * (merc(BBOX.north) - merc(BBOX.south))) / (((BBOX.east - BBOX.west) * Math.PI) / 180)
const world = ([lon, lat]) => [
  ((lon - BBOX.west) / (BBOX.east - BBOX.west) - 0.5) * WIDTH,
  0,
  ((merc(BBOX.north) - merc(lat)) / (merc(BBOX.north) - merc(BBOX.south)) - 0.5) * depth,
]

const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--window-size=1400,900',
    '--hide-scrollbars',
    '--no-first-run',
    'about:blank',
  ],
  { stdio: 'ignore' }
)
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

async function pageSocket() {
  for (let tries = 0; tries < 50; tries++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
      const page = pages.find((each) => each.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error('chrome did not start')
}

try {
  const socket = new WebSocket(await pageSocket())
  await new Promise((done) => socket.addEventListener('open', done))
  let id = 0
  const waiting = new Map()
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && waiting.has(message.id)) {
      waiting.get(message.id)(message.result)
      waiting.delete(message.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((done) => {
      id += 1
      waiting.set(id, done)
      socket.send(JSON.stringify({ id, method, params }))
    })
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1400,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  mkdirSync(outDir, { recursive: true })
  for (const [name, lonLat] of Object.entries(PLACES).filter(([name]) => only === '' || only.split(',').includes(name))) {
    const state = JSON.stringify({ target: world(lonLat), zoom: Number(zoomArg) })
    const script = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `sessionStorage.setItem('europe-map:map-camera', ${JSON.stringify(state)})`,
    })
    await send('Page.navigate', { url: base })
    await sleep(Number(waitArg) * 1000)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(outDir, `${label}-${name}.png`), Buffer.from(shot.data, 'base64'))
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier })
    console.warn(`${label} ${name} done`)
  }
  socket.close()
} finally {
  chrome.kill()
  // Chrome lets go of its files a moment after it is killed.
  await new Promise((done) => setTimeout(done, 500))
  rmSync(profile, { recursive: true, force: true })
}
