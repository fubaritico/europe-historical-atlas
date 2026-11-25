import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, openSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { DatabaseSync, backup } from 'node:sqlite'

import { TRIAL_PORTS, devBaseOf, firstFreePort, throwawayAccount, trialEnv } from './trialPlan'
import { CMS_ROOT, TRIAL, signalGroup } from './trialSystem'

import type { TrialState } from './trialPlan'

/**
 * `pnpm trial:start` (REPO-542): a CMS over a copy of the dev's base, with a throwaway account, on a free port —
 * detached, so it outlives the command. Wiring only: what it decides is `trialPlan.ts`, tested there.
 *
 * **Run from a tree, never the main checkout**: there `packages/cms/.env` holds the dev's keys, which Next and Payload
 * would read into the trial's server (review SEC-003, 2026-11-25) — refused.
 *
 * **Browsed on `127.0.0.1`, never `localhost`**: Payload's cookie belongs to the host whatever the port, so a sign-in to
 * a trial on `localhost` replaces the dev's own CMS session in his browser (2026-11-25, CARTO-535's trial did).
 *
 * **The copy holds his users' password hashes**: the folder is the user's alone (`0700`, the copy `0600`).
 *
 * **A start that fails leaves nothing behind** (my call, said to the dev on 2026-11-25): the server's group signalled if
 * it started (a group already gone is no failure), the trial's folder removed, the first error thrown on.
 */

/** How long the server may take to answer its first request — Next compiles the route on first use. */
const READY_WITHIN_MS = 180_000

/**
 * Whether nobody listens on a port of this machine.
 * @param port - the port
 * @returns `true` when it can be taken
 */
function isFree(port: number): Promise<boolean> {
  return new Promise((settle) => {
    const probe = createServer()
    probe.once('error', () => {
      settle(false)
    })
    probe.listen(port, '127.0.0.1', () => {
      probe.close(() => {
        settle(true)
      })
    })
  })
}

/**
 * Wait until the server answers who is signed in.
 * @param url - the CMS's address
 * @throws when it has not answered in time
 */
async function untilAnswers(url: string): Promise<void> {
  const deadline = Date.now() + READY_WITHIN_MS
  while (Date.now() < deadline) {
    const status = await fetch(`${url}/api/users/me`).then(
      (response) => response.status,
      () => 0
    )
    if (status === 200) return
    await new Promise((wait) => setTimeout(wait, 1000))
  }
  throw new Error(`the trial CMS did not answer within ${String(READY_WITHIN_MS / 1000)} s`)
}

if (existsSync(path.join(CMS_ROOT, '.env')))
  throw new Error(
    `refused: ${CMS_ROOT} has a .env — run the trial from a tree, not the main checkout`
  )
if (existsSync(TRIAL.folder))
  throw new Error(`a trial is already there (${TRIAL.folder}): pnpm trial:stop first`)
const source = devBaseOf(
  execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: CMS_ROOT,
    encoding: 'utf8',
  })
)
if (!existsSync(source)) throw new Error(`no base to copy at ${source}`)

mkdirSync(TRIAL.folder, { mode: 0o700 })
let serverPid: number | undefined
try {
  const devBase = new DatabaseSync(source, { readOnly: true })
  try {
    await backup(devBase, TRIAL.database)
  } finally {
    devBase.close()
  }
  chmodSync(TRIAL.database, 0o600)
  const account = throwawayAccount((bytes) => randomBytes(bytes).toString('hex'))
  // A secret of the trial's own: it signs the trial's sessions only (a password is hashed with its own salt)
  const env = trialEnv(process.env, TRIAL, randomBytes(32).toString('hex'))
  execFileSync('pnpm', ['migrate'], { cwd: CMS_ROOT, env, stdio: 'inherit' })
  execFileSync('pnpm', ['exec', 'payload', 'run', 'src/trial/account.ts'], {
    cwd: CMS_ROOT,
    env: { ...env, TRIAL_EMAIL: account.email, TRIAL_PASSWORD: account.password },
    stdio: 'inherit',
  })
  const port = await firstFreePort(TRIAL_PORTS, isFree)
  const log = openSync(TRIAL.log, 'a', 0o600)
  const server = spawn(
    'pnpm',
    ['exec', 'next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'],
    { cwd: CMS_ROOT, env, detached: true, stdio: ['ignore', log, log] }
  )
  server.unref()
  serverPid = server.pid
  if (serverPid === undefined) throw new Error('the trial CMS did not start')
  const state: TrialState = {
    pid: serverPid,
    port,
    email: account.email,
    startedAt: new Date().toISOString(),
  }
  writeFileSync(TRIAL.state, JSON.stringify(state, null, 2), { mode: 0o600 })
  await untilAnswers(`http://127.0.0.1:${String(port)}`)
  console.warn(
    [
      `[CMS] trial ready over a copy of ${source}`,
      `  admin    http://127.0.0.1:${String(port)}/admin  (CMS_URL=http://127.0.0.1:${String(port)})`,
      `  account  ${account.email}  ${account.password}  (throwaway, in the copy only)`,
      `  browse   127.0.0.1 only, never localhost — the session cookie is the host's whatever the port,`,
      `           and on localhost it would replace the dev's own CMS session in his browser`,
      `  end it   pnpm trial:stop`,
    ].join('\n')
  )
} catch (error: unknown) {
  try {
    if (serverPid !== undefined) signalGroup(serverPid, 'SIGTERM')
  } catch (stopping: unknown) {
    console.error(`[CMS] the trial server ${String(serverPid)} could not be stopped:`, stopping)
  }
  rmSync(TRIAL.folder, { recursive: true, force: true })
  throw error
}
