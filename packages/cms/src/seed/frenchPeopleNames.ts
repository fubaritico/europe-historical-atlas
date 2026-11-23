import { getPayload, readMigrationFiles } from 'payload'

import { assertMigrated } from '../migrate/migrateBase'
import config from '../payload.config'

import { renameRecords } from './renameRecords'

import type { Rename } from './renameRecords'

/**
 * The people and houses whose « Nom » — the register's French name — was entered in English or German, read in the
 * base on 2026-11-23 (CMS-495, the dev's go: _"yes"_, after the territories); and four Russian names transliterated
 * the English way. Their English line is left as it is. The translations are the coder's, for the historian to
 * reread. Kept as they are: the native forms French also uses — Italian, Catalan, Spanish, Slavic (« Alberto di
 * Biandrate », « Pedro Ansúrez ») — and the German names of houses French writes so (« Ludowinger »).
 */
const FRENCH_NAMES: readonly Rename[] = [
  { id: 28, was: 'Herren von Perg und Machland', now: 'seigneurs de Perg et de Machland' },
  { id: 49, was: 'Udonen', now: 'Udonides' },
  { id: 51, was: 'Casata di Collalto', now: 'maison de Collalto' },
  { id: 57, was: 'House of Nordheim', now: 'maison de Nordheim' },
  { id: 67, was: 'countship of Formbach', now: 'comtes de Formbach' },
  { id: 136, was: 'Tancred of Conversano', now: 'Tancrède de Conversano' },
  { id: 144, was: 'Beringer of Schauenburg', now: 'Beringer de Schauenburg' },
  { id: 156, was: 'Ulrich von Eppenstein', now: "Ulrich d'Eppenstein" },
  { id: 182, was: 'Hermann von Spanheim', now: 'Hermann de Spanheim' },
  { id: 186, was: 'Gertrude of Haldensleben', now: 'Gertrude de Haldensleben' },
  { id: 196, was: 'Hoyer I. von Mansfeld', now: 'Hoyer Ier de Mansfeld' },
  { id: 239, was: 'Werner II of Spoleto', now: 'Werner II de Spolète' },
  { id: 243, was: 'Vasilko Rostislavich', now: 'Vassilko Rostislavitch' },
  { id: 249, was: 'Iaroslav Sviatopolkovich', now: 'Iaroslav Sviatopolkovitch' },
  { id: 257, was: 'Hugh II, Count of Empúries', now: "Hugues II d'Empúries" },
  { id: 272, was: 'Albuin aus Bayern', now: 'Albuin de Bavière' },
  { id: 281, was: 'Ekbert of Formbach', now: 'Ekbert de Formbach' },
  { id: 285, was: 'Adelheid von Stade', now: 'Adélaïde de Stade' },
  { id: 289, was: 'Richer, Bishop of Verdun', now: 'Richer, évêque de Verdun' },
  { id: 377, was: 'Giselbert von Admont', now: "Giselbert d'Admont" },
  { id: 378, was: 'Świętobor, Duke of Pomerania', now: 'Świętobor, duc de Poméranie' },
  { id: 380, was: 'Seraphin, archbishop of Esztergom', now: "Séraphin, archevêque d'Esztergom" },
  { id: 386, was: 'Friedrich de Goseck', now: 'Frédéric de Goseck' },
  { id: 450, was: 'William of Montfort', now: 'Guillaume de Montfort' },
  { id: 451, was: 'Lothair Udo III', now: 'Lothaire Udon III' },
  { id: 455, was: 'Friedrich de Bozen', now: 'Frédéric de Bozen' },
  { id: 463, was: 'Otto II de Dießen', now: 'Otton II de Dießen' },
  { id: 464, was: 'Otto II the Black', now: 'Otton II le Noir' },
  { id: 465, was: 'Dedo IV of Wettin', now: 'Dedo IV de Wettin' },
  { id: 466, was: 'Konrad of Wettin', now: 'Conrad de Wettin' },
  { id: 473, was: 'David Vseslavich', now: 'David Vseslavitch' },
  { id: 477, was: 'Henry of Burgundy', now: 'Henri de Bourgogne' },
  { id: 479, was: 'Raymond of Burgundy', now: 'Raymond de Bourgogne' },
  { id: 480, was: 'Stephen I of Penthièvre', now: 'Étienne Ier de Penthièvre' },
  { id: 481, was: 'Iaroslav Iaropolkovich', now: 'Iaroslav Iaropolkovitch' },
  { id: 488, was: 'Walram von Naumburg', now: 'Walram de Naumbourg' },
]

/**
 * Give the people their French name (`payload run src/seed/frenchPeopleNames.ts`, from `packages/cms`,
 * `DATABASE_URL` absolute) — once; the titles that cite a person are renamed by its hook.
 */
const payload = await getPayload({ config })
await assertMigrated(payload, await readMigrationFiles({ payload }))
const done = await renameRecords(payload, 'people', FRENCH_NAMES)
console.warn(
  `[CMS] people given their French name: ${String(done)} of ${String(FRENCH_NAMES.length)}`
)
process.exit(0)
