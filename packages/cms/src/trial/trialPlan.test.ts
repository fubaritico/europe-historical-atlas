import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  TRIAL_PORTS,
  devBaseOf,
  firstFreePort,
  isTrialDatabase,
  isTrialServer,
  readTrialState,
  stopTrial,
  throwawayAccount,
  trialEnv,
  trialPaths,
} from './trialPlan'

const CMS = '/work/tree/packages/cms'
const FOLDER = trialPaths(CMS).folder
const STATE = { pid: 4242, port: 3112, email: 'e', startedAt: 's' }
const SERVER = 'node pnpm exec next dev --port 3112 --hostname 127.0.0.1'

/**
 * Process functions over a group that dies after a number of checks once signalled.
 * @param world - the leader's command line, how many `alive` checks it survives the SIGTERM, whether it is gone already
 * @param world.command - the leader's command line, or `null` once gone
 * @param world.outlives - how many checks it survives the SIGTERM
 * @param world.startsDead - whether the group is gone before anything
 * @returns the deps and what was signalled
 */
function processes(world: { command: string | null; outlives?: number; startsDead?: boolean }) {
  const signals: string[] = []
  let checksAfterTerm = 0
  const deps = {
    alive: () => {
      if (world.startsDead === true) return false
      if (signals.includes('SIGKILL')) return false
      if (!signals.includes('SIGTERM')) return true
      checksAfterTerm += 1
      return checksAfterTerm <= (world.outlives ?? 0)
    },
    commandOf: () => world.command,
    kill: (_: number, signal: 'SIGTERM' | 'SIGKILL') => {
      signals.push(signal)
    },
    sleep: () => Promise.resolve(),
    graceMs: 900,
  }
  return { deps, signals }
}

describe('trialPlan', () => {
  describe('happy path', () => {
    it('puts every piece of a trial in one folder of the package', () => {
      expect(trialPaths(CMS)).toEqual({
        folder: '/work/tree/packages/cms/.trial',
        database: '/work/tree/packages/cms/.trial/cms.db',
        state: '/work/tree/packages/cms/.trial/state.json',
        log: '/work/tree/packages/cms/.trial/cms.log',
      })
    })

    it('copies the dev’s base from the main checkout, whichever tree runs the trial', () => {
      expect(devBaseOf('/Users/dev/europe-map/.git\n')).toBe(
        '/Users/dev/europe-map/packages/cms/cms.db'
      )
    })

    it('lets a write through to the trial’s copy', () => {
      expect(isTrialDatabase(`file:${FOLDER}/cms.db`, FOLDER)).toBe(true)
    })
  })

  describe('variants', () => {
    it('takes the first free port, beside the dev’s 3100', async () => {
      const taken = new Set([3110, 3111])

      expect(await firstFreePort(TRIAL_PORTS, (port) => Promise.resolve(!taken.has(port)))).toBe(
        3112
      )
      expect(TRIAL_PORTS).not.toContain(3100)
    })

    it('makes an account no one owns, with a password drawn for it', () => {
      const draws: number[] = []
      const account = throwawayAccount((bytes) => {
        draws.push(bytes)
        return 'ab'.repeat(bytes)
      })

      expect(account).toEqual({
        email: 'trial-abababab@example.test',
        password: 'ab'.repeat(16),
      })
      expect(draws).toEqual([4, 16])
    })
  })

  describe('managed errors', () => {
    it.each([
      ['the dev’s base', 'file:/work/tree/packages/cms/cms.db'],
      ['a relative path outside', 'file:./cms.db'],
      ['a folder that only starts like it', `file:${FOLDER}-other/cms.db`],
      ['a climb out of it', `file:${FOLDER}/../cms.db`],
      ['no URL', undefined],
      ['another scheme', `libsql://${FOLDER}/cms.db`],
    ])('refuses %s', (_, url) => {
      expect(isTrialDatabase(url, FOLDER)).toBe(false)
    })

    it('says no port is free rather than taking one', async () => {
      await expect(firstFreePort([3110, 3111], () => Promise.resolve(false))).rejects.toThrow(
        'no free port'
      )
    })
  })

  describe('unmanaged errors', () => {
    it.each([
      'null',
      '{}',
      '{"pid":1,"port":3110,"email":"a","startedAt":"x"}',
      '{"pid":12.5,"port":3110,"email":"a","startedAt":"x"}',
      '{"pid":"42","port":3110,"email":"a","startedAt":"x"}',
      '{"pid":42,"port":"3110","email":"a","startedAt":"x"}',
      '{"pid":42,"port":3100,"email":"a","startedAt":"x"}',
      '{"pid":42,"port":3110,"email":7,"startedAt":"x"}',
      '{"pid":42,"port":3110,"email":"a","startedAt":0}',
    ])('never reads a state it cannot trust — a wrong process would be stopped: %s', (text) => {
      expect(() => readTrialState(text)).toThrow('not readable')
    })

    it('lets a state that is no JSON throw', () => {
      expect(() => readTrialState('{')).toThrow()
    })
  })

  describe('the environment of the trial’s commands', () => {
    it('names the copy and the trial’s secret, over what the caller had', () => {
      const env = trialEnv(
        { PATH: '/bin', DATABASE_URL: 'file:/dev/base/cms.db', PAYLOAD_SECRET: 'his' },
        trialPaths(CMS),
        'trial-secret'
      )

      expect(env).toEqual({
        PATH: '/bin',
        DATABASE_URL: `file:${FOLDER}/cms.db`,
        PAYLOAD_SECRET: 'trial-secret',
      })
    })

    it('refuses paths whose copy lies outside the trial’s folder — checked on the env handed out', () => {
      const paths = { ...trialPaths(CMS), database: '/work/tree/packages/cms/cms.db' }

      expect(() => trialEnv({}, paths, 's')).toThrow('is not the trial')
    })
  })

  describe('the identity of the trial’s server', () => {
    it.each([
      ['node /pnpm.cjs exec next dev --port 3112 --hostname 127.0.0.1', true],
      ['node /pnpm.cjs exec next dev --port 31120 --hostname 127.0.0.1', false],
      ['node /pnpm.cjs exec next dev --port 3100 --hostname 127.0.0.1', false],
      ['/Applications/WebStorm.app/Contents/MacOS/webstorm --port 3112', false],
      ['', false],
    ])('%s → %s', (command, expected) => {
      expect(isTrialServer(command, 3112)).toBe(expected)
    })
  })

  describe('stopTrial', () => {
    it('stops the trial’s server with SIGTERM', async () => {
      const { deps, signals } = processes({ command: SERVER })

      expect(await stopTrial(STATE, deps)).toBe('stopped')
      expect(signals).toEqual(['SIGTERM'])
    })

    it('kills a server that outlives its grace', async () => {
      const { deps, signals } = processes({ command: SERVER, outlives: 100 })

      expect(await stopTrial(STATE, deps)).toBe('stopped')
      expect(signals).toEqual(['SIGTERM', 'SIGKILL'])
    })

    it('says a server already gone, and signals nothing', async () => {
      const { deps, signals } = processes({ command: null, startsDead: true })

      expect(await stopTrial(STATE, deps)).toBe('gone')
      expect(signals).toEqual([])
    })

    it('never signals a process that is not the trial’s server — a pid given away since', async () => {
      const { deps, signals } = processes({ command: '/usr/bin/vim notes.md' })

      expect(await stopTrial(STATE, deps)).toBe('notOurs')
      expect(signals).toEqual([])
    })

    it('says gone when the leader vanishes between the two checks', async () => {
      const { deps, signals } = processes({ command: null })

      expect(await stopTrial(STATE, deps)).toBe('gone')
      expect(signals).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('reads back what start writes', () => {
      const state = { pid: 4242, port: 3112, email: 'trial-1@example.test', startedAt: 'now' }

      expect(readTrialState(JSON.stringify(state))).toEqual(state)
    })

    it('reads the folder’s own file, its path normalised', () => {
      expect(isTrialDatabase(`file:${path.join(FOLDER, '.', 'cms.db')}`, FOLDER)).toBe(true)
    })
  })
})
