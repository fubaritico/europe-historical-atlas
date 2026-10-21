// Run: node --test .claude/hooks/
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { matchTopics, normalise, renderReminder } from './rules-for-prompt.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'rules-for-prompt.mjs')
const { topics } = JSON.parse(readFileSync(join(here, '../skills/rules/topics.json'), 'utf8'))

/** Runs the hook as Claude Code does: JSON on stdin, extra arguments after the script. */
const run = (input, args = []) =>
  execFileSync('node', [script, ...args], { input: JSON.stringify(input), encoding: 'utf8' })

describe('rules-for-prompt', () => {
  describe('happy path', () => {
    it('names the Cartographer for a message about the Cartographer', () => {
      assert.deepEqual(matchTopics('Le Cartographe ne dessine plus avec la plume', topics), ['cartographer'])
    })

    it('injects the files of a matched topic as additionalContext', () => {
      const out = JSON.parse(run({ session_id: `t-${Date.now()}-a`, prompt: 'on parle du Cartographe' }))
      assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit')
      assert.match(out.hookSpecificOutput.additionalContext, /\.claude\/rules\/cartographer\.md/)
    })
  })

  describe('variants', () => {
    it('ignores accents and case', () => {
      assert.deepEqual(matchTopics("L'ÉDITEUR", topics), ['cartographer'])
    })

    it('accepts a plural in s or x', () => {
      assert.deepEqual(matchTopics('les ancres', topics), ['cartographer'])
      assert.deepEqual(matchTopics('les lieux et les acteurs', topics), ['contribution'])
    })

    it('names the Claude configuration rule for a talk about Claude practices', () => {
      assert.deepEqual(matchTopics('Je discutais des bonnes pratiques Claude avec Gemini', topics), ['claude'])
    })

    it('matches a ticket by its prefix', () => {
      assert.deepEqual(matchTopics('CARTO-116', topics), ['cartographer'])
    })

    it('matches a phrase', () => {
      assert.deepEqual(matchTopics("l'an zéro est refusé", topics), ['date'])
    })

    it('names several topics in one message, a shared file once', () => {
      const keys = matchTopics("l'atlas et le Cartographe", topics)
      assert.deepEqual(keys, ['cartographer', 'atlas'])
      const reminder = renderReminder(keys, topics)
      assert.equal(reminder.split('.claude/rules/architecture.md').length - 1, 1)
    })

    it('carries a file hint into the reminder', () => {
      assert.match(renderReminder(['date'], topics), /files\/plans\/plan\.md \(the historical-date section only/)
    })

    it('says a topic whose files were all named above', () => {
      const reminder = renderReminder(['cartographer', 'core'], topics)
      assert.match(reminder, /\.claude\/rules\/known-issues\/core\.md/)
      const onlyShared = { a: topics.core, b: { ...topics.core, label: 'b' } }
      assert.match(renderReminder(['a', 'b'], onlyShared), /- b: already named above/)
    })
  })

  describe('managed errors', () => {
    it('fails loudly, without blocking, when the input has no session_id', () => {
      assert.throws(() => run({ prompt: 'atlas' }), (error) => error.status === 1 && /no session_id/.test(error.stderr))
    })

    it('fails loudly when the input has no prompt', () => {
      assert.throws(() => run({ session_id: 'x' }), (error) => error.status === 1 && /no prompt/.test(error.stderr))
    })
  })

  describe('unmanaged errors', () => {
    it('fails loudly on input that is not JSON', () => {
      assert.throws(
        () => execFileSync('node', [script], { input: 'not json', encoding: 'utf8', stdio: 'pipe' }),
        (error) => error.status === 1 && /\[rules hook\]/.test(error.stderr),
      )
    })
  })

  describe('edge cases', () => {
    it('names nothing for a message with no subject word', () => {
      assert.deepEqual(matchTopics('Oui, vas-y.', topics), [])
      assert.equal(run({ session_id: `t-${Date.now()}-b`, prompt: 'Oui, vas-y.' }), '')
    })

    it('does not take "au lieu de" or "celui-ci" for a subject', () => {
      assert.deepEqual(matchTopics('au lieu de celui-ci', topics), [])
    })

    it('takes test and tests for the tests topic, not the verb tester', () => {
      assert.deepEqual(matchTopics('un test', topics), ['tests'])
      assert.deepEqual(matchTopics('les tests', topics), ['tests'])
      assert.deepEqual(matchTopics('on va tester si ça se déclenche', topics), [])
    })

    it('does not take a word inside a longer one', () => {
      assert.deepEqual(matchTopics('contestation', topics), [])
    })

    it("names nothing for a subagent's report or a task event, and does not mark their topics", () => {
      const session = `t-${Date.now()}-d`
      const report = 'Another Claude session sent a message:\n<agent-message from="x">the atlas and three.js</agent-message>'
      assert.equal(run({ session_id: session, prompt: report }), '')
      assert.equal(run({ session_id: session, prompt: '<task-notification>atlas</task-notification>' }), '')
      assert.notEqual(run({ session_id: session, prompt: "l'atlas" }), '')
      run({ session_id: session, prompt: 'x' }, ['--reset'])
    })

    it('asks for a topic once per session, again after a reset', () => {
      const session = `t-${Date.now()}-c`
      assert.notEqual(run({ session_id: session, prompt: 'atlas' }), '')
      assert.equal(run({ session_id: session, prompt: "l'atlas encore" }), '')
      assert.equal(run({ session_id: session, prompt: 'x' }, ['--reset']), '')
      assert.notEqual(run({ session_id: session, prompt: 'atlas' }), '')
      run({ session_id: session, prompt: 'x' }, ['--reset'])
    })

    it('normalises a ligature-free decomposed accent', () => {
      assert.equal(normalise('éditeur'), 'editeur')
    })
  })
})
