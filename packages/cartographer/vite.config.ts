import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * The Cartographer's Vite configuration.
 *
 * **`publicDir` points at the atlas's own `public/`, and that is a wiring decision rather than a
 * shortcut.** The editor needs the DEM (2.98 MB), the land mask (2.9 MB) and the rivers to bake the same
 * backdrop the atlas renders — and the backdrop has to be *the atlas's* texture, byte for byte, because
 * that is the only thing on this canvas georeferenced by construction. Serving the same directory is what
 * makes "the same" true by construction too: Vite serves it in dev and copies it into `dist` at build, so
 * nothing is duplicated and nothing can drift. The alternative measured on 2026-10-06 was copying ~6 MB
 * into this package — two committed copies of one asset, with no check that they agree.
 *
 * **What it widens, and the remedy that travels with it.** `packages/atlas/public/borders/` holds the 21
 * GPL-3.0 payloads. They are git-ignored, so they never reach a CI checkout and this cannot publish them —
 * the earlier claim that it would was wrong. What it does do is give a *second* `dist/` the same exposure
 * the atlas's has, while `build.yml`'s guard only watched the atlas's. That guard now walks every
 * package's `dist`, which is the one line this change owes.
 *
 * It also retires the favicon that was committed twice on 2026-10-05: there is one `public/` now, so there
 * is one favicon, and the drift this repository recorded as cosmetic cannot happen.
 */
export default defineConfig({
  plugins: [react()],
  publicDir: '../atlas/public',
})
