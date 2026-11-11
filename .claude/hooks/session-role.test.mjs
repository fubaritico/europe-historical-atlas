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

/** Runs the hook as Claude Code does, in a tree of its own. */
const run = (input, tree) =>
  execFileSync('node', [script], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: tree } })

describe('session-role', () => {
  describe('a message', () => {
    it('« commence une session en tant qu’historien » notes the historian and hands its page over', () => {
      const { output, write } = roleEvent({ hook_event_name: 'UserPromptSubmit', prompt: 'commence une session en tant qu’historien' }, 'coder', readPage)
      assert.equal(write, 'historian')
      assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit')
      assert.match(output.hookSpecificOutput.additionalContext, /« historian »[\s\S]*HISTORIAN PAGE$/)
    })
    it('a message naming no role changes nothing', () => {
      assert.deepEqual(roleEvent({ hook_event_name: 'UserPromptSubmit', prompt: 'corrige 1200' }, 'historian', readPage), { output: null, write: null })
    })
  })

  describe('a session start', () => {
    it('at startup, the note is the agent the session was started as, and the session is titled after it', () => {
      const { output, write } = roleEvent({ hook_event_name: 'SessionStart', source: 'startup', agent_type: 'historian' }, 'coder', readPage)
      assert.equal(write, 'historian')
      assert.equal(output.hookSpecificOutput.sessionTitle, 'historien')
    })
    it('at startup with no agent, yesterday’s sentence is forgotten: the session is the coder', () => {
      const { write } = roleEvent({ hook_event_name: 'SessionStart', source: 'startup' }, 'historian', readPage)
      assert.equal(write, 'coder')
    })
    it('after a clear, the noted role’s page is given back, over the agent', () => {
      const { output, write } = roleEvent({ hook_event_name: 'SessionStart', source: 'clear', agent_type: 'coder' }, 'historian', readPage)
      assert.equal(write, null)
      assert.match(output.hookSpecificOutput.additionalContext, /HISTORIAN PAGE$/)
    })
    it('after a compaction with no note, the coder’s page is given back', () => {
      const { output } = roleEvent({ hook_event_name: 'SessionStart', source: 'compact' }, null, readPage)
      assert.match(output.hookSpecificOutput.additionalContext, /CODER PAGE$/)
    })
    it('a resume says nothing and leaves the note', () => {
      assert.deepEqual(roleEvent({ hook_event_name: 'SessionStart', source: 'resume' }, 'historian', readPage), { output: null, write: null })
    })
  })

  describe('as Claude Code runs it', () => {
    it('a sentence notes the role in the tree and hands the real page over', () => {
      const tree = mkdtempSync(join(tmpdir(), 'session-role-'))
      const out = JSON.parse(run({ hook_event_name: 'UserPromptSubmit', prompt: 'prends le rôle du codeur' }, tree))
      assert.match(out.hookSpecificOutput.additionalContext, /# Role — the coder/)
      assert.equal(readRole(tree), 'coder')
    })
    it('after a clear, the tree’s note decides the page', () => {
      const tree = mkdtempSync(join(tmpdir(), 'session-role-'))
      writeRole(tree, 'historian')
      const out = JSON.parse(run({ hook_event_name: 'SessionStart', source: 'clear' }, tree))
      assert.match(out.hookSpecificOutput.additionalContext, /# Role — the historian/)
    })
  })
})
