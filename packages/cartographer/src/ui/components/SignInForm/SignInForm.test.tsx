import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { SignInForm } from './SignInForm'

import type { SignInFormProps } from './SignInForm'

/**
 * The form, with whatever the test changes.
 * @param props - what differs from a form waiting for someone to sign in
 * @returns the gestures' spies and a user
 */
function mount(props: Partial<SignInFormProps> = {}) {
  const onSignIn = vi.fn<SignInFormProps['onSignIn']>(() => Promise.resolve())
  const onRetry = vi.fn()
  renderInEnglish(
    <SignInForm
      expired={false}
      email=""
      checking={false}
      problem={null}
      onSignIn={onSignIn}
      onRetry={onRetry}
      {...props}
    />
  )
  return { onSignIn, onRetry, user: userEvent.setup() }
}

const button = () => screen.getByRole('button', { name: 'Sign in' })
const address = () => screen.getByLabelText<HTMLInputElement>('Address')
const password = () => screen.getByLabelText<HTMLInputElement>('Password')

describe('SignInForm', () => {
  describe('happy path', () => {
    it('signs in with the address trimmed and the password, then clears the password', async () => {
      const { onSignIn, user } = mount()

      await user.type(address(), '  author@example.org ')
      await user.type(password(), 'secret')
      await user.click(button())

      expect(onSignIn).toHaveBeenCalledWith('author@example.org', 'secret')
      expect(password().value).toBe('')
    })
  })

  describe('variants', () => {
    it('after an expiry, keeps the address and says nothing is lost', () => {
      mount({ expired: true, email: 'author@example.org' })

      expect(address().value).toBe('author@example.org')
      expect(screen.getByText(/Nothing of your drawing is lost/)).not.toBeNull()
    })

    it('while the CMS is asked, says so and waits', () => {
      mount({ checking: true })

      expect(screen.getByRole('status').textContent).toBe('Checking the session…')
      expect(button().hasAttribute('disabled')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('the CMS not started: says it, and « Try again » asks again', async () => {
      const { onRetry, user } = mount({ problem: { kind: 'offline' } })

      expect(screen.getByRole('alert').textContent).toContain('The CMS does not answer')
      await user.click(screen.getByRole('button', { name: 'Try again' }))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('the Cartographer’s server answered with nothing readable: said as a defect, « Try again » asks again', async () => {
      const { onRetry, user } = mount({ problem: { kind: 'broken' } })

      const alert = screen.getByRole('alert').textContent
      expect(alert).toContain('a defect of the Cartographer')
      expect(alert).not.toContain('does not answer')
      await user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('the CMS refused: its words are shown', () => {
      mount({ problem: { kind: 'refused', reason: 'The email or password is incorrect.' } })

      expect(screen.getByRole('alert').textContent).toBe(
        'The CMS refused: The email or password is incorrect.'
      )
    })
  })

  describe('unmanaged errors', () => {
    // L4: a request with no answer never reaches the form as a rejection — the session's client reads it as the CMS not
    // answering (`persistence/sessionClient.test.ts`), so `onSignIn` always settles.
    it('sends one request per press, even pressed twice while it waits', async () => {
      const { onSignIn, user } = mount()
      onSignIn.mockReturnValue(new Promise(() => undefined))

      await user.type(address(), 'author@example.org')
      await user.type(password(), 'secret')
      await user.click(button())
      await user.click(screen.getByRole('button', { name: 'Signing in…' }))

      expect(onSignIn).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('stays greyed until both an address and a password are typed', async () => {
      const { user } = mount()

      expect(button().hasAttribute('disabled')).toBe(true)
      await user.type(address(), '   ')
      await user.type(password(), 'secret')

      expect(button().hasAttribute('disabled')).toBe(true)
    })

    it('a submit with a field empty, past the greyed button, is declined on the console', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { onSignIn } = mount()

      const form = document.querySelector('form.sign-in-form')
      if (form !== null) fireEvent.submit(form)

      expect(onSignIn).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('signing in declined'))
      warn.mockRestore()
    })

    it('Enter with a field empty sends nothing — the greyed button stops the form', async () => {
      const { onSignIn, user } = mount()

      await user.type(address(), 'author@example.org{Enter}')

      expect(onSignIn).not.toHaveBeenCalled()
    })
  })
})
