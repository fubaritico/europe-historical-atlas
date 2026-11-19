// Drives a headless Chrome over a page: runs the steps of a steps file, times each one to the second frame after it,
// and prints where the CPU time went for the steps that ask for a profile. Written for CARTO-485 (2026-11-19).
// usage: node measure-page.mjs <url> <steps.mjs> [shot.png]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const [url, stepsFile, shotOut] = process.argv.slice(2)
const { steps, waitSeconds = 20 } = await import(pathToFileURL(stepsFile).href)
const profile = mkdtempSync(join(tmpdir(), 'eha-headless-'))
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9378', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((done) => setTimeout(done, ms))
try {
  let ws
  for (let i = 0; i < 50 && !ws; i++) { try { ws = (await (await fetch('http://127.0.0.1:9378/json')).json()).find((p) => p.type === 'page')?.webSocketDebuggerUrl } catch {} await sleep(200) }
  const socket = new WebSocket(ws); await new Promise((d) => socket.addEventListener('open', d))
  let id = 0; const waiting = new Map(); const errors = []
  socket.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result ?? m.error); waiting.delete(m.id) } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text) })
  const send = (method, params = {}) => new Promise((d) => { id += 1; waiting.set(id, d); socket.send(JSON.stringify({ id, method, params })) })
  const run = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.exceptionDetails ? `THROWN ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}` : r.result?.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Profiler.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 2, mobile: false })
  await send('Page.navigate', { url }); await sleep(waitSeconds * 1000)
  for (const step of steps) {
    if (step.profile) await send('Profiler.start')
    // The step's expression acts, then waits two frames: the time includes React, the canvas repaint and the layout.
    const timed = `(async () => { const t0 = performance.now(); const out = await (${step.run})(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return { ms: Math.round(performance.now() - t0), out } })()`
    const result = await run(timed)
    console.warn(`STEP ${step.name}: ${JSON.stringify(result)}`)
    if (step.profile) {
      const { profile: cpu } = await send('Profiler.stop')
      const self = new Map(); const dt = cpu.timeDeltas; const byId = new Map(cpu.nodes.map((n) => [n.id, n]))
      cpu.samples.forEach((nodeId, i) => { const n = byId.get(nodeId); const key = `${n.callFrame.functionName || '(anonymous)'} ${n.callFrame.url.split('/').slice(-2).join('/').split('?')[0]}:${n.callFrame.lineNumber}`; self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0)) })
      const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, step.top ?? 14)
      for (const [key, us] of top) console.warn(`   ${(us / 1000).toFixed(0).padStart(6)} ms  ${key}`)
    }
    await sleep(step.rest ?? 500)
  }
  if (shotOut) { const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(shotOut, Buffer.from(shot.data, 'base64')) }
  socket.close()
  console.warn(errors.length ? `PAGE ERRORS\n${errors.join('\n')}` : 'no page error')
} finally { chrome.kill(); await sleep(500); rmSync(profile, { recursive: true, force: true }) }
