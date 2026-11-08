#!/usr/bin/env node
import { undatedPolities } from './lib/measures.mjs'
import { commandLine, folderOf, print, readJson } from './lib/system.mjs'
import { readYearMap } from './lib/yearMap.mjs'

/**
 * The registry check of a zone's end: every polity with a Wikidata id but no dates — the « Use » forgotten in the
 * polity's form. Fill them from the form's Wikidata line, unless our sources contradict a date (then write ours, and
 * say so in the sources file).
 */

const USAGE = 'node registry.mjs --map 1100'

const { values } = commandLine({}, USAGE)
const map = readYearMap(folderOf(String(values.map)), readJson)

print(
  undatedPolities(map).map(
    (p) => `undated ${p.id.padEnd(34)} ${p.wikidata.padEnd(11)} missing ${p.missing.join(' and ')}`
  )
)
