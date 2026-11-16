import { buildConfig } from 'payload'

import { cmsConfig } from '../cmsConfig'

import { readContent } from './readContent'

/**
 * Print the content the export would write — every event and every city at a date, read out of the base — on the
 * standard output, and write nothing (CARTO-456): the Cartographer's city alerts read it from a pipe, so a correction
 * entered in the base is judged at the next run, with no export. Payload's own log, warnings and worse only, and the
 * export's warnings go to the standard error — Payload writes its log on the standard output by default, which would
 * break the one JSON document.
 */
const config = await buildConfig({
  ...cmsConfig(),
  logger: { options: { level: 'warn' }, destination: process.stderr },
})
const content = await readContent(config, (message) => {
  console.warn(message)
})
// Awaited to its end: `payload run` exits once this module has run, and a pipe takes 128 KB at a time — measured, the
// output cut at 131 072 bytes when the write was left to finish on its own.
await new Promise<void>((resolve, reject) => {
  process.stdout.write(`${JSON.stringify(content)}\n`, (error) => {
    if (error) reject(error)
    else resolve()
  })
})
