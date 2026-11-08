#!/usr/bin/env node
import { parseHover, parseNumbers } from './lib/args.mjs'
import { calibrate } from './lib/screen.mjs'
import { commandLine, print } from './lib/system.mjs'

/**
 * Where to click: the screen point of each position, from two hovers read in the status bar. Re-run after every pan
 * or zoom — the view moves, the calibration does not follow.
 */

const USAGE = `node screen.mjs --a "200,200,4°06′O 42°49′N" --b "1200,750,0°53′E 40°47′N" -- -1.776,42.301 -0.96,42.041
  --a, --b   x,y of a hover, then the position the status bar read there (copy it as it is)
  then the positions wanted, lon,lat each`

const { values, positionals } = commandLine(
  { a: { type: 'string' }, b: { type: 'string' } },
  USAGE,
  ['a', 'b']
)
const toScreen = calibrate(parseHover(String(values.a)), parseHover(String(values.b)))
print(
  positionals.map((text) => {
    const [lon, lat] = parseNumbers(text, 2, 'a position')
    const [x, y] = toScreen([lon, lat])
    return `${text.padEnd(22)} → ${Math.round(x)},${Math.round(y)}`
  })
)
