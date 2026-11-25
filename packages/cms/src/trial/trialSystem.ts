import { execFileSync } from 'node:child_process'
import path from 'node:path'

import { trialPaths } from './trialPlan'

import type { StopDeps } from './trialPlan'

/**
 * The trial's ties to this machine (REPO-542): where the package is, and the process functions `trialPlan.stopTrial`
 * is handed. The one place that reads the file's location or signals a process — the decisions are `trialPlan.ts`'s.
 */

/** `packages/cms` of the tree that runs the trial — named once (review ARCH-005, 2026-11-25). */
export const CMS_ROOT = path.resolve(import.meta.dirname, '../..')

/** The trial's paths in this tree. */
export const TRIAL = trialPaths(CMS_ROOT)

/**
 * The code of a failed system call, if it has one.
 * @param error - what was thrown
 * @returns its `code`, or `undefined`
 */
function codeOf(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
}

/**
 * Whether a process group has a member — `EPERM` is a live group that is not ours, never read as gone.
 * @param pid - the group's leader
 * @returns `true` while it has one
 */
export function groupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error: unknown) {
    if (codeOf(error) === 'ESRCH') return false
    if (codeOf(error) === 'EPERM') return true
    throw error
  }
}

/**
 * Signal a process group, a group already gone being no failure — any other refusal is thrown.
 * @param pid - its leader
 * @param signal - the signal
 */
export function signalGroup(pid: number, signal: 'SIGTERM' | 'SIGKILL'): void {
  try {
    process.kill(-pid, signal)
  } catch (error: unknown) {
    if (codeOf(error) !== 'ESRCH') throw error
  }
}

/**
 * A process's command line.
 * @param pid - the process
 * @returns it, or `null` when no such process
 */
function commandOf(pid: number): string | null {
  try {
    return execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).trim()
  } catch {
    // `ps` exits 1 when no process has that pid — the process is gone, which the caller says
    return null
  }
}

/** The real process functions. */
export const SYSTEM_STOP: StopDeps = {
  alive: groupAlive,
  commandOf,
  kill: signalGroup,
  sleep: (ms) => new Promise((wait) => setTimeout(wait, ms)),
  graceMs: 15_000,
}
