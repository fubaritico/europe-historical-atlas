/**
 * Every sentence the atlas shows, in French and English (ATLAS-159) — none is written in the code.
 *
 * **An asset failure is a whole sentence per asset**, with a case per kind of failure: the translator writes
 * each one, agreement included — *« Les frontières historiques n’ont pas pu être chargées »*. That replaces
 * the hand-made gender-and-number table that once produced *« Les frontières historiques a échoué »* in
 * production (2026-09-24); a language with other agreements writes its own cases, nothing to model.
 *
 * Not here: the work's name, which is a proper name (`core/utils/lettering`), and the developer panel, a
 * tool the public never sees.
 */

import type { Catalogue } from '@europe-historical-atlas/core/i18n/catalogue'

/** A message of {@link ATLAS_MESSAGES}. */
export type AtlasMessageKey =
  /** The progress caption while a year loads; `year` is given as text. */
  | 'loadingYear'
  /** The progress caption of each compute phase. */
  | 'phaseRasterise'
  | 'phaseExpand'
  | 'phaseColours'
  | 'phaseBake'
  | 'phaseBorders'
  /** What failed, per asset, with a case per `failure`: transport, schema, consistency, semantic, other. */
  | 'heightmapFailed'
  | 'landMaskFailed'
  | 'regionsFailed'
  | 'riversFailed'
  | 'yearRegistryFailed'
  | 'yearPolitiesFailed'
  | 'yearBordersFailed'
  /** What the reader loses, per asset. */
  | 'heightmapLoss'
  | 'landMaskLoss'
  | 'regionsLoss'
  | 'riversLoss'
  | 'yearRegistryLoss'
  | 'yearPolitiesLoss'
  | 'yearBordersLoss'
  /** A failure's headline: what failed, then what it costs. */
  | 'assetNotice'
  /** The headline of an error nothing anticipated. */
  | 'unexpectedError'
  /** The accessible name of a notice's close button. */
  | 'dismiss'

/** {@link AtlasMessageKey}, in French and English. */
export const ATLAS_MESSAGES: Catalogue<AtlasMessageKey> = {
  fr: {
    loadingYear: 'Chargement de l’année {year}…',
    phaseRasterise: 'Tracé des territoires…',
    phaseExpand: 'Extension jusqu’aux côtes…',
    phaseColours: 'Attribution des couleurs…',
    phaseBake: 'Composition de la texture…',
    phaseBorders: 'Tracé des frontières…',
    heightmapFailed:
      '{failure, select, transport {Le relief n’a pas pu être chargé} schema {Le relief est illisible} consistency {Le relief est incomplet} semantic {Le relief ne correspond pas à cette carte} other {Le relief a échoué}}',
    landMaskFailed:
      '{failure, select, transport {Le masque des terres n’a pas pu être chargé} schema {Le masque des terres est illisible} consistency {Le masque des terres est incomplet} semantic {Le masque des terres ne correspond pas à cette carte} other {Le masque des terres a échoué}}',
    regionsFailed:
      '{failure, select, transport {Les frontières historiques n’ont pas pu être chargées} schema {Les frontières historiques sont illisibles} consistency {Les frontières historiques sont incomplètes} semantic {Les frontières historiques ne correspondent pas à cette carte} other {Les frontières historiques ont échoué}}',
    riversFailed:
      '{failure, select, transport {Les fleuves n’ont pas pu être chargés} schema {Les fleuves sont illisibles} consistency {Les fleuves sont incomplets} semantic {Les fleuves ne correspondent pas à cette carte} other {Les fleuves ont échoué}}',
    yearRegistryFailed:
      '{failure, select, transport {Le registre de l’année n’a pas pu être chargé} schema {Le registre de l’année est illisible} consistency {Le registre de l’année est incomplet} semantic {Le registre de l’année ne correspond pas à cette carte} other {Le registre de l’année a échoué}}',
    yearPolitiesFailed:
      '{failure, select, transport {Les territoires de l’année n’ont pas pu être chargés} schema {Les territoires de l’année sont illisibles} consistency {Les territoires de l’année sont incomplets} semantic {Les territoires de l’année ne correspondent pas à cette carte} other {Les territoires de l’année ont échoué}}',
    yearBordersFailed:
      '{failure, select, transport {Le style des frontières n’a pas pu être chargé} schema {Le style des frontières est illisible} consistency {Le style des frontières est incomplet} semantic {Le style des frontières ne correspond pas à cette carte} other {Le style des frontières a échoué}}',
    heightmapLoss: 'La carte ne peut pas être affichée.',
    landMaskLoss:
      'Le trait de côte est déduit de l’altitude : les polders néerlandais passent sous l’eau et les lacs fermés apparaissent comme des plaines.',
    regionsLoss: 'La carte s’affiche sans les pays ni leurs frontières.',
    riversLoss: 'La carte s’affiche sans le réseau hydrographique.',
    yearRegistryLoss:
      'Les pays s’affichent sans nom, sans rang et sans lien de vassalité : la géométrie est là, l’identité manque.',
    yearPolitiesLoss: 'La carte s’affiche sans les pays ni leurs frontières.',
    yearBordersLoss:
      'Les frontières s’affichent avec leur style déduit : les traits posés à la main sont perdus.',
    assetNotice: '{failed}. {loss}',
    unexpectedError: 'Une erreur inattendue s’est produite. La carte peut être incomplète.',
    dismiss: 'Fermer',
  },
  en: {
    loadingYear: 'Loading the year {year}…',
    phaseRasterise: 'Drawing the territories…',
    phaseExpand: 'Extending them to the coasts…',
    phaseColours: 'Choosing the colours…',
    phaseBake: 'Composing the texture…',
    phaseBorders: 'Drawing the borders…',
    heightmapFailed:
      '{failure, select, transport {The relief could not be loaded} schema {The relief is unreadable} consistency {The relief is incomplete} semantic {The relief does not match this map} other {The relief failed}}',
    landMaskFailed:
      '{failure, select, transport {The land mask could not be loaded} schema {The land mask is unreadable} consistency {The land mask is incomplete} semantic {The land mask does not match this map} other {The land mask failed}}',
    regionsFailed:
      '{failure, select, transport {The historical borders could not be loaded} schema {The historical borders are unreadable} consistency {The historical borders are incomplete} semantic {The historical borders do not match this map} other {The historical borders failed}}',
    riversFailed:
      '{failure, select, transport {The rivers could not be loaded} schema {The rivers are unreadable} consistency {The rivers are incomplete} semantic {The rivers do not match this map} other {The rivers failed}}',
    yearRegistryFailed:
      '{failure, select, transport {The year’s registry could not be loaded} schema {The year’s registry is unreadable} consistency {The year’s registry is incomplete} semantic {The year’s registry does not match this map} other {The year’s registry failed}}',
    yearPolitiesFailed:
      '{failure, select, transport {The year’s territories could not be loaded} schema {The year’s territories are unreadable} consistency {The year’s territories are incomplete} semantic {The year’s territories do not match this map} other {The year’s territories failed}}',
    yearBordersFailed:
      '{failure, select, transport {The border style could not be loaded} schema {The border style is unreadable} consistency {The border style is incomplete} semantic {The border style does not match this map} other {The border style failed}}',
    heightmapLoss: 'The map cannot be shown.',
    landMaskLoss:
      'The coastline is inferred from elevation: the Dutch polders fall under water and closed lakes show as plains.',
    regionsLoss: 'The map shows without its countries or their borders.',
    riversLoss: 'The map shows without its rivers.',
    yearRegistryLoss:
      'Countries show without a name, a rank or a bond of vassalage: the geometry is there, the identity is missing.',
    yearPolitiesLoss: 'The map shows without its countries or their borders.',
    yearBordersLoss: 'Borders show in their derived style: the strokes set by hand are lost.',
    assetNotice: '{failed}. {loss}',
    unexpectedError: 'An unexpected error occurred. The map may be incomplete.',
    dismiss: 'Close',
  },
}
