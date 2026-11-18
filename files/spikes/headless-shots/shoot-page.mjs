// Photographs one page — a bench of the atlas, or a local HTML file — in a headless Chrome, and says the page's errors.
// usage: node shoot-page.mjs <url> <out.png> [width] [height] [waitSeconds]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [url, out, width = '1400', height = '900', wait = '6'] = process.argv.slice(2)
// A profile of its own, removed once the shots are taken: nothing is left on the disk.
const profile = mkdtempSync(join(tmpdir(), 'eha-headless-'))
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9377', `--user-data-dir=${profile}`, '--allow-file-access-from-files', '--no-first-run', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  let ws
  for (let i = 0; i < 50 && !ws; i++) { try { ws = (await (await fetch('http://127.0.0.1:9377/json')).json()).find((p) => p.type === 'page')?.webSocketDebuggerUrl } catch {} await sleep(200) }
  const socket = new WebSocket(ws); await new Promise((d) => socket.addEventListener('open', d))
  let id = 0; const waiting = new Map(); const errors = []
  socket.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result); waiting.delete(m.id) } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text) })
  const send = (method, params = {}) => new Promise((d) => { id += 1; waiting.set(id, d); socket.send(JSON.stringify({ id, method, params })) })
  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url }); await sleep(Number(wait) * 1000)
  const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(out, Buffer.from(shot.data, 'base64')); socket.close()
  console.warn(errors.length ? errors.join('\n') : 'no page error')
} finally { chrome.kill()
  // Chrome lets go of its files a moment after it is killed.
  await new Promise((done) => setTimeout(done, 500))
  rmSync(profile, { recursive: true, force: true }) }
