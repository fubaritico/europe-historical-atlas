// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { readRole, writeRole } from './role-state.mjs'
import { roleEvent } from './session-role.mjs'

const script = join(dirname(fileURLToPath(import.meta.url)), 'session-role.mjs')
const pages = { coder: 'CODER PAGE', historian: 'HISTORIAN PAGE' }
const readPage = (role) => pages[role] ?? null
const state = (noted, handedOver = null) => ({ noted, handedOver })

/** Runs the hook as Claude Code does, in a tree of its own. */
const run = (input, tree) =>
  execFileSync('node', [script], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: tree } })

describe('session-role', () => {
  describe('a message', () => {
    it('« commence une session en tant qu’historien » notes the historian and hands its page over', () => {
      const { output, write } = roleEvent({ hook_event_name: 'UserPromptSubmit', prompt: 'commence une session en tant qu’historien' }, state('coder'), readPage)
      assert.equal(write, 'historian')
      assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit')
      assert.match(output.hookSpecificOutput.additionalContext, /« historian »[\s\S]*HISTORIAN PAGE$/)
    })
    it('a message naming no role changes nothing', () => {
      assert.deepEqual(roleEvent({ hook_event_name: 'UserPromptSubmit', prompt: 'corrige 1200' }, state('historian'), readPage), {
        output: null,
        write: null,
        handOver: null,
      })
    })
  })

  describe('a session start', () => {
    it('at startup, the note is the agent the session was started as, and the session is titled after it', () => {
      const { output, write } = roleEvent({ hook_event_name: 'SessionStart', source: 'startup', agent_type: 'historian' }, state(null), readPage)
      assert.equal(write, 'historian')
      assert.equal(output.hookSpecificOutput.sessionTitle, 'historien')
    })
    it('at startup with no agent, the session is the coder', () => {
      assert.equal(roleEvent({ hook_event_name: 'SessionStart', source: 'startup' }, state(null), readPage).write, 'coder')
    })
    it('after a clear, the role handed over is noted for the new session and its page given back, over the agent', () => {
      const { output, write } = roleEvent({ hook_event_name: 'SessionStart', source: 'clear', agent_type: 'coder' }, state(null, 'historian'), readPage)
      assert.equal(write, 'historian')
      assert.match(output.hookSpecificOutput.additionalContext, /HISTORIAN PAGE$/)
    })
    it('after a clear with nothing handed over, the agent decides', () => {
      assert.equal(roleEvent({ hook_event_name: 'SessionStart', source: 'clear', agent_type: 'historian' }, state(null), readPage).write, 'historian')
    })
    it('after a compaction, the session keeps its note, rewritten to date it, and its page is given back', () => {
      const { output, write } = roleEvent({ hook_event_name: 'SessionStart', source: 'compact' }, state('historian'), readPage)
      assert.equal(write, 'historian')
      assert.match(output.hookSpecificOutput.additionalContext, /HISTORIAN PAGE$/)
    })
    it('after a compaction with no note, the coder’s page is given back', () => {
      const { output } = roleEvent({ hook_event_name: 'SessionStart', source: 'compact' }, state(null), readPage)
      assert.match(output.hookSpecificOutput.additionalContext, /CODER PAGE$/)
    })
    it('a resume says nothing and rewrites the note, so it is not pruned while the session lives', () => {
      assert.deepEqual(roleEvent({ hook_event_name: 'SessionStart', source: 'resume' }, state('historian'), readPage), {
        output: null,
        write: 'historian',
        handOver: null,
      })
    })
    it('a resume of a session with no note notes nothing', () => {
      assert.deepEqual(roleEvent({ hook_event_name: 'SessionStart', source: 'resume' }, state(null), readPage), {
        output: null,
        write: null,
        handOver: null,
      })
    })
  })

  describe('a session end', () => {
    it('a clear hands the session’s role over', () => {
      assert.equal(roleEvent({ hook_event_name: 'SessionEnd', reason: 'clear' }, state('historian'), readPage).handOver, 'historian')
    })
    it('an exit hands nothing over', () => {
      assert.equal(roleEvent({ hook_event_name: 'SessionEnd', reason: 'prompt_input_exit' }, state('historian'), readPage).handOver, null)
    })
  })

  describe('as Claude Code runs it', () => {
    it('a sentence in one console leaves the other console of the same tree its own role', () => {
      const tree = mkdtempSync(join(tmpdir(), 'session-role-'))
      run({ hook_event_name: 'SessionStart', source: 'startup', session_id: 'coder-console' }, tree)
      const out = JSON.parse(run({ hook_event_name: 'UserPromptSubmit', session_id: 'historian-console', prompt: 'commence une session en tant qu’historien' }, tree))
      assert.match(out.hookSpecificOutput.additionalContext, /# Role — the historian/)
      assert.equal(readRole(tree, 'historian-console'), 'historian')
      assert.equal(readRole(tree, 'coder-console'), 'coder')
    })
    it('a clear carries the role from the old session to the new one', () => {
      const tree = mkdtempSync(join(tmpdir(), 'session-role-'))
      writeRole(tree, 'before-clear', 'historian')
      run({ hook_event_name: 'SessionEnd', reason: 'clear', session_id: 'before-clear' }, tree)
      const out = JSON.parse(run({ hook_event_name: 'SessionStart', source: 'clear', session_id: 'after-clear' }, tree))
      assert.match(out.hookSpecificOutput.additionalContext, /# Role — the historian/)
      assert.equal(readRole(tree, 'after-clear'), 'historian')
    })
  })
})
