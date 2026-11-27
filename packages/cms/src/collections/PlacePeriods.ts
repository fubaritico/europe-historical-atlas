import { APIError } from 'payload'

import { COMMUNITY_WEIGHTS } from '@europe-historical-atlas/core/data/cityCommunity'
import {
  CITY_IMPORTANCES,
  TESTIMONY_SUBJECTS,
} from '@europe-historical-atlas/core/data/cityImportance'
import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'
import { formatHistoricalDate } from '@europe-historical-atlas/core/time/formatHistoricalDate'

import { historicalDateField } from '../fields/historicalDate'
import { relationId } from '../fields/relationId'
import { OVERLAP_PATH, overlappingSheet } from '../fields/sheetOverlap'
import { refuseBulkRemovalOverMcp } from '../mcp/refuseBulkRemoval'

import { COLLECTION_MESSAGES } from './i18n'
import { refuseForeignPeriodName } from './refuseForeignPeriodName'
import { refuseInvalidSheet } from './refuseInvalidSheet'
import { refuseRestoringOverBin } from './refuseRestoringOverBin'
import { writeSheetTitle } from './writeSheetTitle'

import type { EventDateFields } from '../fields/historicalDate'
import type { SavedSheet } from '../fields/sheetOverlap'
import type { CommunityWeight } from '@europe-historical-atlas/core/data/cityCommunity'
import type {
  CityImportance,
  TestimonySubject,
} from '@europe-historical-atlas/core/data/cityImportance'
import type { CollectionBeforeValidateHook, CollectionConfig, PayloadRequest } from 'payload'

/** What the form calls each importance. */
const IMPORTANCE_LABELS: Readonly<Record<CityImportance, string>> = {
  capital: 'Capitale',
  'large-city': 'Grande ville',
  city: 'Ville',
}

/** What the form calls each subject a source line speaks about. */
const SUBJECT_LABELS: Readonly<Record<TestimonySubject, string>> = {
  population: 'Population',
  importance: 'Importance',
  reason: 'Raison',
  holder: 'Tenue par',
  community: 'Une communauté',
}

/** What the form calls each weight of a community. */
const WEIGHT_LABELS: Readonly<Record<CommunityWeight, string>> = {
  dominant: 'Dominante',
  present: 'Présente',
}

/** The HTTP status of a refused save: the request is wrong, not the server. */
const BAD_REQUEST = 400

/** One translator per language, made once: a malformed message fails when this module loads. */
const TRANSLATORS = {
  fr: createTranslator(COLLECTION_MESSAGES, 'fr'),
  en: createTranslator(COLLECTION_MESSAGES, 'en'),
} as const

export { OVERLAP_PATH } from '../fields/sheetOverlap'

/**
 * The server's half of decision 7: a sheet whose date shares a year with another of the same place is refused at
 * save, named. It holds for whatever reaches the API, the contribution screen included, which says this refusal under
 * the year.
 *
 * `data` is read alone, never merged over the saved sheet: on an update Payload has already filled every field the
 * request left out from the saved document, groups included, before a collection hook runs (3.92.0,
 * `collections/operations/utilities/update.ts` — the fields' `beforeValidate` first, through
 * `fields/hooks/beforeValidate/getFallbackValue.ts`).
 * @param args - Payload's hook arguments
 * @param args.data - the sheet as it will be saved
 * @param args.originalDoc - the sheet before this save, absent for a new one: its id is not compared with itself
 * @param args.req - the request, whose Payload finds the place's other sheets
 * @returns the data, unchanged
 */
export const refuseOverlap: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const place = relationId(data?.place)
  const date = data?.date as EventDateFields | undefined
  if (place === null || date === undefined) return data
  const { docs } = await req.payload.find({
    collection: 'place-periods',
    where: { place: { equals: place } },
    depth: 0,
    pagination: false,
    req,
  })
  const saved = docs.map((doc): SavedSheet => ({ id: doc.id, date: doc.date }))
  const overlap = overlappingSheet(date, saved, relationId(originalDoc) ?? undefined)
  if (overlap === null) return data
  const locale = pickLocale([req.i18n.language])
  const message = TRANSLATORS[locale]('overlap', {
    place: await placeName(req, place),
    date: formatHistoricalDate(overlap.date, locale),
  })
  // An APIError rather than a ValidationError: the admin toasts an error's own message, and a ValidationError's is
  // Payload's generic « the following field is invalid: year » (`errors/ValidationError.ts`), which says nothing of
  // why. Its `errors` still put the same sentence under the year (`ui/src/forms/Form/index.tsx`, ADD_SERVER_ERRORS).
  throw new APIError(message, BAD_REQUEST, { errors: [{ path: OVERLAP_PATH, message }] }, true)
}

/**
 * A place's name for the refusal, in the admin's language. A place's French name is required and its English one is
 * not, so a place with no English name is named in French rather than left unnamed in the sentence.
 * @param req - the request
 * @param id - the place
 * @returns its name
 */
async function placeName(req: PayloadRequest, id: number | string): Promise<string> {
  const place = await req.payload.findByID({
    collection: 'places',
    id,
    depth: 0,
    locale: req.locale ?? 'fr',
    fallbackLocale: 'fr',
    req,
  })
  return place.name
}

/**
 * A city at a date — « Paris en 1100 » — apart from the place itself, which is entered once (ATLAS-295,
 * `files/plans/atlas/cities.md`, decisions 3 to 8): its importance, the reasons for it, and one line a source of
 * what each says. A date alone counts for its year; an end makes it a span. Two sheets of one place never share a
 * year. The uncertainty is never typed: it is read from the lines.
 */
export const PlacePeriods: CollectionConfig = {
  slug: 'place-periods',
  labels: { singular: 'Ville à une date', plural: 'Villes à une date' },
  // CMS-508: a sheet removed goes to the bin with its source lines, and comes back from it with « Restaurer »
  trash: true,
  admin: {
    // « Paris — 1100 »: the place alone would read as a duplicate of its other sheets (the dev, 2026-10-31).
    useAsTitle: 'title',
    defaultColumns: ['title', 'importance'],
    // Our own form in place of Payload's, which validates only after a first save and never greys its button
    // (decision 8; `files/plans/atlas/city-sheet-screen.md`). Payload keeps the header, the tabs and the list.
    components: {
      views: {
        edit: { default: { Component: '/components/CitySheet/CitySheetView#CitySheetView' } },
      },
    },
    description:
      'Une ville telle qu’elle est à une date : son importance sur la carte, et ce qu’en disent les sources. Le lieu lui-même (son nom, sa position) se saisit une fois, dans « Lieux ».',
  },
  hooks: {
    // Over MCP, one record at a time (CMS-454).
    beforeOperation: [refuseBulkRemovalOverMcp],
    beforeValidate: [refuseOverlap],
    beforeChange: [
      refuseRestoringOverBin,
      refuseInvalidSheet,
      refuseForeignPeriodName,
      writeSheetTitle,
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titre',
      // Not required: a NOT NULL column added to a table that holds sheets would make Drizzle's push ask in the
      // terminal (CMS-276). The hook writes it at every save; the sheets saved before it, `pnpm retitle` once.
      admin: {
        readOnly: true,
        description: 'Écrit à l’enregistrement : le nom du lieu et la date.',
      },
    },
    {
      name: 'place',
      type: 'relationship',
      relationTo: 'places',
      label: 'Lieu',
      required: true,
      admin: { description: 'Choisi parmi les lieux déjà saisis dans « Lieux ».' },
    },
    // CMS-495: the name the place bore at this date — a record of its own, an added column, so every sheet already
    // saved reads with none.
    {
      name: 'periodName',
      type: 'relationship',
      relationTo: 'period-names',
      label: 'Nom d’époque',
      filterOptions: ({ data }) => {
        const place = relationId((data as { place?: unknown }).place)
        return place === null ? false : { place: { equals: place } }
      },
      admin: {
        description:
          'Le nom que le lieu portait à cette date — par exemple : Ancyre pour Ankara en 1100. Choisi parmi les noms d’époque de ce lieu ; absent, « + » le crée. C’est lui que la carte écrit.',
      },
    },
    historicalDateField({
      name: 'date',
      label: 'Date',
      description:
        'Une année suffit : la fiche vaut pour cette année. Remplir la fin en fait une durée. Un même lieu ne peut pas avoir deux fiches pour la même année.',
    }),
    {
      name: 'importance',
      type: 'select',
      label: 'Importance',
      required: true,
      options: CITY_IMPORTANCES.map((value) => ({ value, label: IMPORTANCE_LABELS[value] })),
      admin: {
        description:
          'Quand la ville apparaît sur la carte : une capitale se voit de loin, une grande ville en zoomant, une ville de près.',
      },
    },
    // CMS-391: an added column with its default, so the push mode adds it without a question (CMS-276) and every sheet
    // already saved reads unticked.
    {
      name: 'showInAtlas',
      type: 'checkbox',
      label: 'Afficher la ville dans l’atlas',
      defaultValue: false,
      admin: {
        description:
          'Cochée, la ville apparaît dans l’atlas publié. Décochée, elle reste dans la contribution et dans le Cartographe, qui s’en sert pour placer les frontières.',
      },
    },
    {
      name: 'reasons',
      type: 'relationship',
      relationTo: 'importance-reasons',
      hasMany: true,
      label: 'Raisons',
      admin: {
        description:
          'Pourquoi elle a cette importance : pouvoir, religion, commerce… Facultatif. La liste se complète dans « Raisons d’importance ».',
      },
    },
    // CMS-422 step 2c: the holder as a title — a person for a territory — the first link of the hierarchical chain.
    // Optional, an added column: the sheets already saved keep their free-text holder until 1100 is taken over (step 3).
    {
      name: 'holderTitle',
      type: 'relationship',
      relationTo: 'titles',
      label: 'Détenteur',
      admin: {
        description:
          'Le titre de celui à qui la ville obéit à cette date — par exemple : Mathias II, comte de Nantes. Choisi dans « Titres » ; sa chaîne hiérarchique se lit dessous.',
      },
    },
    // « Tenue par » (CMS-335): two added columns, neither required, so the sheets already saved stay valid and the
    // push mode adds them without a question (CMS-276).
    {
      name: 'holderName',
      type: 'text',
      label: 'Tenue par',
      admin: {
        description:
          'Le pays qui tient la ville à cette date, par son nom — par exemple : République de Venise. Facultatif. C’est ce que le Cartographe compare au pays dessiné sous la ville.',
      },
    },
    {
      name: 'holderQid',
      type: 'text',
      label: 'Identifiant Wikidata du pays',
      admin: {
        description:
          'Celui du pays, pas de la ville — par exemple : Q4948 pour Venise. Facultatif : un pays qui n’en a pas se saisit par son nom seul. Vérifiez-le sur Wikidata : les cartes importées en portent de faux.',
      },
    },
    // CMS-433: an added array with its own table, so the push mode adds it without a question (CMS-276), and every
    // sheet already saved reads with no community.
    {
      name: 'communities',
      type: 'array',
      label: 'Communautés religieuses',
      labels: { singular: 'Communauté', plural: 'Communautés' },
      admin: {
        description:
          'Facultatif. Les communautés que les sources attestent dans la ville à cette date — par exemple, à Tolède en 1100 : catholique dominante, musulmane présente, juive présente. Chacune doit avoir sa ligne « Une communauté » dans « Ce que disent les sources ».',
      },
      fields: [
        {
          name: 'confession',
          type: 'relationship',
          relationTo: 'confessions',
          label: 'Confession',
          required: true,
          admin: { description: 'La liste se complète dans « Confessions ».' },
        },
        {
          name: 'weight',
          type: 'select',
          label: 'Poids',
          required: true,
          options: COMMUNITY_WEIGHTS.map((value) => ({ value, label: WEIGHT_LABELS[value] })),
          admin: {
            description:
              'Dominante : la plus grande part de la ville. Présente : un quartier, une minorité.',
          },
        },
        {
          name: 'weightAttested',
          type: 'checkbox',
          label: 'Poids attesté par une source',
          defaultValue: false,
          admin: {
            description:
              'Cochée quand une source dit ce poids. Décochée, le poids est une déduction : la présence est attestée, le poids supposé, et la carte le montre incertain.',
          },
        },
      ],
    },
    {
      name: 'testimonies',
      type: 'array',
      label: 'Ce que disent les sources',
      labels: { singular: 'Source', plural: 'Sources' },
      admin: {
        description:
          'Facultatif. Une ligne par chose qu’une source dit de la ville à cette date — par exemple : Buringh 2021, population, 25 000. La source se choisit dans « Sources », qui doit donc la contenir.',
      },
      fields: [
        {
          name: 'source',
          type: 'relationship',
          relationTo: 'sources',
          label: 'Source',
          required: true,
          admin: { description: 'Choisie parmi celles déjà saisies dans « Sources ».' },
        },
        {
          name: 'subject',
          type: 'select',
          label: 'Sur quoi',
          required: true,
          options: TESTIMONY_SUBJECTS.map((value) => ({ value, label: SUBJECT_LABELS[value] })),
          admin: {
            description:
              'De quoi parle la source : la population, l’importance, une raison, le pays qui tient la ville, ou une communauté religieuse qui y vit.',
          },
        },
        // One value a line, the one its subject names — required, so a « population » line cannot be saved without its
        // figure. Payload validates a field only while its condition shows it (3.92.0, `fields/hooks/beforeChange/
        // promise.ts`, `skipValidationFromHere`) and makes no NOT NULL column of a conditional one (`drizzle/src/
        // schema/traverseFields.ts`), so the two hidden ones never block a save.
        {
          name: 'population',
          type: 'number',
          label: 'Habitants',
          min: 0,
          required: true,
          admin: { condition: (_data, sibling) => sibling.subject === 'population' },
        },
        {
          name: 'importance',
          type: 'select',
          label: 'Importance',
          required: true,
          options: CITY_IMPORTANCES.map((value) => ({ value, label: IMPORTANCE_LABELS[value] })),
          admin: { condition: (_data, sibling) => sibling.subject === 'importance' },
        },
        {
          name: 'reason',
          type: 'relationship',
          relationTo: 'importance-reasons',
          label: 'Raison',
          required: true,
          admin: { condition: (_data, sibling) => sibling.subject === 'reason' },
        },
        {
          name: 'holderName',
          type: 'text',
          label: 'Pays',
          required: true,
          admin: {
            condition: (_data, sibling) => sibling.subject === 'holder',
            description: 'Le pays qui tient la ville selon cette source, par son nom.',
          },
        },
        {
          name: 'holderQid',
          type: 'text',
          label: 'Identifiant Wikidata du pays',
          admin: {
            condition: (_data, sibling) => sibling.subject === 'holder',
            description: 'Facultatif — par exemple : Q4948.',
          },
        },
        // CMS-507: a holder line inferred from the title of the city's district — the source is the lord's, not one
        // that names this city (`files/plans/historian/autonomy-and-1200.md` § 2.1). An added column with its default,
        // so every line already saved reads as attested.
        {
          name: 'byDistrict',
          type: 'checkbox',
          label: 'Déduite de son district',
          defaultValue: false,
          admin: {
            condition: (_data, sibling) => sibling.subject === 'holder',
            description:
              'Cochée : la source prouve le seigneur du district, pas cette ville nommément — la ville en est déduite.',
          },
        },
        // The identity is a claim (`files/plans/contribution/vassal-chain.md`, the state of the art): the name as the
        // source writes it stays beside the one the line is read as, so two records later found to be one person
        // can be merged by a signed arbitration, the reading kept (CMS-422).
        {
          name: 'holderAsWritten',
          type: 'text',
          label: 'Nom dans la source',
          admin: {
            condition: (_data, sibling) => sibling.subject === 'holder',
            description:
              'Facultatif — le nom tel que la source l’écrit, recopié tel quel : « Mathieu, comte nantais ».',
          },
        },
        {
          name: 'confession',
          type: 'relationship',
          relationTo: 'confessions',
          label: 'Confession',
          required: true,
          admin: {
            condition: (_data, sibling) => sibling.subject === 'community',
            description: 'La communauté dont parle la source, par sa confession.',
          },
        },
        {
          name: 'where',
          type: 'text',
          label: 'Où',
          admin: {
            description: 'Où la source le dit : une page, une ligne, une colonne. Facultatif.',
          },
        },
        {
          name: 'quotation',
          type: 'textarea',
          label: 'Citation',
          admin: {
            description:
              'Les mots de la source, recopiés tels quels. Facultatif, mais c’est ce qui permet de vérifier la ligne sans le livre.',
          },
        },
      ],
    },
  ],
}
