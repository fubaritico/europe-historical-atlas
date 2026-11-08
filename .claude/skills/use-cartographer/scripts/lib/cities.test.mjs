import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { describe, it } from 'node:test'

import { CITIES_OF_A_YEAR, citiesFromRows, inBox, readCities } from './cities.mjs'
import { findCmsDb, openReadOnly, REPO_ROOT } from './system.mjs'

/**
 * A base with the four tables the query reads, as Payload names them, and three periods: one covering 1100, one open
 * since 1094, one ended in 1099.
 * @returns {DatabaseSync} the base, in memory
 */
function memoryBase() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    create table places (id integer primary key, location text not null);
    create table places_locales (id integer primary key, name text not null, _locale text not null, _parent_id integer not null);
    create table place_periods (id integer primary key, place_id integer not null, date_start_year numeric not null,
      date_end_year numeric, holder_name text, holder_qid text);
    insert into places values (1, '{"type":"Point","coordinates":[-0.376,39.47]}'),
      (2, '{"type":"Point","coordinates":[-0.435,39.15]}'), (3, '{"type":"Point","coordinates":[0,40]}');
    insert into places_locales values (1, 'Valence', 'fr', 1), (2, 'Valencia', 'en', 1), (3, 'Alzira', 'fr', 2),
      (4, 'Gone', 'fr', 3);
    insert into place_periods values (10, 1, 1094, null, 'Seigneurie de Valence', 'Q15714699'),
      (11, 2, 1090, 1110, 'Empire almoravide', 'Q75613'), (12, 3, 1050, 1099, null, null);
  `)
  return db
}

describe('readCities', () => {
  it('runs the query on Payload tables: the covered and the open periods, not the ended one', () => {
    const cities = readCities('memory', 1100, () => memoryBase())
    assert.deepEqual(
      cities.map((c) => [c.name, c.holderQid]),
      [
        ['Alzira', 'Q75613'],
        ['Valence', 'Q15714699'],
      ]
    )
  })

  it('prepares on the real base, when this checkout reaches one', (t) => {
    let path
    try {
      path = findCmsDb(REPO_ROOT)
    } catch {
      t.skip('no CMS base reachable from this checkout')
      return
    }
    // Preparing checks every table and column name against the schema Payload really wrote.
    assert.doesNotThrow(() => openReadOnly(path).prepare(CITIES_OF_A_YEAR))
  })
})

describe('citiesFromRows', () => {
  const row = {
    id: 7,
    location: '{"type":"Point","coordinates":[-0.376,39.47]}',
    holderName: 'Seigneurie',
    holderQid: 'Q15714699',
    nameFr: 'Valence',
    nameEn: 'Valencia',
  }

  it('falls to the English name, then to the id', () => {
    assert.equal(citiesFromRows([{ ...row, nameFr: null }])[0].name, 'Valencia')
    assert.equal(citiesFromRows([{ ...row, nameFr: null, nameEn: null }])[0].name, '#7')
  })

  it('refuses a place with no point', () => {
    assert.throws(() => citiesFromRows([{ ...row, location: '{"type":"Polygon"}' }]), /no point/)
  })
})

describe('inBox', () => {
  const valencia = {
    id: 1,
    name: 'Valence',
    at: /** @type {const} */ ([-0.376, 39.47]),
    holderName: null,
    holderQid: null,
  }

  it('keeps every city without a box', () => {
    assert.equal(inBox(valencia, undefined), true)
  })

  it('keeps a city inside and leaves one outside', () => {
    assert.equal(inBox(valencia, [-1, 39, 0, 40]), true)
    assert.equal(inBox(valencia, [0, 39, 1, 40]), false)
  })
})
