import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { openMapFolder } from '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cartographer/src/cli/cityAlerts'
import { cityVerdicts } from '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/cartographer/src/canvas/cityVerdict'
const folder = '/Users/stephanecottereau/Desktop/WebstormProjects/europe-map/packages/atlas/public/years/' + process.argv[2]
const pts = JSON.parse(await readFile(process.argv[3], 'utf8')) as { id: string; lon: number; lat: number }[]
const doc = await openMapFolder(folder, (f) => readFile(path.join(folder, f), 'utf8'))
const marks = pts.map((p) => ({ id: p.id, name: p.id, lon: p.lon, lat: p.lat, date: null, holder: null, holderSources: [], chain: null }))
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const v = cityVerdicts(doc, marks as any)
const out: Record<string, unknown> = {}
for (const p of pts) out[p.id] = v.get(p.id)?.onMap ?? null
process.stdout.write(JSON.stringify(out))
