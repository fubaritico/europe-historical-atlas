// Night of 2026-10-14 — extensions to page-helpers.js. Inject AFTER page-helpers.js:
// (0,eval)(await (await fetch('/@fs/<this path>')).text())
// 1. A hidden tab gets no requestAnimationFrame and throttled timers: tick on a MessageChannel instead.
(() => {
  const ch = new MessageChannel();
  const q = [];
  ch.port1.onmessage = () => {
    const f = q.shift();
    f && f();
  };
  window.__tick = (f) => {
    q.push(f);
    ch.port2.postMessage(0);
  };
  const ids = new Map();
  let n = 1;
  window.requestAnimationFrame = (cb) => {
    const id = n++;
    ids.set(id, true);
    __tick(() => {
      if (ids.delete(id)) cb(performance.now());
    });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    ids.delete(id);
  };
})();
__d.frame = () => new Promise((r) => __tick(() => __tick(() => __tick(r))));
__d.sleep = (ms) => {
  const t = performance.now();
  return new Promise((r) => {
    const f = () => (performance.now() - t >= ms ? r() : __tick(f));
    f();
  });
};
__d.key = function (key, extra) {
  this.canvas().dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...(extra || {}),
    }),
  );
};
__d.newPolity = async function (name) {
  document.querySelector('button[aria-label="New polity"]').click();
  await this.sleep(400);
  const inp = document.querySelector("dialog[open] input");
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(
    inp,
    name,
  );
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  await this.sleep(200);
  [...document.querySelectorAll("dialog[open] button")]
    .find((b) => b.textContent.trim() === "OK")
    .click();
  await this.sleep(400);
  await this.calib();
};
__d.select = async function (name) {
  const el = [...document.querySelectorAll(".shell__dock [role=option]")].find(
    (e) => e.textContent.startsWith(name),
  );
  if (!el) return false;
  el.click();
  await this.sleep(300);
  return true;
};
__d.del = async function () {
  document.querySelector('button[aria-label="Delete polity"]').click();
  await this.sleep(400);
  [...document.querySelectorAll("dialog[open] button")]
    .find((b) => b.textContent.trim() === "Delete")
    .click();
  await this.sleep(400);
};
__d.save = async function () {
  this.key("s", { ctrlKey: true });
  await this.sleep(1500);
  return this.status().result;
};
__d.back = async function (n) {
  for (let i = 0; i < n; i++) {
    this.key("Backspace");
    await this.frame();
  }
};
__d.zoomAt = async function (lo, la, n) {
  const [x, y] = this.css(lo, la);
  const cv = this.canvas();
  for (let i = 0; i < Math.abs(n); i++) {
    cv.dispatchEvent(
      new WheelEvent("wheel", {
        clientX: x,
        clientY: y,
        deltaY: n > 0 ? -100 : 100,
        deltaMode: 0,
        bubbles: true,
        cancelable: true,
      }),
    );
    await this.frame();
  }
  await this.sleep(200);
  return await this.calib();
};
// A free point that the water would take is nudged up to ~5 km until the Pen says "Drawing in".
__d.freeStep = async function (p, log) {
  let h = await this.hoverAt(...p);
  let q = p;
  if (!/^Drawing in|^Branching|^Closing/.test(h)) {
    outer: for (const rad of [0.015, 0.025, 0.035, 0.05]) {
      for (let k = 0; k < 12; k++) {
        const a = (2 * Math.PI * k) / 12;
        const c = [
          p[0] + (rad * Math.cos(a)) / Math.cos((p[1] * Math.PI) / 180),
          p[1] + rad * Math.sin(a),
        ];
        const hh = await this.hoverAt(...c);
        if (/^Drawing in/.test(hh)) {
          q = c;
          h = hh;
          break outer;
        }
      }
    }
  }
  const r = await this.click(...q);
  log.push(
    q.map((v) => v.toFixed(4)).join(",") +
      (q === p ? "" : " (nudged)") +
      " | " +
      h.slice(0, 30) +
      " | " +
      r.result,
  );
  return r;
};
// Generic: kinds per step — a anchor/step, f free (nudged off water), c coast search.
__d.seq = async function (steps, kinds, log) {
  log = log || [];
  for (let i = 0; i < steps.length; i++) {
    const k = kinds[i];
    if (k === "f") await this.freeStep(steps[i], log);
    else if (k === "c") {
      const r = await this.coast(...steps[i]);
      log.push("coast " + steps[i] + " → " + (r.result ?? "FAIL " + r.action));
    } else await this.step(steps[i], log);
  }
  return log;
};
__d.draw = async function (name, steps, kinds) {
  if (name) await this.newPolity(name);
  const log = await this.seq(steps, kinds);
  this.key("Escape");
  log.push(await this.save());
  return log;
};
("ext ok");
// An island: coast clicks round it, closed on the anchor the first click really placed (coast() moves it).
__d.island = async function (pts, log) { log = log || []; const r0 = await this.coast(...pts[0]); if (r0.fail) { log.push('START FAIL ' + pts[0]); return log; } await this.seq(pts.slice(1), 'c'.repeat(pts.length - 1), log); const h = await this.hoverAt(...r0.at); const r = await this.click(...r0.at); log.push('close: ' + h.slice(0, 30) + ' | ' + r.result); return log; };
'ext ok';
// Zoom in at a place until the scale reaches C css px per degree (≈180 is where the Pen acts at ~4 km).
__d.zoomTo = async function (lo, la, C) { await this.calib(); for (let i = 0; i < 40 && this.C < C; i++) { await this.show(lo, la); await this.zoomAt(lo, la, 2); } await this.show(lo, la); return this.C; };
// The nearest point within 0.5° where the Pen offers the coastline — plates are a few km off the DEM's coast.
__d.coastFar = async function (lo, la) { await this.show(lo, la); for (const rad of [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5]) { const n = rad ? 24 : 1; for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n, p = [lo + rad * Math.cos(a) / Math.cos(la * Math.PI / 180), la + rad * Math.sin(a)]; if (!this.visible(...p)) continue; await this.move(...this.css(...p)); await this.frame(); if (/^Following the coastline/.test(this.status().action)) return p; } } return null; };
'ext ok';
// Close an outline: search around the first anchor's intended position until the Pen says "Closing".
__d.closeNear = async function (p) { for (const rad of [0, 0.005, 0.01, 0.02, 0.03, 0.05]) { const n = rad ? 16 : 1; for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n, q = [p[0] + rad * Math.cos(a) / Math.cos(p[1] * Math.PI / 180), p[1] + rad * Math.sin(a)]; const h = await this.hoverAt(...q); if (/^Closing/.test(h)) { await this.click(...q); return 'closed'; } } } return 'NOT CLOSED'; };
__d.island = async function (pts, log) { log = log || []; const r0 = await this.coast(...pts[0]); if (r0.fail) { log.push('START FAIL ' + pts[0]); return log; } await this.seq(pts.slice(1), 'c'.repeat(pts.length - 1), log); log.push('close: ' + await this.closeNear(r0.at)); return log; };
// One closed ring: kinds a (anchor/step), f (free, nudged off water), c (coast); closed with closeNear, saved.
__d.ring = async function (name, steps, kinds) { if (name) await this.newPolity(name); const log = []; let first = null; for (let i = 0; i < steps.length; i++) { const k = kinds[i]; if (k === 'c') { const r = await this.coast(...steps[i]); if (i === 0) first = r.at; log.push('coast ' + steps[i] + ' → ' + (r.result ?? ('FAIL ' + r.action))); } else if (k === 'f') await this.freeStep(steps[i], log); else await this.step(steps[i], log); if (i === 0 && k !== 'c') first = steps[i]; } log.push('close: ' + await this.closeNear(first)); this.key('Escape'); log.push(await this.save()); return log; };
'ext ok';
// Steps from groups — the kinds string is built from the lists, so its length is right by construction.
__d.parts = function (...groups) { const st = [], k = []; for (const [kind, pts] of groups) { for (const p of pts) { st.push(p); k.push(kind); } } return [st, k.join('')]; };
__d.km = (a, b) => { const c = Math.cos((a[1] + b[1]) * Math.PI / 360); return Math.hypot((a[0] - b[0]) * 111.2 * c, (a[1] - b[1]) * 111.2); };
// Adaptive coast: a click that inserts nothing over more than 15 km is taken back and the stretch bisected.
__d.coastTo = async function (prev, target, log, depth) { depth = depth || 0; const p = await this.coastFar(...target); if (!p) { log.push('NO COAST near ' + target); return prev; } const r = await this.click(...p); const ok = /inserted/.test(r.result); if (!ok && prev && this.km(prev, p) > 15 && depth < 5) { await this.back(1); const mid = [(prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2]; log.push('bisect ' + mid.map((v) => v.toFixed(2))); const m = await this.coastTo(prev, mid, log, depth + 1); return await this.coastTo(m, target, log, depth + 1); } log.push('coast ' + target.map((v) => v.toFixed(2)) + ' → ' + (r.result || '(none)')); return p; };
__d.coastRun = async function (pts, log, prev) { for (const t of pts) prev = await this.coastTo(prev, t, log); return prev; };
// The nearest point where the hover matches re (e.g. /Danube/), within maxr degrees.
__d.waterNear = async function (lo, la, re, maxr) { maxr = maxr || 0.2; for (const rad of [0, 0.01, 0.02, 0.04, 0.06, 0.09, 0.13, 0.2, 0.3].filter((r) => r <= maxr)) { const n = rad ? 16 : 1; for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n, p = [lo + rad * Math.cos(a) / Math.cos(la * Math.PI / 180), la + rad * Math.sin(a)]; const h = await this.hoverAt(...p); if (re.test(h)) return p; } } return null; };
__d.river = async function (p, name, log) { const q = await this.waterNear(p[0], p[1], new RegExp('Following the ' + name), 0.2); if (!q) { log.push('NO ' + name + ' near ' + p); return; } const r = await this.click(...q); log.push(name + ' ' + q.map((v) => v.toFixed(3)) + ' → ' + r.result); };
__d.islandAt = async function (lo, la, r, log) { const c = Math.cos(la * Math.PI / 180); return await this.island([[lo, la + r], [lo + r / c, la], [lo, la - r], [lo - r / c, la]], log); };
'ext ok';
// Play a plan from plan.py written to files/resources/euratlas/ops/<file> (shared runs end to end: E=0).
__d.auto = async function (name, file, E) { const r = await (await fetch('/@fs/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/files/resources/euratlas/ops/' + file + '?t=' + Date.now())).json(); const ops = r.ops; await this.show(...ops[0][1]); if (name) await this.newPolity(name); const body = ops.slice(0, -1); const log = await this.exec(body, E ?? 0); log.push('close: ' + await this.closeNear(ops[ops.length - 1][1])); this.key('Escape'); log.push(await this.save()); return log; };
// Same, with every run of coast ops played by the adaptive coastRun.
__d.autoC = async function (name, file) { const r = await (await fetch('/@fs/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/files/resources/euratlas/ops/' + file + '?t=' + Date.now())).json(); const ops = r.ops; await this.show(...ops[0][1]); if (name) await this.newPolity(name); const body = ops.slice(0, -1); const log = []; let i = 0; while (i < body.length) { if (body[i][0] === 'coast') { const run = []; while (i < body.length && body[i][0] === 'coast') { run.push(body[i][1]); i++; } await this.coastRun(run, log, null); } else { log.push(...await this.exec([body[i]], 0)); i++; } } log.push('close: ' + await this.closeNear(ops[ops.length - 1][1])); this.key('Escape'); log.push(await this.save()); return log; };
'ext ok';
