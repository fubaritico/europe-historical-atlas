import { render, renderHook } from '@testing-library/react'
import { createElement } from 'react'

import { InEnglish } from './InEnglish'

import type { RenderHookOptions, RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'

/**
 * Tests mount the Cartographer in English (ATLAS-159): every component speaks through `useTranslation`, which
 * throws with no language above it, and the suites were written against the English wording. One helper, so
 * a test never hand-writes the provider — and so `rerender` keeps the language, since Testing Library
 * re-applies a `wrapper` on every render.
 */

/**
 * `render`, in English.
 * @param ui - the element to mount
 * @param options - Testing Library's options; a `wrapper` given here is placed inside the language
 * @returns what `render` returns
 */
export function renderInEnglish(ui: ReactElement, options: Omit<RenderOptions, 'queries'> = {}) {
  const { wrapper: Inner, ...rest } = options
  return render(ui, {
    ...rest,
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        InEnglish,
        null,
        Inner === undefined ? children : createElement(Inner, null, children)
      ),
  })
}

/**
 * `renderHook`, in English.
 * @param hook - the hook to run
 * @param options - Testing Library's options, minus the wrapper this sets
 * @returns what `renderHook` returns
 */
export function renderHookInEnglish<Result, Props>(
  hook: (props: Props) => Result,
  options: Omit<RenderHookOptions<Props>, 'wrapper'> = {}
) {
  return renderHook(hook, { ...options, wrapper: InEnglish })
}
