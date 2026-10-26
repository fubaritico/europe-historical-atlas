/**
 * The year 1100's events, taken from the French Wikipedia page « 1100 » (read 2026-10-26) — the dev's call, the same
 * evening: « c'est toi qui vas saisir ». Every Wikidata id was read from the page's own links (`pageprops`), never
 * written from memory; every source is a work the page cites for that event. The descriptions are written here, in
 * our words. Only events with a place are pinned in the atlas; the one without (Henry I's coronation, « en
 * Angleterre » on the page) is kept and simply has no pin.
 */

import type { EventIcon } from '@europe-historical-atlas/core/data/contentFormat'

/** A place, named by its Wikidata item — the seed reads its position and existence from Wikidata, as the form does. */
export interface SeedPlace {
  /** Its Wikidata id. */
  wikidata: string
  /** Its French name. */
  name: string
}

/** An actor. */
export interface SeedActor {
  /** Its Wikidata id. */
  wikidata: string
  /** Its French name. */
  name: string
  /** Person or house (a dynasty). */
  kind: 'person' | 'house'
}

/** A source of the register, found again by its title. */
export interface SeedSource {
  /** Its title. */
  title: string
  /** Its author. */
  author: string
  /** Its publisher. */
  publisher: string
  /** The year of the edition cited. */
  editionYear: number
  /** Its kind, as the form lists them. */
  kind: 'primary' | 'scholarly'
  /** Where it can be read, when the page gives an address. */
  url?: string
}

/** One end of an event's date: the year 1100, a month and a day when the page gives them. */
export interface SeedMoment {
  /** The year. */
  year: number
  /** The month, when known. */
  month?: number
  /** The day, when known — Julian, as every day of 1100. */
  day?: number
}

/** An event, its relations named by what finds them again. */
export interface SeedEvent {
  /** Its French title — also what finds it again. */
  title: string
  /** Its type's French name, an existing one when the dev already wrote it. */
  type: string
  /** When it happened. */
  date: SeedMoment
  /** Its place's Wikidata id, if it has one. */
  place?: string
  /** Its actors' Wikidata ids. */
  actors: string[]
  /** Its sources' titles. */
  sources: string[]
  /** A short French description. */
  description: string
  /** The event's own Wikidata item, when it has one. */
  wikidata?: string
}

/** An event type, and the shape its events stand on the map as. */
export interface SeedType {
  /** Its French name — also what finds it again. */
  name: string
  /** Its icon. */
  icon: EventIcon
}

/**
 * The event types the seed needs. The first four are the dev's own (written 2026-10-26, spelling kept); the seed finds
 * them by name and creates only the others. The crossed swords are the one icon the dev has validated (2026-10-26);
 * every other type keeps the pin until its shape is chosen.
 */
export const TYPES: readonly SeedType[] = [
  { name: 'Bataille', icon: 'swords' },
  { name: 'Siège', icon: 'pin' },
  { name: 'Conquest', icon: 'pin' },
  { name: 'Polithique - Accession au trone', icon: 'pin' },
  { name: 'Mort', icon: 'pin' },
  { name: 'Concile', icon: 'pin' },
  { name: 'Intronisation', icon: 'pin' },
]

/** The places, by their Wikidata items. */
export const PLACES: readonly SeedPlace[] = [
  { wikidata: 'Q28587', name: 'Hamadan' },
  { wikidata: 'Q14524921', name: 'New Forest' },
  { wikidata: 'Q165995', name: 'Malatya' },
  { wikidata: 'Q41621', name: 'Haïfa' },
  { wikidata: 'Q220', name: 'Rome' },
  { wikidata: 'Q1613270', name: 'Malagón' },
  { wikidata: 'Q1963736', name: 'Nahr el-Kelb' },
  { wikidata: 'Q502975', name: 'Barbastro' },
  { wikidata: 'Q6616', name: 'Poitiers' },
  { wikidata: 'Q5776', name: 'Bethléem' },
]

/** The actors. Philippe Ier is the dev's own record; the seed finds it by its id. */
export const ACTORS: readonly SeedActor[] = [
  { wikidata: 'Q1296751', name: 'Muhammad Ier', kind: 'person' },
  { wikidata: 'Q387011', name: 'Barkyaruq', kind: 'person' },
  { wikidata: 'Q102005', name: 'Guillaume le Roux', kind: 'person' },
  { wikidata: 'Q2389282', name: 'Gautier Tirel', kind: 'person' },
  { wikidata: 'Q101384', name: 'Henri Ier Beauclerc', kind: 'person' },
  { wikidata: 'Q220994', name: 'Robert Courteheuse', kind: 'person' },
  { wikidata: 'Q220806', name: 'Bohémond de Tarente', kind: 'person' },
  { wikidata: 'Q714771', name: 'Danichmend', kind: 'person' },
  { wikidata: 'Q921391', name: 'Gabriel de Mélitène', kind: 'person' },
  { wikidata: 'Q51720', name: 'Tancrède de Hauteville', kind: 'person' },
  { wikidata: 'Q356628', name: 'Théodoric (antipape)', kind: 'person' },
  { wikidata: 'Q227967', name: 'Pascal II', kind: 'person' },
  { wikidata: 'Q75613', name: 'Almoravides', kind: 'house' },
  { wikidata: 'Q51717', name: 'Baudouin Ier de Jérusalem', kind: 'person' },
  { wikidata: 'Q261366', name: 'Duqâq de Damas', kind: 'person' },
  { wikidata: 'Q379748', name: 'Pierre Ier d’Aragon', kind: 'person' },
  { wikidata: 'Q5351', name: 'Guillaume IX d’Aquitaine', kind: 'person' },
  { wikidata: 'Q58907', name: 'Philippe Ier', kind: 'person' },
]

/** The works the page cites, one record each. */
export const SOURCES: readonly SeedSource[] = [
  {
    title:
      'The Chronicle of Ibn al-Athir for the Crusading Period from al-Kamil fi’l-Ta’rikh, vol. 1',
    author: 'D. S. Richards (trad.)',
    publisher: 'Ashgate',
    editionYear: 2010,
    kind: 'primary',
  },
  {
    title: 'Histoire d’Angleterre depuis la première invasion des Romains jusqu’à la paix de 1763',
    author: 'Antoine François Bertrand de Molleville',
    publisher: 'Michaud',
    editionYear: 1815,
    kind: 'scholarly',
    url: 'https://books.google.fr/books?id=mpQ9AAAAcAAJ&pg=PA179',
  },
  {
    title: 'Vie et mort de Byzance',
    author: 'Louis Bréhier',
    publisher: 'Albin Michel',
    editionYear: 1946,
    kind: 'scholarly',
    url: 'https://classiques.uqam.ca/classiques/brehier_louis/monde_byzantin/brehier_vie_et_mort_byzance.pdf',
  },
  {
    title: 'Chronologie de la première croisade, 1094-1100',
    author: 'Heinrich Hagenmeyer',
    publisher: 'G. Olms',
    editionYear: 1973,
    kind: 'scholarly',
  },
  {
    title: 'Histoire des conciles d’après les documents originaux',
    author: 'Karl Joseph von Hefele',
    publisher: 'Letouzey et Ané',
    editionYear: 1912,
    kind: 'scholarly',
  },
  {
    title: 'La frontière entre chrétienté et Islam dans la péninsule Ibérique',
    author: 'Pascal Buresi',
    publisher: 'Publibook',
    editionYear: 2004,
    kind: 'scholarly',
  },
  {
    title: 'Armes et combats dans l’univers médiéval, vol. 2',
    author: 'Claude Gaier',
    publisher: 'De Boeck Université',
    editionYear: 2004,
    kind: 'scholarly',
  },
  {
    title: 'La frontière et les hommes, VIIIe-XIIe siècle',
    author: 'Philippe Sénac',
    publisher: 'Maisonneuve & Larose',
    editionYear: 2000,
    kind: 'scholarly',
  },
  {
    title: 'Histoire complète de Bordeaux, vol. 1',
    author: 'Patrice-John O’Reilly',
    publisher: 'J. Delmas',
    editionYear: 1857,
    kind: 'scholarly',
    url: 'https://books.google.fr/books?id=X34BAAAAYAAJ&pg=PA260',
  },
  {
    title: 'L’épopée des Croisades',
    author: 'René Grousset',
    publisher: 'Perrin',
    editionYear: 1995,
    kind: 'scholarly',
    url: 'https://classiques.uqam.ca/classiques/grousset_rene/epopee_des_croisades/grousset_epopee_des_croisades.pdf',
  },
]

/** The events of 1100, in the order of the year. */
export const EVENTS: readonly SeedEvent[] = [
  {
    title: 'Bataille de l’Isbidh-rudh',
    type: 'Bataille',
    date: { year: 1100, month: 5, day: 14 },
    place: 'Q28587',
    actors: ['Q1296751', 'Q387011'],
    sources: [
      'The Chronicle of Ibn al-Athir for the Crusading Period from al-Kamil fi’l-Ta’rikh, vol. 1',
    ],
    description:
      'Près de Hamadan, le sultan seldjoukide Barkyaruq est battu par son frère Muhammad, de nouveau reconnu sultan à Bagdad le 25 mai.',
  },
  {
    title: 'Mort de Guillaume le Roux',
    type: 'Mort',
    date: { year: 1100, month: 8, day: 2 },
    place: 'Q14524921',
    actors: ['Q102005', 'Q2389282'],
    sources: [],
    description:
      'Le roi d’Angleterre meurt dans un accident de chasse dans la New Forest, d’une flèche attribuée à Gautier Tirel.',
  },
  {
    title: 'Couronnement d’Henri Ier Beauclerc',
    type: 'Polithique - Accession au trone',
    date: { year: 1100, month: 8, day: 5 },
    actors: ['Q101384', 'Q220994'],
    sources: [
      'Histoire d’Angleterre depuis la première invasion des Romains jusqu’à la paix de 1763',
    ],
    description:
      'Trois jours après la mort de son frère, Henri est couronné roi d’Angleterre ; il écarte Robert Courteheuse et publie une Charte des libertés.',
  },
  {
    title: 'Bataille de Mélitène',
    type: 'Bataille',
    date: { year: 1100, month: 8 },
    place: 'Q165995',
    actors: ['Q220806', 'Q714771', 'Q921391'],
    sources: ['Vie et mort de Byzance'],
    description:
      'Venu au secours du gouverneur arménien Gabriel, Bohémond, prince d’Antioche, est fait prisonnier par l’émir Danichmend ; Tancrède assure la régence.',
    wikidata: 'Q2219412',
  },
  {
    title: 'Prise de Haïfa',
    type: 'Siège',
    date: { year: 1100, month: 8 },
    place: 'Q41621',
    actors: ['Q51720'],
    sources: ['Chronologie de la première croisade, 1094-1100'],
    description: 'Avec l’appui de la flotte vénitienne, Tancrède prend Haïfa vers le 20 août.',
    wikidata: 'Q137785638',
  },
  {
    title: 'Intronisation de l’antipape Théodoric',
    type: 'Intronisation',
    date: { year: 1100, month: 9, day: 8 },
    place: 'Q220',
    actors: ['Q356628', 'Q227967'],
    sources: ['Histoire des conciles d’après les documents originaux'],
    description:
      'À la mort de l’antipape Clément III, Théodoric, évêque de Sainte-Rufine, est intronisé à Rome contre le pape Pascal II.',
  },
  {
    title: 'Bataille de Malagón',
    type: 'Bataille',
    date: { year: 1100, month: 9, day: 16 },
    place: 'Q1613270',
    actors: ['Q75613'],
    sources: ['La frontière entre chrétienté et Islam dans la péninsule Ibérique'],
    description: 'Les Almoravides battent les Castillans près de l’actuelle Ciudad Real.',
  },
  {
    title: 'Embuscade du Nahr el-Kelb',
    type: 'Bataille',
    date: { year: 1100, month: 10 },
    place: 'Q1963736',
    actors: ['Q51717', 'Q261366'],
    sources: ['Armes et combats dans l’univers médiéval, vol. 2'],
    description:
      'En route vers Jérusalem, Baudouin de Boulogne est attaqué au passage du fleuve par les hommes de Duqâq de Damas.',
  },
  {
    title: 'Prise de Barbastro',
    type: 'Conquest',
    date: { year: 1100, month: 10, day: 18 },
    place: 'Q502975',
    actors: ['Q379748'],
    sources: ['La frontière et les hommes, VIIIe-XIIe siècle'],
    description: 'Pierre Ier d’Aragon prend Barbastro.',
  },
  {
    title: 'Concile de Poitiers',
    type: 'Concile',
    date: { year: 1100, month: 11, day: 18 },
    place: 'Q6616',
    actors: ['Q5351', 'Q58907'],
    sources: ['Histoire complète de Bordeaux, vol. 1'],
    description:
      'Guillaume IX d’Aquitaine disperse les prélats qui s’apprêtaient à excommunier de nouveau le roi Philippe Ier.',
  },
  {
    title: 'Couronnement de Baudouin Ier, roi de Jérusalem',
    type: 'Polithique - Accession au trone',
    date: { year: 1100, month: 12, day: 25 },
    place: 'Q5776',
    actors: ['Q51717'],
    sources: ['L’épopée des Croisades'],
    description:
      'Baudouin de Boulogne, comte d’Édesse, succède à son frère Godefroy de Bouillon et devient le premier roi de Jérusalem ; couronné à Bethléem.',
  },
]
