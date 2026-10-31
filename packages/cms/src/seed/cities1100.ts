/* eslint-disable max-lines -- generated data, one record a city: the budget measures code written by hand */
/**
 * The cities of 1100 the seed writes (ATLAS-295, `files/plans/atlas/cities.md`) — **generated** by
 * `files/spikes/city-sources/seed-data.mjs` from the three open sources side by side; edit the script, not this file.
 *
 * The rule (the dev, 2026-10-31): a **capital** where Bosker et al. (2013) say capital; a **large city** where they say
 * archbishopric — in the Middle Ages a religious seat is a political one; a **city** where all three sources give a
 * figure. Every figure and every role is a source line of its own, never averaged; a figure Bosker interpolated
 * between two centuries says so. **The east and the north** (the dev, the same evening): the cities Buringh attests in
 * Hungary, Poland, the Rus' lands and Scandinavia — a capital where Wikidata dates it so over 1100, a city otherwise.
 * The places are named by their Wikidata items, read by the seed as the form does.
 */

import type { SeedPlace, SeedSource } from './year1100'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** What a source line says — the same three subjects as the form, its relations named by what finds them again. */
export type SeedTestimony = (
  | { subject: 'population'; population: number }
  | { subject: 'importance'; importance: CityImportance }
  | { subject: 'reason'; reason: string }
) & {
  /** The title of the source that says it. */
  source: string
  /** Where in the source, or how it gives the figure. */
  where?: string
}

/** A city at a date, its relations named by what finds them again. */
export interface SeedCity {
  /** The Wikidata id of its place. */
  place: string
  /** The year the sheet is for. */
  year: number
  /** Its importance on the map. */
  importance: CityImportance
  /** The French names of the reasons for it. */
  reasons: readonly string[]
  /** What each source says of it. */
  testimonies: readonly SeedTestimony[]
}

/** The three open datasets the figures and roles come from. */
export const CITY_SOURCES: readonly SeedSource[] = [
  {
    title: 'Князівства Київської Русі (1054–1132)',
    author:
      'SeikoEn, traduit par Petriot333 — d’après les cartes de « Літопис руський » (trad. L. Ie. Makhnovets, 1989)',
    publisher: 'Wikimedia Commons',
    editionYear: 2011,
    kind: 'crowd-database',
    url: 'https://commons.wikimedia.org/wiki/File:%D0%9A%D0%B8%D1%97%D0%B2%D1%81%D1%8C%D0%BA%D0%B0%D0%A0%D1%83%D1%81%D1%8C%D0%9A%D0%BD%D1%8F%D0%B7%D1%96%D0%B2%D1%81%D1%82%D0%B2%D0%B0.jpg',
    licence: 'cc-by-sa',
  },
  {
    title: 'Wikidata',
    author: 'Contributeurs de Wikidata',
    publisher: 'Wikimedia Foundation',
    editionYear: 2026,
    kind: 'crowd-database',
    url: 'https://www.wikidata.org',
    licence: 'cc0',
  },
  {
    title:
      'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
    author: 'Maarten Bosker, Eltjo Buringh, Jan Luiten van Zanden',
    publisher: 'Harvard Dataverse',
    editionYear: 2013,
    kind: 'scholarly',
    url: 'https://doi.org/10.7910/DVN/24747',
    licence: 'cc0',
  },
  {
    title: 'European urban population, 700–2000',
    author: 'Eltjo Buringh',
    publisher: 'DANS',
    editionYear: 2021,
    kind: 'scholarly',
    url: 'https://doi.org/10.17026/DANS-XZY-U62Q',
    licence: 'cc0',
  },
  {
    title:
      'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
    author: 'Meredith Reba, Femke Reitsma, Karen C. Seto',
    publisher: 'figshare',
    editionYear: 2016,
    kind: 'scholarly',
    url: 'https://figshare.com/articles/Chandler_Population_Data/2059494',
    licence: 'cc-by',
  },
]

/** The reasons the cities give, by French name. */
export const CITY_REASONS: readonly string[] = ['archevêché', 'université', 'évêché']

/** The places of the cities. */
export const CITY_PLACES: readonly SeedPlace[] = [
  {
    wikidata: 'Q1530',
    name: 'Bagdad',
  },
  {
    wikidata: 'Q16869',
    name: 'Constantinople',
  },
  {
    wikidata: 'Q839456',
    name: 'Fostat',
  },
  {
    wikidata: 'Q101625',
    name: 'Marrakech',
  },
  {
    wikidata: 'Q2656',
    name: 'Palerme',
  },
  {
    wikidata: 'Q8717',
    name: 'Séville',
  },
  {
    wikidata: 'Q5818',
    name: 'Cordoue',
  },
  {
    wikidata: 'Q59975',
    name: 'Bougie',
  },
  {
    wikidata: 'Q90',
    name: 'Paris',
  },
  {
    wikidata: 'Q8810',
    name: 'Grenade',
  },
  {
    wikidata: 'Q641',
    name: 'Venise',
  },
  {
    wikidata: 'Q1083',
    name: 'Salerne',
  },
  {
    wikidata: 'Q17151',
    name: 'Thessalonique',
  },
  {
    wikidata: 'Q490',
    name: 'Milan',
  },
  {
    wikidata: 'Q87',
    name: 'Alexandrie',
  },
  {
    wikidata: 'Q107401',
    name: 'Sébaste',
  },
  {
    wikidata: 'Q80561',
    name: 'Antioche',
  },
  {
    wikidata: 'Q133118',
    name: 'Édesse',
  },
  {
    wikidata: 'Q3766',
    name: 'Damas',
  },
  {
    wikidata: 'Q365',
    name: 'Cologne',
  },
  {
    wikidata: 'Q220',
    name: 'Rome',
  },
  {
    wikidata: 'Q5836',
    name: 'Tolède',
  },
  {
    wikidata: 'Q84',
    name: 'Londres',
  },
  {
    wikidata: 'Q2634',
    name: 'Naples',
  },
  {
    wikidata: 'Q79857',
    name: 'Iconium',
  },
  {
    wikidata: 'Q47611',
    name: 'Éphèse',
  },
  {
    wikidata: 'Q1720',
    name: 'Mayence',
  },
  {
    wikidata: 'Q8826',
    name: 'Palma',
  },
  {
    wikidata: 'Q10400',
    name: 'Almería',
  },
  {
    wikidata: 'Q15699',
    name: 'León',
  },
  {
    wikidata: 'Q217125',
    name: 'Nicée',
  },
  {
    wikidata: 'Q48338',
    name: 'Césarée de Cappadoce',
  },
  {
    wikidata: 'Q1218',
    name: 'Jérusalem',
  },
  {
    wikidata: 'Q6555',
    name: 'Narbonne',
  },
  {
    wikidata: 'Q3138',
    name: 'Trèves',
  },
  {
    wikidata: 'Q456',
    name: 'Lyon',
  },
  {
    wikidata: 'Q22690',
    name: 'Metz',
  },
  {
    wikidata: 'Q6616',
    name: 'Poitiers',
  },
  {
    wikidata: 'Q30974',
    name: 'Rouen',
  },
  {
    wikidata: 'Q8818',
    name: 'Valence',
  },
  {
    wikidata: 'Q10305',
    name: 'Saragosse',
  },
  {
    wikidata: 'Q43387',
    name: 'Andrinople',
  },
  {
    wikidata: 'Q82070',
    name: 'Tyr',
  },
  {
    wikidata: 'Q459',
    name: 'Philippopolis',
  },
  {
    wikidata: 'Q6221',
    name: 'Brescia',
  },
  {
    wikidata: 'Q7880',
    name: 'Toulouse',
  },
  {
    wikidata: 'Q1729',
    name: 'Erfurt',
  },
  {
    wikidata: 'Q8851',
    name: 'Malaga',
  },
  {
    wikidata: 'Q45301',
    name: 'Trébizonde',
  },
  {
    wikidata: 'Q35997',
    name: 'Smyrne',
  },
  {
    wikidata: 'Q168954',
    name: 'Tripoli',
  },
  {
    wikidata: 'Q41876',
    name: 'Reims',
  },
  {
    wikidata: 'Q42462',
    name: 'York',
  },
  {
    wikidata: 'Q1085',
    name: 'Prague',
  },
  {
    wikidata: 'Q48292',
    name: 'Arles',
  },
  {
    wikidata: 'Q134287',
    name: 'Tarse',
  },
  {
    wikidata: 'Q1223508',
    name: 'Ohrid',
  },
  {
    wikidata: 'Q83285',
    name: 'Durazzo',
  },
  {
    wikidata: 'Q3640',
    name: 'Ancyre',
  },
  {
    wikidata: 'Q171353',
    name: 'Esztergom',
  },
  {
    wikidata: 'Q130212',
    name: 'Székesfehérvár',
  },
  {
    wikidata: 'Q134494',
    name: 'Győr',
  },
  {
    wikidata: 'Q26397',
    name: 'Nitra',
  },
  {
    wikidata: 'Q1780',
    name: 'Presbourg',
  },
  {
    wikidata: 'Q31487',
    name: 'Cracovie',
  },
  {
    wikidata: 'Q51432',
    name: 'Gniezno',
  },
  {
    wikidata: 'Q104725',
    name: 'Płock',
  },
  {
    wikidata: 'Q268',
    name: 'Poznań',
  },
  {
    wikidata: 'Q1792',
    name: 'Gdańsk',
  },
  {
    wikidata: 'Q1899',
    name: 'Kiev',
  },
  {
    wikidata: 'Q2235',
    name: 'Novgorod',
  },
  {
    wikidata: 'Q157053',
    name: 'Tchernigov',
  },
  {
    wikidata: 'Q2337',
    name: 'Smolensk',
  },
  {
    wikidata: 'Q200797',
    name: 'Polotsk',
  },
  {
    wikidata: 'Q193342',
    name: 'Rostov',
  },
  {
    wikidata: 'Q2214',
    name: 'Pskov',
  },
  {
    wikidata: 'Q26563',
    name: 'Roskilde',
  },
  {
    wikidata: 'Q2167',
    name: 'Lund',
  },
  {
    wikidata: 'Q25804',
    name: 'Nidaros',
  },
  {
    wikidata: 'Q26793',
    name: 'Bergen',
  },
  {
    wikidata: 'Q3159',
    name: 'Koursk',
  },
  {
    wikidata: 'Q4439776',
    name: 'Riazan',
  },
  {
    wikidata: 'Q162677',
    name: 'Mourom',
  },
  {
    wikidata: 'Q2684',
    name: 'Vladimir',
  },
  {
    wikidata: 'Q102217',
    name: 'Vitebsk',
  },
  {
    wikidata: 'Q131416',
    name: 'Derbent',
  },
  {
    wikidata: 'Q230104',
    name: 'Nakhitchevan',
  },
  {
    wikidata: 'Q636188',
    name: 'Rayy',
  },
  {
    wikidata: 'Q48195',
    name: 'Bassora',
  },
  {
    wikidata: 'Q83387',
    name: 'Amid',
  },
  {
    wikidata: 'Q283368',
    name: 'Raqqa',
  },
  {
    wikidata: 'Q186234',
    name: 'Koufa',
  },
  {
    wikidata: 'Q131350',
    name: 'Nichapour',
  },
  {
    wikidata: 'Q171714',
    name: 'Kerman',
  },
  {
    wikidata: 'Q1761',
    name: 'Dublin',
  },
  {
    wikidata: 'Q193452',
    name: 'Armagh',
  },
  {
    wikidata: 'Q36647',
    name: 'Cork',
  },
  {
    wikidata: 'Q183551',
    name: 'Waterford',
  },
  {
    wikidata: 'Q133315',
    name: 'Limerick',
  },
  {
    wikidata: 'Q23436',
    name: 'Édimbourg',
  },
  {
    wikidata: 'Q207736',
    name: 'Saint Andrews',
  },
  {
    wikidata: 'Q170263',
    name: 'Chester',
  },
  {
    wikidata: 'Q204720',
    name: 'Hereford',
  },
  {
    wikidata: 'Q201970',
    name: 'Shrewsbury',
  },
  {
    wikidata: 'Q25412',
    name: 'Västerås',
  },
  {
    wikidata: 'Q54757',
    name: 'Visby',
  },
  {
    wikidata: 'Q26345',
    name: 'Kalmar',
  },
  {
    wikidata: 'Q639839',
    name: 'Pereïaslav',
  },
  {
    wikidata: 'Q15757',
    name: 'Souzdal',
  },
  {
    wikidata: 'Q33544',
    name: 'Volodymyr',
  },
  {
    wikidata: 'Q146450',
    name: 'Halitch',
  },
  {
    wikidata: 'Q910505',
    name: 'Tmoutarakan',
  },
  {
    wikidata: 'Q1068190',
    name: 'Sarkel',
  },
]

/** The cities of 1100. */
export const CITIES_1100: readonly SeedCity[] = [
  {
    place: 'Q1530',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 250000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 150000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q16869',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché', 'université'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'université',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 200000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 200000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 200000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q839456',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché', 'université'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'université',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 150000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 150000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q101625',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 70000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 150000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q2656',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 40000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 42000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 90000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q8717',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 85000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 76000,
        where: '1100, estimée d’après un indice',
      },
    ],
  },
  {
    place: 'Q5818',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 80000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 80000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 60000,
        where: '1100, certitude 2 dans les données',
      },
    ],
  },
  {
    place: 'Q59975',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 70000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 50000,
        where: '1100, certitude 2 dans les données',
      },
    ],
  },
  {
    place: 'Q90',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 65000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 25000,
        where:
          '1100, estimée d’après un indice — surface ca 230 ha in 1100 based on p. 176-177 in Boussard:  Atlas historique et culturel de la France, and 125 inhab./ha',
      },
    ],
  },
  {
    place: 'Q8810',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 40000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 23000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 60000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q641',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 58000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 29000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 55000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q1083',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché', 'université'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'université',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 40000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 6000,
        where: '1100, estimation imputée — Chandler & Fox 17 parishes 1074-1127',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 50000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q17151',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 35000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 35000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 50000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q490',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 45000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 23000,
        where: '1100, estimée d’après un indice — Chandler & Fox: 1170 234 ha',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 42000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q87',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 45000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q107401',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 45000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q80561',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 41000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 30000,
        where: '1100, certitude 2 dans les données',
      },
    ],
  },
  {
    place: 'Q133118',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 30000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 41000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q3766',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 40000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
    ],
  },
  {
    place: 'Q365',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 35000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 20000,
        where: "1100, estimée d’après un indice — Russell '72: 1106 185 ha",
      },
    ],
  },
  {
    place: 'Q220',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 35000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 30000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q5836',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 35000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 35000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q84',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 32000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 15000,
        where: '1100, estimée d’après un indice — eleventh c. 15 k inhab., wikipedia 1100 15 k',
      },
    ],
  },
  {
    place: 'Q2634',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 30000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 22000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q79857',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 30000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q47611',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 30000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q1720',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 27000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 7000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q8826',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 25000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 8000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 27000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q10400',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 25000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 18000,
        where: '1100, estimée d’après un indice',
      },
    ],
  },
  {
    place: 'Q15699',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 25000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 24000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q217125',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 25000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q48338',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 25000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q1218',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 24000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q6555',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 22000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 6000,
        where: '1100, estimation imputée — LdM: 1066 ca 22 ha (including extra muros)',
      },
    ],
  },
  {
    place: 'Q3138',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 22000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 11000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q456',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 21000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 9000,
        where: "1100, estimation imputée — Russell '72: 13th c. 72 ha",
      },
    ],
  },
  {
    place: 'Q22690',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 21000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 7000,
        where: '1100, estimée d’après un indice — chandler 7 fox: 17 parishes',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 21000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q6616',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 16000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 8000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 20000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q30974',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 13000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 13000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 20000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q8818',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 20000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 12000,
        where: '1100, estimation imputée — Chandler & Fox: 1100 44 ha, times 150/ha, 7 k',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 13000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q10305',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 20000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 8000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q43387',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 20000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q82070',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 20000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
    ],
  },
  {
    place: 'Q459',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 20000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 9000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q6221',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 13000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 18000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q7880',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 14000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 11000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q1729',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 8000,
        where: "1100, estimation imputée — Russell '72: 120 ha -",
      },
    ],
  },
  {
    place: 'Q8851',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 9000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 11000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q45301',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
    ],
  },
  {
    place: 'Q35997',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
    ],
  },
  {
    place: 'Q168954',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q41876',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 12000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 9000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q42462',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 11000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 8000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q1085',
    year: 1100,
    importance: 'capital',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 10000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q48292',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 7000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q134287',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q1223508',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q83285',
    year: 1100,
    importance: 'large-city',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 6000,
        where:
          "1100, estimée d’après un indice — A. Ducellier (1981) La façade maritime de l'Albanie au Moyen Age, p. 687, gives a plan, durres ca 60 ha at most, assume 6 k",
      },
    ],
  },
  {
    place: 'Q3640',
    year: 1100,
    importance: 'capital',
    reasons: ['archevêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'importance',
        importance: 'capital',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'archevêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 10000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q171353',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Wikidata',
        subject: 'importance',
        importance: 'capital',
        where:
          '« capitale de » (P1376) Kingdom of Hungary (Q171150), 1001–1256, sur l’item Q171353 — lu le 31/10/2026',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 5000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q130212',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Wikidata',
        subject: 'importance',
        importance: 'capital',
        where:
          '« capitale de » (P1376) Kingdom of Hungary (Q171150), 1000–1543, sur l’item Q130212 — lu le 31/10/2026',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q134494',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q26397',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q1780',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q31487',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 5000,
        where: '1100',
      },
    ],
  },
  {
    place: 'Q51432',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q104725',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Wikidata',
        subject: 'importance',
        importance: 'capital',
        where:
          '« capitale de » (P1376) Kingdom of Poland (Q8890160), 1079–1138, sur l’item Q104725 — lu le 31/10/2026',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q268',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q1792',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimée d’après un indice — - 11th/12th c. 2-3 k',
      },
    ],
  },
  {
    place: 'Q1899',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Wikidata',
        subject: 'importance',
        importance: 'capital',
        where:
          "« capitale de » (P1376) Kievan Rus' (Q1108445), 882–1132, sur l’item Q1899 — lu le 31/10/2026",
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 20000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 50000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q2235',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Novgorod : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 25000,
        where:
          '1100, estimée d’après un indice — - LdM a 50-60 k in 12th-13th c, assume half, because this seems high',
      },
    ],
  },
  {
    place: 'Q157053',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Tchernigov : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 22000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q2337',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Smolensk : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 6000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q200797',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Polotsk : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 4000,
        where:
          '1100, estimée d’après un indice — - LdM: end 10th c 10 churches, assume 0.4k, giving 4k inhab.',
      },
    ],
  },
  {
    place: 'Q193342',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Rostov-Souzdal : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 10000,
        where:
          '1100, estimée d’après un indice — wikipedia one of the most important principalities, assume 10 k inhab',
      },
    ],
  },
  {
    place: 'Q2214',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 9000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q26563',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 7000,
        where: '1100, estimée d’après un indice — wikipedia: archbishopric 1170 - LdM 73 ha',
      },
    ],
  },
  {
    place: 'Q2167',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 1000,
        where: '1100, estimée d’après un indice',
      },
    ],
  },
  {
    place: 'Q25804',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 1000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q26793',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q3159',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 4000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q4439776',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimée d’après un indice — Wikipedia: height circa 1100, assume 3 k -',
      },
    ],
  },
  {
    place: 'Q162677',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Mourom-Riazan : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q2684',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée — wikipedia founded in 1108',
      },
    ],
  },
  {
    place: 'Q102217',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q131416',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 8000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q230104',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q636188',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 85000,
        where: '1100, certitude 2 dans les données',
      },
    ],
  },
  {
    place: 'Q48195',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 30000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 60000,
        where: '1100, certitude 2 dans les données',
      },
    ],
  },
  {
    place: 'Q83387',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 15000,
        where: '1100',
      },
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 42000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q283368',
    year: 1100,
    importance: 'city',
    reasons: ['évêché'],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'reason',
        reason: 'évêché',
        where: 'rôles de la ville en 1100',
      },
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 35000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
    ],
  },
  {
    place: 'Q186234',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)',
        subject: 'population',
        population: 30000,
        where: '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé',
      },
    ],
  },
  {
    place: 'Q131350',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 100000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q171714',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source:
          'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)',
        subject: 'population',
        population: 100000,
        where: '1100, certitude 1 dans les données',
      },
    ],
  },
  {
    place: 'Q1761',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 6000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q193452',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q36647',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q183551',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q133315',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q23436',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q207736',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q170263',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 3000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q204720',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q201970',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 2000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q25412',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 1000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q54757',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 1000,
        where: '1100, estimation imputée',
      },
    ],
  },
  {
    place: 'Q26345',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'European urban population, 700–2000',
        subject: 'population',
        population: 1000,
        where: '1100, estimée d’après un indice',
      },
    ],
  },
  {
    place: 'Q639839',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Pereïaslav : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
    ],
  },
  {
    place: 'Q15757',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'city',
        where: 'dans la principauté de Rostov-Souzdal sur la carte (1054–1132)',
      },
    ],
  },
  {
    place: 'Q33544',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Volhynie : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
    ],
  },
  {
    place: 'Q146450',
    year: 1100,
    importance: 'capital',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'capital',
        where:
          'siège de la principauté de Galicie : la principauté porte son nom et la carte l’y place (lecture de la carte, 1054–1132)',
      },
    ],
  },
  {
    place: 'Q910505',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'city',
        where: 'dans la principauté de Tchernigov sur la carte (1054–1132)',
      },
    ],
  },
  {
    place: 'Q1068190',
    year: 1100,
    importance: 'city',
    reasons: [],
    testimonies: [
      {
        source: 'Князівства Київської Русі (1054–1132)',
        subject: 'importance',
        importance: 'city',
        where: 'dans la principauté de Tchernigov sur la carte (1054–1132)',
      },
    ],
  },
]
