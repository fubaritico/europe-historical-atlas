import { getPayload, readMigrationFiles } from 'payload'

import { assertMigrated } from '../migrate/migrateBase'
import config from '../payload.config'

import { renameRecords } from './renameRecords'

import type { Rename } from './renameRecords'

/**
 * The territories whose « Nom » — the register's French name — was entered in another language (CMS-495, the dev's
 * go of 2026-11-23: _"rename what you must rename"_), read in the base that day: English, German, Italian, Czech.
 * Their English line is left as it is; the translations are the coder's, for the historian to reread. Kept as they are: the
 * names French also uses (the Gaue, Huysburg, Rab, Labourd, Ostmark), and the capitals of « Royaume d'Aragon » and
 * the like — a matter of typography, not of language.
 */
const FRENCH_NAMES: readonly Rename[] = [
  { id: 10, was: 'Lordship of Valencia', now: 'seigneurie de Valence' },
  { id: 51, was: 'County of Conversano', now: 'comté de Conversano' },
  { id: 73, was: 'County of Bojano', now: 'comté de Bojano' },
  { id: 85, was: 'comte de Corbeil', now: 'comté de Corbeil' },
  { id: 86, was: 'County of Périgord', now: 'comté de Périgord' },
  { id: 100, was: 'Duchy of Poland', now: 'duché de Pologne' },
  { id: 117, was: 'Diocese of Meissen', now: 'diocèse de Misnie' },
  { id: 144, was: 'Conti di Biandrate', now: 'comtes de Biandrate' },
  { id: 150, was: 'Duchy (Kingdom of Hungary)', now: 'duché (royaume de Hongrie)' },
  { id: 159, was: 'Sharifate of Medina', now: 'chérifat de Médine' },
  { id: 167, was: 'countship of Formbach', now: 'comté de Formbach' },
  { id: 170, was: 'Szekszárd Abbey', now: 'abbaye de Szekszárd' },
  { id: 171, was: 'abbaye de St Bavon', now: 'abbaye Saint-Bavon de Gand' },
  {
    id: 174,
    was: 'Republic of Ragusa (the later polity of the city)',
    now: "république de Raguse (l'État ultérieur de la ville)",
  },
  { id: 177, was: 'Bursfelde Abbey', now: 'abbaye de Bursfelde' },
  { id: 181, was: 'Inalids', now: 'Inalides' },
  { id: 185, was: 'Bosnia (early medieval)', now: 'Bosnie (haut Moyen Âge)' },
  { id: 190, was: 'County of Clermont-en-Argonne', now: 'comté de Clermont-en-Argonne' },
  { id: 199, was: 'Marchese di Milano', now: 'marche de Milan' },
  { id: 200, was: 'Repubblica Astese', now: "république d'Asti" },
  { id: 201, was: 'viscountcy of Osona', now: "vicomté d'Osona" },
  { id: 208, was: 'Principality of Terebovlia', now: 'principauté de Terebovl' },
  { id: 217, was: 'County of Weimar-Orlamünde', now: 'comté de Weimar-Orlamünde' },
  { id: 225, was: 'Roman Catholic Diocese of Pesto', now: 'diocèse de Paestum' },
  { id: 230, was: 'Almoravid dynasty', now: 'Almoravides' },
  { id: 231, was: 'Duchy of Bavaria', now: 'duché de Bavière' },
  { id: 232, was: 'County of Nantes', now: 'comté de Nantes' },
  { id: 233, was: 'Land Budissin', now: 'pays de Budissin' },
  { id: 234, was: 'Duchy of Brittany', now: 'duché de Bretagne' },
  {
    id: 235,
    was: 'Greater Poland with Kuyavia and Łęczyca-Sieradz',
    now: 'Grande-Pologne avec la Cujavie et Łęczyca-Sieradz',
  },
  { id: 236, was: 'Viscounty of Marseille', now: 'vicomté de Marseille' },
  { id: 238, was: 'Viscounty of Carcassonne', now: 'vicomté de Carcassonne' },
  {
    id: 239,
    was: 'Principality of Novgorod-Seversky',
    now: 'principauté de Novgorod-Severski',
  },
  { id: 240, was: 'Silesia', now: 'Silésie' },
  { id: 241, was: 'Marca di Savona', now: 'marche de Savone' },
  { id: 242, was: 'County of Verona', now: 'comté de Vérone' },
  {
    id: 244,
    was: 'Archbishopric and county of Vienne',
    now: 'archevêché et comté de Vienne',
  },
  { id: 245, was: 'County of Geneva', now: 'comté de Genève' },
  { id: 246, was: 'County of Blois', now: 'comté de Blois' },
  {
    id: 247,
    was: 'County of Clermont-en-Beauvaisis',
    now: 'comté de Clermont-en-Beauvaisis',
  },
  { id: 248, was: 'Danishmendids', now: 'Danichmendides' },
  { id: 252, was: 'Duchy of Saxony', now: 'duché de Saxe' },
  { id: 253, was: 'Lordship of Sangerhausen', now: 'seigneurie de Sangerhausen' },
  { id: 254, was: 'County of Auvergne', now: "comté d'Auvergne" },
  { id: 255, was: 'Duchy of Swabia', now: 'duché de Souabe' },
  {
    id: 256,
    was: 'Duchy of Haute-Lotharingie (Lorraine)',
    now: 'duché de Haute-Lotharingie (Lorraine)',
  },
  { id: 257, was: 'County of Boulogne', now: 'comté de Boulogne' },
  { id: 258, was: 'County of Maine', now: 'comté du Maine' },
  { id: 259, was: 'Viscounty of Nice', now: 'vicomté de Nice' },
  { id: 261, was: 'Principality of Novgorod', now: 'principauté de Novgorod' },
  { id: 262, was: 'Diocese of Paris', now: 'diocèse de Paris' },
  { id: 263, was: 'Archdiocese of Lyon', now: 'archidiocèse de Lyon' },
  { id: 264, was: 'County of Rethel', now: 'comté de Rethel' },
  { id: 265, was: 'Lordship of Bâgé', now: 'seigneurie de Bâgé' },
  { id: 266, was: 'Lordship of Avesnes', now: "seigneurie d'Avesnes" },
  { id: 267, was: 'Northern March', now: 'marche du Nord' },
  { id: 268, was: 'County of Beichlingen', now: 'comté de Beichlingen' },
  { id: 292, was: 'county of Sabbioneta', now: 'comté de Sabbioneta' },
  { id: 294, was: 'county of Bolzano', now: 'comté de Bolzano' },
  { id: 295, was: 'county of Rota', now: 'comté de Rota' },
  { id: 296, was: 'county of the Alberti at Prato', now: 'comté des Alberti à Prato' },
  { id: 297, was: 'county of the Aldobrandeschi', now: 'comté des Aldobrandeschi' },
  { id: 298, was: 'county of the Guidi', now: 'comté des Guidi' },
  {
    id: 300,
    was: 'county of the Cadolingi at Fucecchio',
    now: 'comté des Cadolingi à Fucecchio',
  },
  { id: 301, was: 'Principality of Peremyshl', now: 'principauté de Peremychl' },
  { id: 302, was: 'Grafschaft Dießen', now: 'comté de Dießen' },
  {
    id: 303,
    was: 'the Goseck inheritance at Zscheiplitz',
    now: "l'héritage de Goseck à Zscheiplitz",
  },
  { id: 304, was: 'County Palatine of Saxony', now: 'comté palatin de Saxe' },
  { id: 305, was: 'Olomoucký úděl', now: "apanage d'Olomouc" },
  { id: 306, was: 'county of Wettin', now: 'comté de Wettin' },
  { id: 307, was: 'burgraviate of Magdeburg', now: 'burgraviat de Magdebourg' },
  {
    id: 309,
    was: 'Tunis, the Khurasanid principality',
    now: 'Tunis, la principauté khorassanide',
  },
  { id: 310, was: 'Zirid emirate of Ifriqiya', now: "émirat ziride d'Ifriqiya" },
  { id: 311, was: 'Hronský Beňadik monastery', now: 'monastère de Hronský Beňadik' },
  {
    id: 312,
    was: 'Pannonhalma Archabbey and its lands',
    now: 'archiabbaye de Pannonhalma et ses terres',
  },
  { id: 313, was: 'Százd abbey', now: 'abbaye de Százd' },
  { id: 314, was: 'Bakonybél Abbey and its lands', now: 'abbaye de Bakonybél et ses terres' },
  { id: 315, was: 'Pécsvárad Abbey and its lands', now: 'abbaye de Pécsvárad et ses terres' },
  {
    id: 316,
    was: 'Michaelsberg Abbey, Bamberg and its lands',
    now: 'abbaye du Michaelsberg de Bamberg et ses terres',
  },
  { id: 317, was: 'Nienburg Abbey and its lands', now: 'abbaye de Nienburg et ses terres' },
  { id: 319, was: 'diocese of Knin', now: 'diocèse de Knin' },
  { id: 320, was: 'principality', now: 'principauté de Zaslavl' },
  { id: 325, was: 'Ostrov Abbey', now: "abbaye d'Ostrov" },
  { id: 327, was: 'Kingdom of Galicia', now: 'royaume de Galice' },
  { id: 328, was: 'see of Eger', now: "évêché d'Eger" },
  { id: 329, was: 'see of Transylvania', now: 'évêché de Transylvanie' },
  { id: 330, was: 'see of Vác', now: 'évêché de Vác' },
  {
    id: 331,
    was: "St Peter's Abbey on the Altenburg, Merseburg",
    now: "abbaye Saint-Pierre de l'Altenburg, à Mersebourg",
  },
  { id: 332, was: 'County of Penthièvre', now: 'comté de Penthièvre' },
  { id: 333, was: 'Benedictine abbey of Tihany', now: 'abbaye bénédictine de Tihany' },
  { id: 336, was: 'Abbasid Caliphate', now: 'califat abbasside' },
  {
    id: 337,
    was: 'abbey of Sahagún, lord of the town',
    now: 'abbaye de Sahagún, seigneur de la ville',
  },
  {
    id: 338,
    was: 'see of Palencia, lord of the city',
    now: 'évêché de Palencia, seigneur de la ville',
  },
  {
    id: 340,
    was: 'lordship and advocacy of Béthune',
    now: 'seigneurie et avouerie de Béthune',
  },
  { id: 341, was: 'viscounty of Marsan', now: 'vicomté de Marsan' },
  { id: 343, was: 'Elsass', now: 'Alsace' },
]

/**
 * Give the territories their French name (`payload run src/seed/frenchTerritoryNames.ts`, from `packages/cms`,
 * `DATABASE_URL` absolute) — once; the titles and the links that cite a territory are renamed by its hook. Run on
 * 2026-11-23; a second run renames nothing and says so for each.
 */
const payload = await getPayload({ config })
await assertMigrated(payload, await readMigrationFiles({ payload }))
const done = await renameRecords(payload, 'territories', FRENCH_NAMES)
console.warn(
  `[CMS] territories given their French name: ${String(done)} of ${String(FRENCH_NAMES.length)}`
)
process.exit(0)
