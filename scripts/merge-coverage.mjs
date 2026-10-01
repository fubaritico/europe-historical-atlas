#!/usr/bin/env node
/**
 * Merge the per-package lcov reports into one, rewriting every source path to be repo-relative.
 *
 * **Why this exists.** Since the test run was split per package, each package writes its own
 * `coverage/lcov.info`, and Vitest records source paths relative to *its* root — `SF:src/data/assetError.ts`.
 * Sonar resolves those paths against the project base directory, which is the repository root, so it would
 * look for `./src/data/assetError.ts`, find nothing, and report **0 % coverage with no error at all**. That
 * silent zero is the whole reason for this script: a wrong number that looks like a real one.
 *
 * Measured before writing it: the old single-run report carried `SF:packages/atlas/src/…` and the new
 * per-package ones carry `SF:src/…`. Setting Vitest's `coverage.root` does not change them.
 *
 * The alternative was listing the three reports in `sonar.javascript.lcov.reportPaths`, which Sonar accepts as
 * a comma-delimited list. It was declined because whether it resolves package-relative paths can only be
 * found out by pushing, and its failure mode is the same silent zero. This can be checked here.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(ROOT, 'packages')
const OUTPUT = join(ROOT, 'coverage', 'lcov.info')

/**
 * Rewrite one report's `SF:` lines so every path is relative to the repository root.
 * @param {string} report - the lcov file's contents
 * @param {string} packageDir - the package's directory, absolute
 * @returns {string} the same report with repo-relative source paths
 */
const toRepoRelative = (report, packageDir) => {
  const prefix = relative(ROOT, packageDir)
  return report.replace(/^SF:(.*)$/gm, (_line, path) => `SF:${join(prefix, path.trim())}`)
}

const merged = []
const skipped = []

for (const name of readdirSync(PACKAGES_DIR)) {
  const packageDir = join(PACKAGES_DIR, name)
  const report = join(packageDir, 'coverage', 'lcov.info')
  try {
    merged.push(toRepoRelative(readFileSync(report, 'utf8'), packageDir))
  } catch (error) {
    // Two different things can go wrong here and they deserve different answers, which is the whole argument
    // of this file applied to its own code: an absent file is the expected case — a package with no suite of
    // its own — while anything else (a permission, a truncated file from a crashed run) is a fault.
    //
    // Neither is fatal, deliberately. Making the second one throw would let a transient read error during a
    // concurrent CI write take down `pnpm coverage` entirely, which trades a wrong number for no number. So
    // the unexpected case is reported **loudly, with its cause**, and the run continues.
    const absent = error instanceof Error && 'code' in error && error.code === 'ENOENT'
    if (absent) {
      skipped.push(name)
    } else {
      console.error(
        `coverage: could not read ${relative(ROOT, report)} — ${error instanceof Error ? error.message : String(error)}`
      )
      skipped.push(`${name} (unreadable)`)
    }
  }
}

if (merged.length === 0) {
  throw new Error(
    `No lcov report found under packages/*/coverage/. Run \`pnpm coverage\` first — refusing to write an empty report, which Sonar would read as 0 % coverage.`
  )
}

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, merged.join(''))

console.warn(`coverage: merged ${String(merged.length)} report(s) into ${relative(ROOT, OUTPUT)}`)
if (skipped.length > 0) {
  console.warn(`coverage: no report for ${skipped.join(', ')} — check this is expected`)
}
