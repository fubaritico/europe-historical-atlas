import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createHeightmap } from '../../src/data/heightmap'
import { DEFAULT_RIVER_EXTENSION, extendRiversToSea, projectRivers } from '../../src/data/riverSource'
describe('x', () => { it('y', () => {
  const meta = JSON.parse(readFileSync('public/heightmaps/europe-dem-z5.json', 'utf8'))
  const raw = readFileSync('public/heightmaps/europe-dem-z5.bin')
  const hm = createHeightmap(meta, new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2))
  const payload = JSON.parse(readFileSync('public/rivers/europe-rivers.json', 'utf8'))
  const before = projectRivers(payload)
  const after = extendRiversToSea(before, hm, { ...DEFAULT_RIVER_EXTENSION, seaLevel: 0 })
  const sea = (p: {u:number;v:number}[]) => hm.sample(p[0]!.u,p[0]!.v)<=0 || hm.sample(p[p.length-1]!.u,p[p.length-1]!.v)<=0
  let bridged=0
  for (let i=0;i<before.length;i++) if(!sea(before[i]!.points)&&sea(after[i]!.points)) bridged++
  const named = ['Loire','Seine','Garonne'].map(n=>{const i=before.findIndex(r=>r.name===n&&!sea(r.points));return `${n}=${i<0?'na':String(sea(after[i]!.points))}`})
  require('node:fs').writeFileSync('/tmp/verify.txt', `bridged: ${bridged}\n${named.join(' ')}`)
  expect(after.length).toBe(before.length)
})})
