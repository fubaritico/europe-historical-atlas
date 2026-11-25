// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { oracleAction, oracleCommand } from './oracle-session.mjs'
import { writeRole } from './role-state.mjs'

const script = join(dirname(fileURLToPath(import.meta.url)), 'oracle-session.mjs')
const fresh = { role: null, started: false }

describe('oracleAction', () => {
  it('an agent started as historian starts the oracle', () => {
    assert.equal(oracleAction({ hook_event_name: 'SessionStart', source: 'startup', agent_type: 'historian' }, fresh), 'start')
  })
  it('a coder session starts nothing', () => {
    assert.equal(oracleAction({ hook_event_name: 'SessionStart', source: 'startup', agent_type: 'coder' }, fresh), null)
    assert.equal(oracleAction({ hook_event_name: 'SessionStart', source: 'startup' }, fresh), null)
    assert.equal(oracleAction({ hook_event_name: 'UserPromptSubmit', prompt: 'prends le rôle du codeur' }, fresh), null)
    assert.equal(oracleAction({ hook_event_name: 'UserPromptSubmit', prompt: 'corrige 1200' }, fresh), null)
  })
  it('a sentence naming the historian starts it', () => {
    assert.equal(oracleAction({ hook_event_name: 'UserPromptSubmit', prompt: 'commence une session en tant qu’historien' }, fresh), 'start')
  })
  it('a session that already started it starts nothing more', () => {
    const started = { role: 'historian', started: true }
    assert.equal(oracleAction({ hook_event_name: 'UserPromptSubmit', prompt: 'en tant qu’historien' }, started), null)
    assert.equal(oracleAction({ hook_event_name: 'SessionStart', source: 'compact' }, started), null)
  })
  it('a resumed or compacted historian session starts it; a coder one does not', () => {
    assert.equal(oracleAction({ hook_event_name: 'SessionStart', source: 'resume' }, { role: 'historian', started: false }), 'start')
    assert.equal(oracleAction({ hook_event_name: 'SessionStart', source: 'compact' }, { role: 'coder', started: false }), null)
  })
  it('the end of a historian session stops it, unless it is a clear', () => {
    const historian = { role: 'historian', started: true }
    assert.equal(oracleAction({ hook_event_name: 'SessionEnd', reason: 'prompt_input_exit' }, historian), 'stop')
    assert.equal(oracleAction({ hook_event_name: 'SessionEnd', reason: 'other' }, historian), 'stop')
    assert.equal(oracleAction({ hook_event_name: 'SessionEnd', reason: 'clear' }, historian), null)
  })
  it('the end of a coder session stops nothing', () => {
    assert.equal(oracleAction({ hook_event_name: 'SessionEnd', reason: 'prompt_input_exit' }, { role: 'coder', started: false }), null)
    assert.equal(oracleAction({ hook_event_name: 'SessionEnd', reason: 'prompt_input_exit' }, { role: null, started: false }), null)
  })
})

describe('oracleCommand', () => {
  it('the injected command replaces the oracle', () => {
    assert.deepEqual(oracleCommand('stop', { ORACLE_SESSION_COMMAND: '/tmp/fake' }), { file: '/tmp/fake', args: ['stop'] })
  })
})

describe('as Claude Code runs it', () => {
  /** A tree, a fake oracle that writes what it is asked to a file, and a runner of the hook. */
  const setup = () => {
    const tree = mkdtempSync(join(tmpdir(), 'oracle-session-'))
    const calls = join(tree, 'calls.txt')
    const fake = join(tree, 'fake-oracle.sh')
    writeFileSync(fake, `#!/bin/sh\necho "$1" >> "${calls}"\n`)
    chmodSync(fake, 0o755)
    const run = (input) =>
      execFileSync('node', [script], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: tree, ORACLE_SESSION_COMMAND: fake } })
    /** The commands the fake received (the launch is detached: wait for it). */
    const received = async (count) => {
      for (let i = 0; i < 50 && !(existsSync(calls) && readFileSync(calls, 'utf8').trim().split('\n').length >= count); i++) await new Promise((r) => setTimeout(r, 40))
      return existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []
    }
    return { tree, run, received }
  }

  it('a historian sentence launches start once, an exit launches stop', async () => {
    const { tree, run, received } = setup()
    run({ hook_event_name: 'UserPromptSubmit', session_id: 'h1', prompt: 'commence une session en tant qu’historien' })
    run({ hook_event_name: 'UserPromptSubmit', session_id: 'h1', prompt: 'en tant qu’historien, encore' })
    assert.deepEqual(await received(1), ['start'])
    writeRole(tree, 'h1', 'historian')
    run({ hook_event_name: 'SessionEnd', session_id: 'h1', reason: 'prompt_input_exit' })
    assert.deepEqual(await received(2), ['start', 'stop'])
  })
  it('a coder session launches nothing, and a clear stops nothing', async () => {
    const { tree, run, received } = setup()
    run({ hook_event_name: 'SessionStart', session_id: 'c1', source: 'startup', agent_type: 'coder' })
    writeRole(tree, 'c1', 'coder')
    run({ hook_event_name: 'SessionEnd', session_id: 'c1', reason: 'prompt_input_exit' })
    writeRole(tree, 'h2', 'historian')
    run({ hook_event_name: 'SessionEnd', session_id: 'h2', reason: 'clear' })
    await new Promise((r) => setTimeout(r, 300))
    assert.deepEqual(await received(1), [])
  })
  it('an input with no session id launches nothing and does not fail the session', () => {
    const { run } = setup()
    assert.equal(run({ hook_event_name: 'SessionStart', source: 'startup', agent_type: 'historian' }), '')
  })
})
