import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

/**
 * A harness check, not a module's suite — so the 5-level policy of `rules/tests.md` does not apply here and
 * is not pretended at. What it proves is the chain: jsdom supplies a document, `@vitejs/plugin-react`
 * transforms the JSX, `@testing-library/react` mounts into it, and `user-event` drives a real click through
 * React's event system.
 *
 * It stands alone deliberately. `App.tsx` is still the Vite template's demo and cannot be the subject: it
 * imports the stylesheet and the three images that were removed with the rest of the template's furniture.
 * The first real suite arrives with the first real component, and this file goes when it does.
 */
function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button
      type="button"
      onClick={() => {
        setCount(count + 1)
      }}
    >
      count {count}
    </button>
  )
}

describe('test harness', () => {
  it('renders a component into a document', () => {
    render(<Counter />)

    expect(screen.getByRole('button').textContent).toBe('count 0')
  })

  it('runs a state update through a real click', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button').textContent).toBe('count 1')
  })

  it('isolates each test, so the previous click did not leak', () => {
    render(<Counter />)

    expect(screen.getByRole('button').textContent).toBe('count 0')
  })
})
