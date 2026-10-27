---
paths:
  - "packages/cms/**"
---
# Known issues — the CMS

Open issues of `packages/cms`, the contribution system (Payload). Loaded by path; indexed in `.claude/known-issues.md`.

- **En mode push, un changement de schéma pose une question dans le terminal, et tout le serveur attend** — CMS-276
  (25/10, mesuré). En développement, l'adaptateur SQLite pousse le schéma à la connexion (`db-sqlite/src/connect.ts`
  l. 60–67, Payload 3.92.0 dans `opensrc/`). Une colonne retirée et une autre ajoutée dans la même table : Drizzle ne
  sait pas si c'est un renommage et **demande** (`drizzle/src/utilities/pushDevSchema.ts` l. 47) ; un avertissement de
  perte de données répondu « non » **arrête le serveur** (`process.exit(0)`). Payload ne se connecte qu'à la première
  requête : la question tombe au milieu d'un clic, chaque requête attend derrière (2 min mesurées, puis plus rien). Sa
  base a été supprimée le 25/10, avec son accord (elle ne tenait que son compte). **Remède** : les migrations
  (`push: false`), CMS-276. **Jusque-là** : aucun changement de champ qui retire ou renomme une colonne, et le dire au
  dev avant qu'il relance. **Sévérité : bloquant dès qu'il y a du contenu.**
- **Le serveur du CMS est le sien** (25/10) : je ne le lance, ne le coupe ni ne le relance jamais. Mes relances pendant
  qu'il remplissait un lieu ont donné un « Failed to fetch » qu'il a pris pour un défaut du bouton. Je vérifie par des
  tests et des scripts sur une base à moi (CMS-279). **Sévérité : à savoir.**
- **Les fichiers que Payload écrit lui-même ne se lintent pas** : `src/app/(payload)/**` et `src/payload-types.ts`
  (*« do not modify it »*), plus `next-env.d.ts` de Next. Ignorés dans la config du CMS **et** dans celle de la racine,
  parce que lint-staged lance ESLint depuis la racine. Après un changement de champ : `pnpm --filter
  @europe-historical-atlas/cms generate:types` et `generate:importmap`. **Sévérité : à savoir.**
- **Le serveur du CMS réécrit `payload-types.ts` et `importMap.js` sans les formater** — CMS-290, à chaque rechargement de sa
  config (26/10, mesuré) ; **chaque `payload run` aussi** — le seed, l'export (27/10, mesuré : le fichier redevient non
  formaté après chacun, serveur arrêté) : tant qu'il tourne, `format:check` reste rouge sur ces deux fichiers, même juste après un
  `prettier --write`. **Remède** : au commit, formater puis indexer le fichier aussitôt ; un `importMap.js` qui ne
  diffère que par le format n'est pas commité. **Sévérité : à savoir.**
- **Next 16 écrit son propre `AGENTS.md` et `CLAUDE.md` dans le paquet** au premier `next dev` — `agentRules: false`
  dans `next.config.ts` l'en empêche (25/10). Et le CMS n'a pas de page à la racine : `/` renvoie vers `/admin` par une
  redirection de `next.config.ts`. **Cosmétique.**
