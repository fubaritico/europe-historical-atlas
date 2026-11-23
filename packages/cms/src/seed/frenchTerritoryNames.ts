import { getPayload, readMigrationFiles } from 'payload'

import { assertMigrated } from '../migrate/migrateBase'
import config from '../payload.config'

/**
 * One territory whose « Nom » — the register's French name — was entered in another language (CMS-495, the countries
 * in French, the dev's go of 2026-11-23: _"rename what you must rename"_). Its English line, in the table of other
 * names, is left as it is.
 */
interface FrenchName {
  /** The territory's id. */
  territory: number
  /** Its name in the base, which must still be its name for anything to change. */
  was: string
  /** Its French name — the coder's translation, for the historian to reread. */
  fr: string
}

/**
 * The territories named in English, German, Italian or Czech on 2026-11-23, read in the base. Kept as they are: the
 * names French also uses (the Gaue, Huysburg, Rab, Labourd, Ostmark), and the capitals of « Royaume d'Aragon » and
 * the like — a matter of typography, not of language.
 */
const FRENCH_NAMES: readonly FrenchName[] = [
  { territory: 10, was: 'Lordship of Valencia', fr: 'seigneurie de Valence' },
  { territory: 51, was: 'County of Conversano', fr: 'comté de Conversano' },
  { territory: 73, was: 'County of Bojano', fr: 'comté de Bojano' },
  { territory: 85, was: 'comte de Corbeil', fr: 'comté de Corbeil' },
  { territory: 86, was: 'County of Périgord', fr: 'comté de Périgord' },
  { territory: 100, was: 'Duchy of Poland', fr: 'duché de Pologne' },
  { territory: 117, was: 'Diocese of Meissen', fr: 'diocèse de Misnie' },
  { territory: 144, was: 'Conti di Biandrate', fr: 'comtes de Biandrate' },
  { territory: 150, was: 'Duchy (Kingdom of Hungary)', fr: 'duché (royaume de Hongrie)' },
  { territory: 159, was: 'Sharifate of Medina', fr: 'chérifat de Médine' },
  { territory: 167, was: 'countship of Formbach', fr: 'comté de Formbach' },
  { territory: 170, was: 'Szekszárd Abbey', fr: 'abbaye de Szekszárd' },
  { territory: 171, was: 'abbaye de St Bavon', fr: 'abbaye Saint-Bavon de Gand' },
  {
    territory: 174,
    was: 'Republic of Ragusa (the later polity of the city)',
    fr: "république de Raguse (l'État ultérieur de la ville)",
  },
  { territory: 177, was: 'Bursfelde Abbey', fr: 'abbaye de Bursfelde' },
  { territory: 181, was: 'Inalids', fr: 'Inalides' },
  { territory: 185, was: 'Bosnia (early medieval)', fr: 'Bosnie (haut Moyen Âge)' },
  { territory: 190, was: 'County of Clermont-en-Argonne', fr: 'comté de Clermont-en-Argonne' },
  { territory: 199, was: 'Marchese di Milano', fr: 'marche de Milan' },
  { territory: 200, was: 'Repubblica Astese', fr: "république d'Asti" },
  { territory: 201, was: 'viscountcy of Osona', fr: "vicomté d'Osona" },
  { territory: 208, was: 'Principality of Terebovlia', fr: 'principauté de Terebovl' },
  { territory: 217, was: 'County of Weimar-Orlamünde', fr: 'comté de Weimar-Orlamünde' },
  { territory: 225, was: 'Roman Catholic Diocese of Pesto', fr: 'diocèse de Paestum' },
  { territory: 230, was: 'Almoravid dynasty', fr: 'Almoravides' },
  { territory: 231, was: 'Duchy of Bavaria', fr: 'duché de Bavière' },
  { territory: 232, was: 'County of Nantes', fr: 'comté de Nantes' },
  { territory: 233, was: 'Land Budissin', fr: 'pays de Budissin' },
  { territory: 234, was: 'Duchy of Brittany', fr: 'duché de Bretagne' },
  {
    territory: 235,
    was: 'Greater Poland with Kuyavia and Łęczyca-Sieradz',
    fr: 'Grande-Pologne avec la Cujavie et Łęczyca-Sieradz',
  },
  { territory: 236, was: 'Viscounty of Marseille', fr: 'vicomté de Marseille' },
  { territory: 238, was: 'Viscounty of Carcassonne', fr: 'vicomté de Carcassonne' },
  {
    territory: 239,
    was: 'Principality of Novgorod-Seversky',
    fr: 'principauté de Novgorod-Severski',
  },
  { territory: 240, was: 'Silesia', fr: 'Silésie' },
  { territory: 241, was: 'Marca di Savona', fr: 'marche de Savone' },
  { territory: 242, was: 'County of Verona', fr: 'comté de Vérone' },
  {
    territory: 244,
    was: 'Archbishopric and county of Vienne',
    fr: 'archevêché et comté de Vienne',
  },
  { territory: 245, was: 'County of Geneva', fr: 'comté de Genève' },
  { territory: 246, was: 'County of Blois', fr: 'comté de Blois' },
  {
    territory: 247,
    was: 'County of Clermont-en-Beauvaisis',
    fr: 'comté de Clermont-en-Beauvaisis',
  },
  { territory: 248, was: 'Danishmendids', fr: 'Danichmendides' },
  { territory: 252, was: 'Duchy of Saxony', fr: 'duché de Saxe' },
  { territory: 253, was: 'Lordship of Sangerhausen', fr: 'seigneurie de Sangerhausen' },
  { territory: 254, was: 'County of Auvergne', fr: "comté d'Auvergne" },
  { territory: 255, was: 'Duchy of Swabia', fr: 'duché de Souabe' },
  {
    territory: 256,
    was: 'Duchy of Haute-Lotharingie (Lorraine)',
    fr: 'duché de Haute-Lotharingie (Lorraine)',
  },
  { territory: 257, was: 'County of Boulogne', fr: 'comté de Boulogne' },
  { territory: 258, was: 'County of Maine', fr: 'comté du Maine' },
  { territory: 259, was: 'Viscounty of Nice', fr: 'vicomté de Nice' },
  { territory: 261, was: 'Principality of Novgorod', fr: 'principauté de Novgorod' },
  { territory: 262, was: 'Diocese of Paris', fr: 'diocèse de Paris' },
  { territory: 263, was: 'Archdiocese of Lyon', fr: 'archidiocèse de Lyon' },
  { territory: 264, was: 'County of Rethel', fr: 'comté de Rethel' },
  { territory: 265, was: 'Lordship of Bâgé', fr: 'seigneurie de Bâgé' },
  { territory: 266, was: 'Lordship of Avesnes', fr: "seigneurie d'Avesnes" },
  { territory: 267, was: 'Northern March', fr: 'marche du Nord' },
  { territory: 268, was: 'County of Beichlingen', fr: 'comté de Beichlingen' },
  { territory: 292, was: 'county of Sabbioneta', fr: 'comté de Sabbioneta' },
  { territory: 294, was: 'county of Bolzano', fr: 'comté de Bolzano' },
  { territory: 295, was: 'county of Rota', fr: 'comté de Rota' },
  { territory: 296, was: 'county of the Alberti at Prato', fr: 'comté des Alberti à Prato' },
  { territory: 297, was: 'county of the Aldobrandeschi', fr: 'comté des Aldobrandeschi' },
  { territory: 298, was: 'county of the Guidi', fr: 'comté des Guidi' },
  {
    territory: 300,
    was: 'county of the Cadolingi at Fucecchio',
    fr: 'comté des Cadolingi à Fucecchio',
  },
  { territory: 301, was: 'Principality of Peremyshl', fr: 'principauté de Peremychl' },
  { territory: 302, was: 'Grafschaft Dießen', fr: 'comté de Dießen' },
  {
    territory: 303,
    was: 'the Goseck inheritance at Zscheiplitz',
    fr: "l'héritage de Goseck à Zscheiplitz",
  },
  { territory: 304, was: 'County Palatine of Saxony', fr: 'comté palatin de Saxe' },
  { territory: 305, was: 'Olomoucký úděl', fr: "apanage d'Olomouc" },
  { territory: 306, was: 'county of Wettin', fr: 'comté de Wettin' },
  { territory: 307, was: 'burgraviate of Magdeburg', fr: 'burgraviat de Magdebourg' },
  {
    territory: 309,
    was: 'Tunis, the Khurasanid principality',
    fr: 'Tunis, la principauté khorassanide',
  },
  { territory: 310, was: 'Zirid emirate of Ifriqiya', fr: "émirat ziride d'Ifriqiya" },
  { territory: 311, was: 'Hronský Beňadik monastery', fr: 'monastère de Hronský Beňadik' },
  {
    territory: 312,
    was: 'Pannonhalma Archabbey and its lands',
    fr: 'archiabbaye de Pannonhalma et ses terres',
  },
  { territory: 313, was: 'Százd abbey', fr: 'abbaye de Százd' },
  { territory: 314, was: 'Bakonybél Abbey and its lands', fr: 'abbaye de Bakonybél et ses terres' },
  { territory: 315, was: 'Pécsvárad Abbey and its lands', fr: 'abbaye de Pécsvárad et ses terres' },
  {
    territory: 316,
    was: 'Michaelsberg Abbey, Bamberg and its lands',
    fr: 'abbaye du Michaelsberg de Bamberg et ses terres',
  },
  { territory: 317, was: 'Nienburg Abbey and its lands', fr: 'abbaye de Nienburg et ses terres' },
  { territory: 319, was: 'diocese of Knin', fr: 'diocèse de Knin' },
  { territory: 320, was: 'principality', fr: 'principauté de Zaslavl' },
  { territory: 325, was: 'Ostrov Abbey', fr: "abbaye d'Ostrov" },
  { territory: 327, was: 'Kingdom of Galicia', fr: 'royaume de Galice' },
  { territory: 328, was: 'see of Eger', fr: "évêché d'Eger" },
  { territory: 329, was: 'see of Transylvania', fr: 'évêché de Transylvanie' },
  { territory: 330, was: 'see of Vác', fr: 'évêché de Vác' },
  {
    territory: 331,
    was: "St Peter's Abbey on the Altenburg, Merseburg",
    fr: "abbaye Saint-Pierre de l'Altenburg, à Mersebourg",
  },
  { territory: 332, was: 'County of Penthièvre', fr: 'comté de Penthièvre' },
  { territory: 333, was: 'Benedictine abbey of Tihany', fr: 'abbaye bénédictine de Tihany' },
  { territory: 336, was: 'Abbasid Caliphate', fr: 'califat abbasside' },
  {
    territory: 337,
    was: 'abbey of Sahagún, lord of the town',
    fr: 'abbaye de Sahagún, seigneur de la ville',
  },
  {
    territory: 338,
    was: 'see of Palencia, lord of the city',
    fr: 'évêché de Palencia, seigneur de la ville',
  },
  {
    territory: 340,
    was: 'lordship and advocacy of Béthune',
    fr: 'seigneurie et avouerie de Béthune',
  },
  { territory: 341, was: 'viscounty of Marsan', fr: 'vicomté de Marsan' },
  { territory: 343, was: 'Elsass', fr: 'Alsace' },
]

/**
 * Give the territories their French name (`payload run src/seed/frenchTerritoryNames.ts`, from `packages/cms`,
 * `DATABASE_URL` absolute) — once. Through Payload's Local API, so the titles and the links that cite a territory are
 * renamed by its hook and the record passes the same rules as the form. A territory that no longer bears its old name
 * is left as it is and said. A refusal of Payload, or a territory deleted since, stops the run with Payload's own
 * error, which does not name the territory: the renames before it stay done, and a second run skips them by their
 * old name.
 */
const payload = await getPayload({ config })
await assertMigrated(payload, await readMigrationFiles({ payload }))
let done = 0
for (const entry of FRENCH_NAMES) {
  const territory = await payload.findByID({
    collection: 'territories',
    id: entry.territory,
    depth: 0,
  })
  if (territory.name !== entry.was) {
    console.warn(`[CMS] territory ${String(entry.territory)} « ${territory.name} »: left as it is`)
    continue
  }
  await payload.update({
    collection: 'territories',
    id: entry.territory,
    data: { name: entry.fr },
  })
  done += 1
}
console.warn(
  `[CMS] territories given their French name: ${String(done)} of ${String(FRENCH_NAMES.length)}`
)
process.exit(0)
