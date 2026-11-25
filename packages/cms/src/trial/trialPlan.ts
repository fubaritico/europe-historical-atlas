import path from 'node:path'

/**
 * The trial on a copy of the base (REPO-542) — what a coder session needs to try a ticket in a browser without the
 * dev: a copy of his base, a throwaway account in the copy, a CMS on a free port over it. This module is the pure part:
 * where a trial lives, the guard that keeps every write in the copy, the port, the account, and the state it leaves for
 * `trial:stop`, and how a stop goes. The machine's side is `trialSystem.ts`; the wiring, `start.ts`, `account.ts` and
 * `stop.ts`.
 *
 * **Never a credential read**: the account is made for each trial, with a password drawn at random, and dies with the
 * copy — the dev's test account and its file are never opened (2026-11-25, CARTO-535: the permission check refused it,
 * rightly).
 */

/** The folder a trial lives in, inside the package of the tree that runs it — ignored by git, removed by `trial:stop`. */
export const TRIAL_FOLDER = '.trial'

/** The ports a trial CMS may take: beside the dev's own (3100), never on it. */
export const TRIAL_PORTS: readonly number[] = Array.from({ length: 90 }, (_, at) => 3110 + at)

/** Where each piece of a trial lives. */
export interface TrialPaths {
  /** The trial's folder. */
  folder: string
  /** The copy of the base. */
  database: string
  /** What `trial:stop` reads: the server's process, its port, the account. */
  state: string
  /** The server's output. */
  log: string
}

/** What a running trial is, written by `trial:start` and read by `trial:stop`. */
export interface TrialState {
  /** The server's process — the leader of its group, so its children stop with it. */
  pid: number
  /** The port it listens on. */
  port: number
  /** The throwaway account's address. */
  email: string
  /** When it started, ISO. */
  startedAt: string
}

/**
 * Where a trial lives, for the package of a tree.
 * @param cmsRoot - the absolute path of `packages/cms` in the tree that runs the trial
 * @returns its paths
 */
export function trialPaths(cmsRoot: string): TrialPaths {
  const folder = path.join(cmsRoot, TRIAL_FOLDER)
  return {
    folder,
    database: path.join(folder, 'cms.db'),
    state: path.join(folder, 'state.json'),
    log: path.join(folder, 'cms.log'),
  }
}

/**
 * The dev's base, in the main checkout — whichever tree runs the trial, the copy is of the base he works on.
 * @param gitCommonDir - `git rev-parse --path-format=absolute --git-common-dir`, the main checkout's `.git`
 * @returns the base's absolute path
 */
export function devBaseOf(gitCommonDir: string): string {
  return path.join(path.dirname(gitCommonDir.trim()), 'packages', 'cms', 'cms.db')
}

/**
 * Whether a `DATABASE_URL` names a base inside the trial's folder — the guard every write of a trial passes.
 * @param databaseUrl - the URL, `file:<path>`
 * @param folder - the trial's folder
 * @returns `true` only for a file under the folder
 */
export function isTrialDatabase(databaseUrl: string | undefined, folder: string): boolean {
  if (databaseUrl?.startsWith('file:') !== true) return false
  const file = path.resolve(databaseUrl.slice('file:'.length))
  return file.startsWith(path.resolve(folder) + path.sep)
}

/**
 * The first port of a list nobody listens on.
 * @param ports - the candidates, in order
 * @param isFree - whether a port is free
 * @returns the port
 * @throws when every candidate is taken
 */
export async function firstFreePort(
  ports: readonly number[],
  isFree: (port: number) => Promise<boolean>
): Promise<number> {
  for (const port of ports) if (await isFree(port)) return port
  throw new Error(`no free port for the trial CMS among ${String(ports.length)} candidates`)
}

/**
 * A throwaway account: an address no one owns (`.test`, reserved by RFC 2606) and a random password.
 * @param randomHex - random bytes as hexadecimal
 * @returns the account
 */
export function throwawayAccount(randomHex: (bytes: number) => string): {
  email: string
  password: string
} {
  return { email: `trial-${randomHex(4)}@example.test`, password: randomHex(16) }
}

/**
 * Read the state a trial left.
 * @param text - the content of `state.json`
 * @returns the state
 * @throws when it is not one — never guessed: a wrong process would be stopped
 */
export function readTrialState(text: string): TrialState {
  const value = JSON.parse(text) as Partial<Record<keyof TrialState, unknown>> | null
  if (
    value === null ||
    typeof value.pid !== 'number' ||
    !Number.isInteger(value.pid) ||
    value.pid <= 1 ||
    typeof value.port !== 'number' ||
    !TRIAL_PORTS.includes(value.port) ||
    typeof value.email !== 'string' ||
    typeof value.startedAt !== 'string'
  )
    throw new Error(`the trial's state is not readable: ${text}`)
  return { pid: value.pid, port: value.port, email: value.email, startedAt: value.startedAt }
}

/**
 * The environment the trial's commands run in: the copy and a secret of the trial's own — **checked after the spread**,
 * so no variable of the caller's can point a migration or the server at the dev's base (review ARCH-003, 2026-11-25).
 * @param inherited - the caller's environment
 * @param paths - the trial's paths
 * @param secret - the trial's `PAYLOAD_SECRET`
 * @returns the environment
 * @throws when it would name another base — a defect of this code
 */
export function trialEnv<Env extends Record<string, string | undefined>>(
  inherited: Env,
  paths: TrialPaths,
  secret: string
): Env & { DATABASE_URL: string; PAYLOAD_SECRET: string } {
  const env = { ...inherited, DATABASE_URL: `file:${paths.database}`, PAYLOAD_SECRET: secret }
  if (!isTrialDatabase(env.DATABASE_URL, paths.folder))
    throw new Error(`refused: ${env.DATABASE_URL} is not the trial's copy`)
  return env
}

/**
 * Whether a process's command line is the trial's server: `next dev` on the trial's own port — so a pid the system
 * gave to another process since (a reboot, a crash) is never stopped (review ARCH-001, 2026-11-25).
 * @param commandLine - the group leader's command line, as `ps` gives it
 * @param port - the trial's port
 * @returns `true` only for the trial's server
 */
export function isTrialServer(commandLine: string, port: number): boolean {
  return (
    /\bnext dev\b/.test(commandLine) && new RegExp(`--port ${String(port)}\\b`).test(commandLine)
  )
}

/** What stopping a trial reaches into, injected so every branch is tried with literals. */
export interface StopDeps {
  /**
   * Whether the group still has a member: `false` once gone, `true` while any — ours or not.
   * @param pid - the group's leader
   */
  alive: (pid: number) => boolean
  /**
   * The leader's command line, or `null` once it is gone.
   * @param pid - the leader
   */
  commandOf: (pid: number) => string | null
  /**
   * Signal the whole group.
   * @param pid - its leader
   * @param signal - the signal
   */
  kill: (pid: number, signal: 'SIGTERM' | 'SIGKILL') => void
  /**
   * Wait.
   * @param ms - how long
   */
  sleep: (ms: number) => Promise<void>
  /** How long the server is given to stop before it is killed. */
  graceMs: number
}

/** How a stop ended: the server stopped, already gone, or a process that is not the trial's — left alone. */
export type StopOutcome = 'stopped' | 'gone' | 'notOurs'

/**
 * Stop a trial's server: its identity checked, `SIGTERM` to its group, `SIGKILL` after the grace.
 * @param state - the trial's state
 * @param deps - the process functions
 * @returns how it ended
 */
export async function stopTrial(state: TrialState, deps: StopDeps): Promise<StopOutcome> {
  if (!deps.alive(state.pid)) return 'gone'
  const command = deps.commandOf(state.pid)
  if (command === null) return 'gone'
  if (!isTrialServer(command, state.port)) return 'notOurs'
  deps.kill(state.pid, 'SIGTERM')
  for (let waited = 0; deps.alive(state.pid) && waited < deps.graceMs; waited += 300)
    await deps.sleep(300)
  if (deps.alive(state.pid)) deps.kill(state.pid, 'SIGKILL')
  return 'stopped'
}
