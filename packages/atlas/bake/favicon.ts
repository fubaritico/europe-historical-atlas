/**
 * The atlas's and the Cartographer's tab icon, `public/favicon.svg`, written from core's mark (REPO-415, the dev,
 * 2026-11-10: _"all the applications use the same icon … as the CMS"_) — the Cartographer serves the atlas's public
 * folder, so one file serves both. Committed, and held to core's drawing by `favicon.test.ts`; written again by
 * `pnpm --filter @europe-historical-atlas/atlas favicon` when the mark changes.
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { TAB_MARK_SIDE, brandMarkSvg } from '@europe-historical-atlas/core/utils/brandMark'

/** Where the icon lives, in the atlas's public folder. */
export const FAVICON_PATH = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))

/**
 * The icon's file, as it must read.
 * @returns the SVG document, with its final newline
 */
export function faviconSvg(): string {
  return `${brandMarkSvg(TAB_MARK_SIDE)}\n`
}

/** Run as a script: write the file. */
if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(FAVICON_PATH, faviconSvg())
