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
- **`payload-types.ts` et `importMap.js` restent dans le format de Payload** (CMS-290, clos le 30/10) : ils sont dans
  `.prettierignore` et commités tels qu'il les écrit. Ne jamais les reformater — une réécriture du serveur redonnerait
  un diff. Après un changement de champ, `generate:types` / `generate:importmap` et commiter leur sortie telle quelle.
  **Sévérité : à savoir.**
- **Next 16 écrit son propre `AGENTS.md` et `CLAUDE.md` dans le paquet** au premier `next dev` — `agentRules: false`
  dans `next.config.ts` l'en empêche (25/10). Et le CMS n'a pas de page à la racine : `/` renvoie vers `/admin` par une
  redirection de `next.config.ts`. **Cosmétique.**
- **Deux pièges de Payload 3.92, payés le 30/10 sur l'écran « Ville à une date »** : (1) une vue d'édition à nous reçoit une
  **nouvelle fiche comme `null`**, pas `{}`, quoi que dise le type (`@payloadcms/next`, `views/Document/index.js`) — la page
  de création plantait ; (2) le crochet `beforeChange` **d'une collection passe avant les règles des champs**, pas après
  (`collections/operations/utilities/update.ts`). Et Payload ne pose le **verrou d'édition** que depuis son propre formulaire :
  le nôtre ne le pose pas — sans effet tant que le CMS est local et à lui seul. **Sévérité : à savoir.**
