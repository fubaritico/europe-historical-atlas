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
  base a été supprimée le 25/10, avec son accord (elle ne tenait que son compte). **Remède en place, le 15/11** : les
  migrations (`push: false`, `src/migrate/`, `packages/cms/README.md` « The schema changes by migrations ») — `pnpm
  dev:cms` copie la base puis applique les migrations avant que Next démarre ; sa base, bâtie par le push, est adoptée à
  la première relance une fois prouvée identique aux collections (mesuré sur une copie : 0 écart, 2 s). **L'entrée part
  aux archives quand il aura relancé son serveur avec.** **Reste un piège, celui de `migrate:create`** : un renommage de
  table ou de colonne y pose la même question — une telle migration s'écrit à la main, prouvée par
  `migrateBase.test.ts`. **Sévérité : à savoir.**
- **Un ajout de champ pur peut figer le serveur, sans question dans le terminal** (03/11, `49a623d`) : une collection
  ajoutée au plugin MCP a ajouté une colonne à la table des clés. Le push l'a créée (`importance_reasons_find`), puis a
  échoué sur `CREATE INDEX payload_preferences_rels_order_idx` — *already exists* ; l'initialisation de Payload est restée
  en échec, chaque requête attendait derrière (admin, API, `/api/mcp` : 20 à 90 s). Une première relance du dev a
  redonné l'erreur. **Mesuré ensuite sur une copie identique de la base** (`pushSchema` sans `apply`) : plus aucune
  instruction en attente ; relancé à 13:21, le serveur répond (admin 200, MCP 401 sans clé en 7 ms). **Reproduit le 13/11
  à coup sûr, dans un seul processus** (CMS-433, une collection ajoutée, sur une copie de sa base) : le premier démarrage
  pousse, le **deuxième** échoue sur `CREATE INDEX payload_locked_documents_rels_order_idx` — *already exists* —, le
  troisième et les suivants passent ; mêmes comptes dans dix tables, `integrity_check` ok. L'hypothèse de deux pushes
  concurrents est donc **fausse** : c'est le push de Drizzle qui recrée une table (une colonne de relation ajoutée) et
  bute sur son propre index. **Le 14/11, sur une copie de sa base d'aujourd'hui** (CMS-433 entier : une collection et une
  relation ajoutée aux lignes) : **quatre démarrages** — le 2ᵉ bute sur `place_periods_testimonies_order_idx`, le 3ᵉ sur
  `payload_locked_documents_rels_order_idx`, le 4ᵉ passe ; une table refaite par démarrage, mêmes comptes, `integrity_check`
  ok. **Remède** : après un changement de schéma qui ajoute une collection ou une relation, le lui dire avant : relancer
  tant que l'admin répond 500 ou que le terminal montre *already exists* — le nombre mesuré d'abord sur une copie, jamais
  sur sa base. Durable : les migrations, CMS-276. **Sévérité : gênant.**
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
