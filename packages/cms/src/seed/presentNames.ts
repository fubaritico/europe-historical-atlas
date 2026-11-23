import { getPayload, readMigrationFiles } from 'payload'

import { assertMigrated } from '../migrate/migrateBase'
import config from '../payload.config'

/**
 * One place whose name in the base is the name it bore in 1100 (CMS-495, `files/plans/contribution/noms-a-trier.md`,
 * sorted by the coder on 2026-11-23): the place takes its present French name, the old one becomes its name of the
 * time, pointed at by its sheets.
 */
interface PresentName {
  /** The place's id. */
  place: number
  /** Its name in the base, which must still be its French name for anything to change. */
  was: string
  /** Its present French name: Wikidata's French label. */
  today: string
  /** The name of the time, in French — the base's name without the present one in parentheses. */
  periodFr: string
  /** The same name in English, the historical exonym — given from memory by the coder, to be sourced. */
  periodEn: string
}

/** The thirty names of the time of the first list, the variants of spelling left as they are. */
const PRESENT_NAMES: readonly PresentName[] = [
  { place: 97, was: 'Amid', today: 'Diyarbakır', periodFr: 'Amid', periodEn: 'Amida' },
  { place: 67, was: 'Ancyre', today: 'Ankara', periodFr: 'Ancyre', periodEn: 'Ancyra' },
  { place: 50, was: 'Andrinople', today: 'Edirne', periodFr: 'Andrinople', periodEn: 'Adrianople' },
  { place: 27, was: 'Antioche', today: 'Antakya', periodFr: 'Antioche', periodEn: 'Antioch' },
  {
    place: 317,
    was: 'Antivari (Bar)',
    today: 'Stari Bar',
    periodFr: 'Antivari',
    periodEn: 'Antivari',
  },
  { place: 18, was: 'Bougie', today: 'Béjaïa', periodFr: 'Bougie', periodEn: 'Bougie' },
  { place: 319, was: 'Cattaro (Kotor)', today: 'Kotor', periodFr: 'Cattaro', periodEn: 'Cattaro' },
  {
    place: 41,
    was: 'Césarée de Cappadoce',
    today: 'Kayseri',
    periodFr: 'Césarée de Cappadoce',
    periodEn: 'Caesarea in Cappadocia',
  },
  {
    place: 318,
    was: 'Dulcigno (Ulcinj)',
    today: 'Ulcinj',
    periodFr: 'Dulcigno',
    periodEn: 'Dulcigno',
  },
  { place: 66, was: 'Durazzo', today: 'Durrës', periodFr: 'Durazzo', periodEn: 'Dyrrachium' },
  { place: 28, was: 'Édesse', today: 'Şanlıurfa', periodFr: 'Édesse', periodEn: 'Edessa' },
  { place: 34, was: 'Iconium', today: 'Konya', periodFr: 'Iconium', periodEn: 'Iconium' },
  { place: 1258, was: 'Lubusz', today: 'Lebus', periodFr: 'Lubusz', periodEn: 'Lubusz' },
  { place: 40, was: 'Nicée', today: 'İznik', periodFr: 'Nicée', periodEn: 'Nicaea' },
  { place: 87, was: 'Nidaros', today: 'Trondheim', periodFr: 'Nidaros', periodEn: 'Nidaros' },
  {
    place: 52,
    was: 'Philippopolis',
    today: 'Plovdiv',
    periodFr: 'Philippopolis',
    periodEn: 'Philippopolis',
  },
  {
    place: 72,
    was: 'Presbourg',
    today: 'Bratislava',
    periodFr: 'Presbourg',
    periodEn: 'Pressburg',
  },
  {
    place: 320,
    was: 'Raguse (Dubrovnik)',
    today: 'Dubrovnik',
    periodFr: 'Raguse',
    periodEn: 'Ragusa',
  },
  { place: 90, was: 'Riazan', today: 'Vieille Riazan', periodFr: 'Riazan', periodEn: 'Ryazan' },
  {
    place: 304,
    was: 'Sagonte (Murviedro)',
    today: 'Sagonte',
    periodFr: 'Murviedro',
    periodEn: 'Murviedro',
  },
  {
    place: 316,
    was: 'Scutari (Shkodër)',
    today: 'Shkodër',
    periodFr: 'Scutari',
    periodEn: 'Scutari',
  },
  { place: 26, was: 'Sébaste', today: 'Sivas', periodFr: 'Sébaste', periodEn: 'Sebasteia' },
  {
    place: 315,
    was: 'Sirmium (Sremska Mitrovica)',
    today: 'Sremska Mitrovica',
    periodFr: 'Sirmium',
    periodEn: 'Sirmium',
  },
  { place: 58, was: 'Smyrne', today: 'Izmir', periodFr: 'Smyrne', periodEn: 'Smyrna' },
  { place: 57, was: 'Trébizonde', today: 'Trabzon', periodFr: 'Trébizonde', periodEn: 'Trebizond' },
  {
    place: 225,
    was: 'Sangüesa la Vieja (Rocaforte)',
    today: 'Rocaforte',
    periodFr: 'Sangüesa la Vieja',
    periodEn: 'Sangüesa la Vieja',
  },
  {
    place: 178,
    was: "Empúries (Sant Martí d'Empúries)",
    today: "Sant Martí d'Empúries",
    periodFr: 'Empúries',
    periodEn: 'Empúries',
  },
  { place: 306, was: 'Ras (Stari Ras)', today: 'Stari Ras', periodFr: 'Ras', periodEn: 'Ras' },
  {
    place: 274,
    was: "Escarp (La Granja d'Escarp)",
    today: "La Granja d'Escarp",
    periodFr: 'Escarp',
    periodEn: 'Escarp',
  },
  {
    place: 962,
    was: 'Branjin Vrh (Baranyavár)',
    today: 'Branjin Vrh',
    periodFr: 'Baranyavár',
    periodEn: 'Baranyavár',
  },
]

/**
 * Give the thirty places their present name and their name of the time (`payload run src/seed/presentNames.ts`,
 * from `packages/cms`, `DATABASE_URL` absolute) — once. Through Payload's Local API, so the sheets are retitled by the place's hook and the name of
 * the time passes the same rules as the form. A place that no longer bears its old name, or that already has a name
 * of the time, is left as it is and said; a refusal stops the run, named.
 */
const payload = await getPayload({ config })
await assertMigrated(payload, await readMigrationFiles({ payload }))
let done = 0
for (const entry of PRESENT_NAMES) {
  const place = await payload.findByID({
    collection: 'places',
    id: entry.place,
    depth: 0,
    locale: 'fr',
  })
  const existing = await payload.find({
    collection: 'period-names',
    where: { place: { equals: entry.place } },
    depth: 0,
    limit: 1,
  })
  if (place.name !== entry.was || existing.totalDocs > 0) {
    console.warn(`[CMS] place ${String(entry.place)} « ${place.name} »: left as it is`)
    continue
  }
  const periodName = await payload.create({
    collection: 'period-names',
    data: {
      place: entry.place,
      forms: [
        { language: 'fr', form: entry.periodFr },
        { language: 'en', form: entry.periodEn },
      ],
    },
  })
  await payload.update({
    collection: 'places',
    id: entry.place,
    data: { name: entry.today },
    locale: 'fr',
  })
  const sheets = await payload.find({
    collection: 'place-periods',
    where: { place: { equals: entry.place } },
    depth: 0,
    pagination: false,
  })
  for (const sheet of sheets.docs) {
    await payload.update({
      collection: 'place-periods',
      id: sheet.id,
      data: { periodName: periodName.id },
    })
  }
  done += 1
}
console.warn(`[CMS] places given their present name and their name of the time: ${String(done)}`)
process.exit(0)
