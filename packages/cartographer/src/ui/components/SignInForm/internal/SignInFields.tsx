import { Input } from '@fubaritico/react/Input'

import { useTranslation } from '../../../hooks/useTranslation'
import { SIGN_IN_MESSAGES } from '../i18n'

/** What the two fields need. */
export interface SignInFieldsProps {
  /** The address typed. */
  address: string
  /** The password typed. */
  password: string
  /**
   * The address changed.
   * @param value - the new address
   */
  onAddress: (value: string) => void
  /**
   * The password changed.
   * @param value - the new password
   */
  onPassword: (value: string) => void
}

/**
 * The address and the password of the sign-in form (CARTO-535), with the browser's own autocomplete hints so a saved
 * account of the CMS fills them.
 * @param props - the values and their changes
 * @param props.address - the address typed
 * @param props.password - the password typed
 * @param props.onAddress - the address changed
 * @param props.onPassword - the password changed
 * @returns the two fields
 */
export function SignInFields({ address, password, onAddress, onPassword }: SignInFieldsProps) {
  // Context
  const t = useTranslation(SIGN_IN_MESSAGES)

  // Handlers
  const handleAddress = (event: { target: { value: string } }) => {
    onAddress(event.target.value)
  }
  const handlePassword = (event: { target: { value: string } }) => {
    onPassword(event.target.value)
  }

  // Render
  return (
    <>
      <Input
        label={t('email')}
        type="email"
        autoComplete="username"
        value={address}
        onChange={handleAddress}
      />
      <Input
        label={t('password')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={handlePassword}
      />
    </>
  )
}
