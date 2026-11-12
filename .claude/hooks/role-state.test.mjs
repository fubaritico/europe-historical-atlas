// Run: node --test '.claude/*.test.mjs' '.claude/hooks/*.test.mjs'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import {
  HAND_OVER_MS,
  NOTE_KEEP_MS,
  anySessionHolds,
  handOver,
  pruneNotes,
  readRole,
  roleFromPrompt,
  rolePath,
  rolesDir,
  takeHandOver,
  writeRole,
} from './role-state.mjs'

describe('role-state', () => {
  describe('roleFromPrompt', () => {
    it('« commence une session en tant qu’historien » names the historian', () => {
      assert.equal(roleFromPrompt('Commence une session en tant qu’historien'), 'historian')
      assert.equal(roleFromPrompt("commence une session en tant qu'historien"), 'historian')
    })
    it('« en tant que codeur » and « en tant que historien », as dictated, name their role', () => {
      assert.equal(roleFromPrompt('commence une session en tant que codeur'), 'coder')
      assert.equal(roleFromPrompt('en tant que historien'), 'historian')
    })
    it('« prends le rôle du codeur » names the coder, accents or not', () => {
      assert.equal(roleFromPrompt('Prends le rôle du codeur'), 'coder')
      assert.equal(roleFromPrompt('prends le role de historien'), 'historian')
    })
    it('« passe en historien » names the historian', () => {
      assert.equal(roleFromPrompt('ok, passe en historien'), 'historian')
    })
    it('the agent’s first prompt names its role', () => {
      assert.equal(roleFromPrompt('/start-session historian'), 'historian')
      assert.equal(roleFromPrompt('/start-session coder'), 'coder')
    })
    it('a message that only mentions the historian names no role', () => {
      assert.equal(roleFromPrompt('l’historien a saisi l’Adriatique'), null)
      assert.equal(roleFromPrompt('le codeur et l’historien'), null)
      assert.equal(roleFromPrompt('/start-session'), null)
    })
  })

  describe('the note', () => {
    const newTree = () => mkdtempSync(join(tmpdir(), 'role-'))
    it('a role written is read back by its session', () => {
      const tree = newTree()
      writeRole(tree, 'session-a', 'historian')
      assert.equal(readRole(tree, 'session-a'), 'historian')
    })
    it('two sessions in one tree keep their own role: the historian named in one leaves the other the coder', () => {
      const tree = newTree()
      writeRole(tree, 'coder-console', 'coder')
      writeRole(tree, 'historian-console', 'historian')
      assert.equal(readRole(tree, 'coder-console'), 'coder')
      assert.equal(readRole(tree, 'historian-console'), 'historian')
    })
    it('a session with no note has no role', () => {
      assert.equal(readRole(newTree(), 'session-a'), null)
    })
    it('a note naming no known role is no role', () => {
      const tree = newTree()
      mkdirSync(rolesDir(tree), { recursive: true })
      writeFileSync(rolePath(tree, 'session-a'), 'pirate\n')
      assert.equal(readRole(tree, 'session-a'), null)
    })
    it('an id that is absent or climbs out of the folder reads no role and writes nothing', () => {
      const tree = newTree()
      assert.equal(readRole(tree, undefined), null)
      assert.equal(readRole(tree, '../role'), null)
      assert.throws(() => writeRole(tree, '../escape', 'historian'), /cannot name a role note/)
      assert.equal(existsSync(join(tree, '.claude', 'state', 'escape')), false)
    })
    it('anySessionHolds sees a historian among the tree’s sessions, and not a coder only tree', () => {
      const tree = newTree()
      writeRole(tree, 'a', 'coder')
      assert.equal(anySessionHolds(tree, 'historian'), false)
      writeRole(tree, 'b', 'historian')
      assert.equal(anySessionHolds(tree, 'historian'), true)
      assert.equal(anySessionHolds(newTree(), 'historian'), false)
    })
  })

  describe('the hand-over of a clear', () => {
    const newTree = () => mkdtempSync(join(tmpdir(), 'role-'))
    it('a role handed over is taken once, within the delay', () => {
      const tree = newTree()
      handOver(tree, 'historian', 1_000)
      assert.equal(takeHandOver(tree, 1_000 + HAND_OVER_MS), 'historian')
      assert.equal(takeHandOver(tree, 1_000 + HAND_OVER_MS), null)
    })
    it('a hand-over older than the delay is dropped', () => {
      const tree = newTree()
      handOver(tree, 'historian', 1_000)
      assert.equal(takeHandOver(tree, 1_001 + HAND_OVER_MS), null)
      assert.equal(existsSync(join(rolesDir(tree), 'handover.json')), false)
    })
    it('a hand-over that is not JSON throws, and is removed all the same', () => {
      const tree = newTree()
      mkdirSync(rolesDir(tree), { recursive: true })
      writeFileSync(join(rolesDir(tree), 'handover.json'), 'nope')
      assert.throws(() => takeHandOver(tree, 0), SyntaxError)
      assert.equal(existsSync(join(rolesDir(tree), 'handover.json')), false)
    })
    it('the hand-over is no session’s note', () => {
      const tree = newTree()
      handOver(tree, 'historian', 0)
      assert.equal(anySessionHolds(tree, 'historian'), false)
    })
  })

  describe('pruneNotes', () => {
    it('removes a note older than the keep, the tree’s note of before, and keeps a recent one', () => {
      const tree = mkdtempSync(join(tmpdir(), 'role-'))
      writeRole(tree, 'old', 'coder')
      writeRole(tree, 'recent', 'historian')
      writeFileSync(join(tree, '.claude', 'state', 'role'), 'historian\n')
      const now = Date.now()
      const past = new Date(now - NOTE_KEEP_MS - 60_000)
      utimesSync(rolePath(tree, 'old'), past, past)
      pruneNotes(tree, now)
      assert.equal(existsSync(rolePath(tree, 'old')), false)
      assert.equal(readRole(tree, 'recent'), 'historian')
      assert.equal(existsSync(join(tree, '.claude', 'state', 'role')), false)
    })
  })
})
