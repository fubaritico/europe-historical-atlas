/**
 * The polity form — its public face: the form, its props, and the fields its events name. Its fields and the
 * suzerain search stay inside this folder (the dev's call, 2026-10-18: one entity per file, a folder per
 * component, a barrel as its boundary).
 */
export { PolityForm } from './PolityForm'
export type { PolityFormProps } from './PolityForm'
export type { PolityFormField } from './internal/PolityFields'
