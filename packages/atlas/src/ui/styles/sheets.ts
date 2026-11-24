/**
 * The interface's style sheets, in the order the cascade needs (ATLAS-519): the design system's tokens, the three faces
 * of lot B (self-hosted, OFL-1.1, each file fetched only when a glyph needs it), the atlas's theme over the tokens —
 * after them, so it wins — and the interface's own rules. Imported once, by the composition root.
 *
 * **The design system's components sheet (`@fubaritico/styles`) is not loaded yet**: no component of it is used, and
 * it weighed 18 kB gzipped of CSS that holds the first paint (measured on the built site, 24/11). It comes with the
 * first component that needs it (ATLAS-520), before the theme.
 */
import '@fubaritico/tokens/css'
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/im-fell-english/400.css'
import '@fontsource/im-fell-english/400-italic.css'
import './theme.css'
import './interface.css'
