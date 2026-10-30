/**
 * `showPopover()` and `hidePopover()` for a test in jsdom, which has neither and still hides every popover through its
 * own default stylesheet — so the design system's Typeahead and Dropdown lists, popovers since its 0.6.0, could not be
 * found by role. The Cartographer's setup carries the same stand-in, with the reasons measured there
 * (`packages/cartographer/vitest.setup.ts`): an attribute marks the open one, and a rule shows it, `!important` because
 * jsdom ranks its own rule above an author's. Imported by the CMS tests that run in a page; the others run under node.
 */
const POPOVER_OPEN = 'data-test-popover-open'

const style = document.createElement('style')
style.textContent = `[popover][${POPOVER_OPEN}] { display: block !important; }`
document.head.append(style)

HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
  this.setAttribute(POPOVER_OPEN, '')
}
HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
  this.removeAttribute(POPOVER_OPEN)
}
