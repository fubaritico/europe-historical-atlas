# Place names against Wikidata — the measure of 2026-11-22 (CMS-495)

Two throwaway scripts kept because the control of the names will be written from them
(`files/plans/contribution/names.md`): each place's French name in a **copy** of the CMS's base is compared with the
French label Wikidata gives the same item.

- `sort_names.py <copy.db> <out.json>` — the first pass, 50 ids a request. Wikidata refused 28 batches of 274 for
  asking too fast.
- `sort_retry.py <copy.db> <out.json>` — asks again, slowly, for the ids left without an answer, then counts: same
  name, different name, no French label.

Read-only on the base (`mode=ro`); never run against the dev's own file — take a copy first
(`sqlite3 "file:packages/cms/cms.db?mode=ro" ".backup '<copy.db>'"`). The result of that night is
`files/plans/contribution/noms-a-trier.md`.
