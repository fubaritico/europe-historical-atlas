import { ATLAS_NAME } from '../../atlasName'

import { brandMarkDataUri } from './utils/brandMarkDataUri'

/** What the mark is read out as, by where it stands. */
export type BrandMarkNames = 'atlas' | 'dashboard'

/** What the mark needs: the side and the name from the admin config (`clientProps`), the translator from Payload. */
export interface BrandMarkProps {
  /** The tile's side, in CSS pixels. */
  readonly side: number
  /**
   * `dashboard` in the navigation, where the mark is the home link's only content and so its name — Payload's own
   * word for where it leads; `atlas` on the login page, where it stands for the atlas.
   */
  readonly names: BrandMarkNames
  /** Payload's translator, handed to every server component: the dashboard's word in the admin's language. */
  readonly i18n: { readonly t: (key: 'general:dashboard') => string }
}

/**
 * The atlas's lambda in place of Payload's own graphics: in the navigation (`graphics.Icon`) and on the login page
 * (`graphics.Logo`), each at its side. A server component: it draws a constant and needs no state.
 * @param props - the side, what it names, the translator
 * @param props.side
 * @param props.names
 * @param props.i18n
 * @returns the mark
 */
export function BrandMark({ side, names, i18n }: BrandMarkProps) {
  const label = names === 'dashboard' ? i18n.t('general:dashboard') : ATLAS_NAME
  return (
    <img
      className="brand-mark"
      src={brandMarkDataUri(side)}
      width={side}
      height={side}
      alt={label}
    />
  )
}
