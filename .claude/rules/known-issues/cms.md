---
paths:
  - 'packages/cms/**'
---

# Known issues — the CMS

Open issues of `packages/cms`, the contribution system (Payload). Loaded by path; indexed in `.claude/known-issues.md`.

- **Les migrations du CMS, trois pièges qui restent** (15/11, CMS-276, CMS-422) : (1) **un renommage** de table ou de
  colonne fait poser sa question à `migrate:create` (drizzle-kit) — une telle migration s'écrit à la main, prouvée par
  `src/migrate/migrateBase.test.ts` et sur une copie de sa base ; (2) **jamais de DROP TABLE** dans une migration : les
  clés étrangères de sa base sont actives (`PRAGMA foreign_keys` = 1, mesuré), et `PRAGMA foreign_keys=OFF` ne fait rien
  dans la transaction de Payload — une reconstruction de table efface en cascade (noms, liens d'événements). **Le cas
  sûr** : supprimer une table **enfant** que rien ne référence, comme une table de traductions (`*_locales`) une fois
  ses lignes recopiées — la suppression ne remonte jamais vers le parent (`plain_french_names`, 23/11). **La
  descente générée en écrit une même pour une simple colonne ajoutée** (`holder_title`, 15/11 : `place_periods`
  reconstruite, ses lignes de source effacées en cascade) — relire chaque `down`, l'écrire à la main en `DROP INDEX`
  puis `DROP COLUMN`, et la prouver sur la copie (`payload migrate:down`). **Depuis le 24/11 (CMS-280)**,
  `migrate:create` nomme une reconstruction, une suppression ou un renommage et échoue ; `migrate` refuse une migration
  qui en a, dans un sens ou dans l'autre, tant qu'elle ne porte pas `// dangers reviewed: <why>`
  (`src/migrate/migrationDangers.ts` — un garde-fou, pas une preuve : un mot-clé assemblé à l'exécution n'est pas lu) ; (3)
  drizzle-kit écrit une clé ajoutée sans son `ON DELETE` : `migrate:create` la complète (`finishMigrations`), dit celles
  qu'il n'a pas pu compléter et échoue alors. **Sévérité : à savoir.**
- **Supprimer une personne, un territoire ou un titre qu'une affirmation cite est refusé par un crochet**
  (`collections/claimDependants.ts`, 15/11, CMS-422) : les clés de la base sont `ON DELETE set null`, et un maillon
  vidé changerait de sens. Le refus tient par Payload seul — un SQL écrit à la main sur la base le contourne.
  **Sévérité : à savoir.**
- **Un titre ou un maillon en double est refusé par un crochet, pas par la base** (`collections/refuseDuplicateClaim.ts`,
  15/11) : un index unique de SQLite tient deux fins vides pour différentes, et c'est le cas de presque tous les titres
  de 1100. Le refus n'est **pas atomique** : deux créations envoyées en même temps (des appels MCP en parallèle)
  passent toutes deux la recherche. **Remède si ça mord** : un index sur des expressions (`coalesce` des fins), migration
  écrite à la main — ou des saisies en série. **Contrôle** : la requête de doublons en lecture seule après chaque passe
  de l'historien. **Sévérité : à savoir.**
- **Les noms automatiques des titres et des maillons lisent les fiches liées sans vérifier les droits de l'appelant**
  (revue SEC-001, 15/11) — le crochet de la fiche de ville fait de même, et le refus d'un titre ou d'un maillon en
  double (`collections/refuseDuplicateClaim.ts`, 15/11), qui nomme celui qui existe. Pour ce dernier, la recherche doit
  **garder** tous les droits (sinon un doublon passerait) : seul le message se tait, sans nom ni numéro, devant un
  appelant qui ne peut pas lire le titre trouvé. Sans effet tant que le CMS est local, à un seul
  contributeur, sans lecture restreinte. **Déclencheur** : la mise en ligne et ses comptes (CMS-228) — `overrideAccess:
false` et `user: req.user` sur ces lectures. **Sévérité : à savoir.**
- **Le serveur du CMS est au codeur et à l'historien depuis le 23/11 au soir** (le dev : _« c'est pas à moi, c'est à
  vous »_ ; il était le sien depuis le 25/10, quand mes relances coupaient ses saisies). Avant de le couper : demander à
  l'historien qu'aucun de ses agents n'écrive — une relance coupe leurs écritures. Le relancer détaché
  (`/Volumes/Acer/atlas-historien/outils/start-cms.sh`), vérifier `/admin`, le dire à l'historien. **Sévérité : à savoir.**
- **Lancer le CMS depuis une session Claude** (17/11, l'historien) : le contrôleur de permissions refuse `pnpm dev:cms`
  tant que l'ordre du dev n'est pas écrit en toutes lettres dans la conversation (deux refus ; une note de reprise ne
  suffit pas) ; une fois accepté, une tâche de fond est tuée (SIGTERM, code 143) à la fin de l'appel, le serveur déjà prêt.
  Seul un lancement **détaché** tient (`setsid` par perl, `nohup`, `/Volumes/Acer/atlas-historien/outils/start-cms.sh` depuis le 23/11, journal dans le dossier
  temporaire). Le même soir, le codeur note que le dev a coupé trois fois son serveur parce que la session de
  l'historien le relançait : deux sessions ne lancent jamais le CMS chacune de leur côté. **Remède** : il le lance
  lui-même, ou il en donne l'ordre en toutes lettres ; je dis au premier refus d'où il vient. **Sévérité : à savoir.**
  **Pour un essai, depuis le 25/11 (REPO-542)** : `pnpm --dir <arbre>/packages/cms trial:start` **depuis un arbre de
  travail**, jamais l'arbre principal (refusé : son `.env` porte ses clés) — une copie de sa base (dossier `0700`, copie
  `0600` : elle porte les empreintes des mots de passe), un compte jetable (jamais d'identifiant lu : la lecture de
  `.env.test-user` a été refusée, à raison), un secret à lui, un CMS détaché sur un port libre dès 3110 — puis
  `trial:stop`, qui ne coupe que son serveur (`next dev` sur son port, vérifié avant tout signal). **Toujours sur `127.0.0.1`, jamais `localhost`** : le
  cookie de Payload est celui de l'hôte, quel que soit le port ; le soir du 25/11, l'essai de CARTO-535 sur `localhost`
  a remplacé puis effacé la session de son admin. **Son geste**, pour que l'essai tourne sans lui : deux règles de
  permission, `Bash(pnpm --dir /Users/stephanecottereau/Desktop/WebstormProjects/europe-map/.claude/worktrees/*/packages/cms trial:start)`
  et la même en `trial:stop`.
- **Les fichiers que Payload écrit lui-même ne se lintent pas** : `src/app/(payload)/**` et `src/payload-types.ts`
  (_« do not modify it »_), plus `next-env.d.ts` de Next. Ignorés dans la config du CMS **et** dans celle de la racine,
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
- **Depuis le 13/11, son serveur du CMS n'écoute que sur `127.0.0.1`** (`3337dbc`) : un mot de passe que Chrome avait
  enregistré pour une autre adresse ne se remplit plus, et un mot de passe tapé de mémoire est refusé — vécu le 14/11 à sa
  première relance, sans que je l'aie prévenu. **Remède** : ouvrir `http://localhost:3100/admin` et laisser Chrome y
  enregistrer le compte ; son mot de passe se retrouve dans `chrome://password-manager`. **Sévérité : à savoir.**
- **Une validation à soi (`validate`) remplace celle de Payload, `required` compris** (16/11, `84e227e`) : l'année de
  début obligatoire n'était jamais vérifiée, un titre sans année partait jusqu'à SQLite (NOT NULL, erreur 500). Corrigé
  dans `validateMoment` ; **tout `validate` d'un champ `required` doit tester le vide lui-même**. **Sévérité : à savoir.**
- **Le type de territoire « Évêché » mêle le diocèse et le pouvoir temporel de l'évêque** (16/11) : 12 maillons ont un
  diocèse pour suzerain (Soissons → diocèse de Soissons), 150 fiches sont tenues par un « évêché ». **Décidé par lui le
  16/11 au matin** (`files/plans/contribution/vassals/saisie-et-exploitation-des-chaines-de-vassalité.md`, qui remplace le
  « Diocèse » refusé de la nuit) : l'évêché d'une ville est sa **raison**, jamais un rang ; le pouvoir temporel d'un clerc
  prend les rangs « Seigneurie épiscopale » et « Seigneurie archiépiscopale » (codés, avec le patriarcat et les rangs des
  trois mondes) ; « Évêché (à reclasser) » reste tant que l'historien n'a pas reclassé ses fiches — puis il est retiré
  (une valeur retirée d'une liste, sans migration : `kind` est un `text`). CMS-422. **Reclassé par l'historien le 16/11
  après-midi** (plus aucun territoire « bishopric », contrôlé par le codeur) : reste au codeur à retirer la valeur de la
  liste. **Sévérité : à savoir.**
- **1 546 citations sont du code wiki, pas la phrase de la page** — CMS-459 (16/11, relevé par le codeur) : « [[comté de
        Toulouse|comtes de Toulouse]] », « {{s-|XI|e}} » — les agents de l'historien ont copié le texte source de Wikipédia.
        Un lecteur ne retrouve pas la phrase, et le passage surligné (CMS-441) ne peut pas la trouver. **Le dev : bloquant, à
        corriger maintenant.** Remède en cours : la phrase de la page, produite par l'analyseur de Wikipédia et vérifiée sur la
        page (`/Volumes/Acer/atlas-historien/1100/toutes-zones/recherches/avant-2026-11-23/chaines/chains-1100-verify/render_quotes.py`), appliquée d'un coup par le codeur sur une copie de la base ;
        et les agents citent désormais la page lue, jamais son code. **Sévérité : bloquant.**
- **Une mise à jour groupée (`where`) est faite en parallèle par Payload** (3.92, `operations/update.js:324`) : si la
  liste tient les deux bouts d'un même maillon, le crochet qui rafraîchit les maillons dépendants le réécrit deux fois à la
  fois, et l'une échoue sur un identifiant de ligne en double (16/11, titres 29 et 11). Rien de perdu (contrôlé). Remède :
  ces titres un par un ; la correction côté code reste à décider. **Sévérité : à savoir.**
- **L'outil MCP `updateTitles` ne décrit pas le champ `sovereign`** (16/11, rapporté par l'historien) : le serveur
  l'accepte, mais un agent qui lit la description ne sait pas qu'il existe. Remède : regarder comment le greffon MCP de
  Payload dérive ses descriptions (relance du CMS, ou description à la main). **Sévérité : à savoir.**

- **Une mise à jour MCP qui porte `lines` les remplace toutes** (16/11, historien) : `updateTitles` avec une seule ligne
  nouvelle a effacé les deux lignes de source du titre 251 ; Payload n'a pas de versions, rien à restaurer dans la base
  (remises d'après un export du 15/11). **Remède** : lire les lignes existantes et les renvoyer avec la nouvelle.
  **Sévérité : bloquant pour les sources quand ça arrive.**
- **Laissé ouvert par la revue du 16/11 au soir** (ma décision, tout faible) : (1) changer le titre « Tenue par » pendant
  les millisecondes d'un enregistrement de la chaîne afficherait l'erreur sous la case du nouveau titre — rien d'écrit de
  travers dans la base ; (2) la région annoncée aux lecteurs d'écran de la chaîne est plus large que ses messages, et l'aide
  de la case « Souverain » n'est pas reliée à elle (outil local, courtoisie) ; (3) `refusalOf` est rangé dans
  `saveVassalLink.ts` alors qu'il lit tout refus de Payload. **Sévérité : cosmétique.**
- **L'historien met à la corbeille par le MCP, et rien ne dit quelles fiches sa clé a créées** (CMS-454 le 18/11, la
  corbeille CMS-508 le 24/11, `mcp/mcpAccess.ts`) : sa clé ne supprime plus rien ; sur les fiches de ville, les lieux,
  les noms d'époque, les sources, les titres et les maillons (`trash: true`), il écrit `deletedAt` par l'outil de mise à
  jour, comme l'admin. **Pourquoi pas la suppression du MCP** : son outil appelle `payload.delete`, qui efface pour de bon
  même dans une collection à corbeille (Payload 3.92, `operations/deleteByID.ts` ; la corbeille est une mise à jour,
  `ui/elements/DeleteDocument`). Deux refus la tiennent : ce qu'une autre fiche cite (`claimDependants.refuseTrashingCited`,
  et pour la suppression définitive `refuseDeletingCited`, qui compte aussi les fiches déjà à la corbeille), et une mise à
  la corbeille par filtre (`mcp/refuseBulkRemoval.ts`). La sortie se fait dans l'ordre inverse : une fiche ne revient pas
  tant que ce qu'elle cite est encore à la corbeille (`refuseRestoringOverBin`, lu dans les champs mêmes) — Payload
  peuple une relation vers la corbeille comme une fiche vivante (`collections/dataloader.ts`), l'export la porterait ; et
  un lieu dont le double au même Wikidata est à la corbeille est renvoyé à « Restaurer » (`refuseBinnedTwin` : l'index
  unique de la base compte la corbeille). **Pas tenu** : un modèle peut mettre à la corbeille une fiche
  saisie par le dev — il la restaure dans l'admin. **Remède si ça mord** : un champ « créé par » (une migration).
  **Sévérité : à savoir.**
- **La fiche d'une ville n'a pas de bouton « Supprimer »** (24/11, CMS-508) : sa vue d'édition est la nôtre
  (`CitySheetView`), sans les actions de Payload. La corbeille passe par la liste (cocher, « Supprimer » qui déplace à la
  corbeille), puis l'onglet « Corbeille » et « Restaurer » — essayé sur une copie. **Sévérité : cosmétique.**
- **Un test de descente monte la base jusqu'à la dernière migration, puis défait la sienne comme si elle était la
  dernière** (24/11, CMS-508 : `periodNamesDown.test.ts` est tombé quand la migration de la corbeille a retiré une colonne
  que sa descente retire aussi). Les autres (`holderTitleDown`, `uniqueWikidata`…) ont la même forme. **Remède appliqué
  là** : défaire d'abord la migration plus récente qui touche les mêmes colonnes. **Sévérité : à savoir** — le prochain qui
  tombe se lit ainsi.
- **Le serveur du CMS n'écrit dans aucune transaction** (24/11, CMS-509, trouvé par le test de la fusion) : l'adaptateur
  SQLite de Payload n'en ouvre une que si `transactionOptions` est donné (3.92, `db-sqlite/index.ts` →
  `defaultBeginTransaction`, qui ne fait rien). Un geste qui écrit plusieurs fiches — un crochet qui réenregistre les
  titres d'un territoire renommé (`refreshTitlesOf`) — peut donc s'arrêter à mi-chemin. **Remède appliqué là où ça
  compte** : la fusion des doublons se construit avec `cmsConfig({ transactions: true })` (mode `immediate`) et refuse de
  partir sans transaction. **Pour le serveur** : décision à prendre si un geste à moitié fait apparaît — des transactions
  pour tout le CMS veulent un verrou d'écriture par requête, à mesurer avec les agents qui écrivent en parallèle.
  **Sévérité : à savoir.**
- **Les quatre registres ont leur corbeille, et le MCP n'y met rien** (24/11, CMS-509) : territoires, personnes,
  confessions et raisons d'importance ont `trash: true` ; ce qui les cite est lu dans le schéma (`schemaCiters`), pour
  leurs refus (`registerRefusals`) comme pour la fusion — une maison qui nomme son fondateur compte, ce que l'ancienne liste
  des seuls titres ratait. Par le MCP, une fiche de registre ne va pas à la corbeille (`registerRefusals`) : les retirer
  reste au dev, ou à `pnpm cms:merge`, tant qu'il n'a pas ouvert ce geste à l'historien
  (`files/plans/historian/autonomy-and-1200.md` § 7 d). **Sévérité : à savoir.**
- **A record without its English line is refused at its next save** (2026-11-23, CMS-495): English is required on
  places, territories, people and the four registers — wanted (the dev, 2026-11-22: _"a translation field is never
  left empty"_), never loosened. Since the same evening no record lacks it; a new one is given its English line in the
  same save. **A trap met on the way**: a Local API read handed `req` with another `locale` writes that language into
  the request — inside a `beforeChange` the save under way then goes on in it (a name typed in English overwrote the
  French one, caught by a test). **Severity: à savoir.**
- **The seed cannot build a new base any more** (2026-11-23, CMS-495, CMS-279): every place, person, event type,
  importance reason and siege engine now requires an English line, and the seed's data gives French names only — its
  Wikidata reading takes the French label alone (`wikidata/wikidataPlace.ts`). `pnpm seed:cms` on an empty base is
  refused at its first place. Never run on the dev's base, so nothing of his is touched. **Remedy**: the seed reads
  the English label too, and its short lists carry their English forms — with CMS-279. **Severity: à savoir.**
- **A CMS command run from the `coder` tree reads the base's relative path and makes a new base there** (2026-11-23):
  `DATABASE_URL` in `packages/cms/.env` is relative, so `pnpm migrate` run with `--dir` on the tree built an empty
  base in `.claude/worktrees/coder/packages/cms/` and migrated it, leaving the dev's base as it was — caught by the
  counts, the stray file removed. **Remedy**: always pass `DATABASE_URL=file:<absolute path>` to a command of the CMS
  run outside `main`'s tree. **Severity: worth knowing.**
- **A Claude session keeps the CMS's MCP tools as it read them at its start** (2026-11-23): Claude Code refreshes a
  server's tools only when the server sends `list_changed` (code.claude.com/docs/en/mcp, « Dynamic tool updates »), and
  Payload's MCP never does — it is built per request by `mcp-handler` (`plugin-mcp/dist/mcp/getMcpHandler.js`) and holds
  no stream. A field added to a collection is therefore unknown to a session already open: the historian's
  `createPeople` refused every person for lack of `otherNames`, which its tool did not offer. **The rule** (the dev:
  _"why do I have to deal with this"_): **the coder changes a collection's fields while no historian session runs**, or
  says the change before the next one starts — a new session reads the new tools. A session already open cannot reconnect itself (`/mcp` is the dev's), and the dev no longer does it (2026-11-23): the
  historian works around it until his next session — the CMS restarted by the coder, a record the stale tool cannot
  carry is kept aside. **Severity: gênant.**
- **The « + » of « Nom d'époque » is ours, a copy of Payload's** (2026-11-23, CMS-495): Payload's own « + »
  (`elements/AddNewRelation`, 3.92) hands its drawer no initial data, so `CitySheet/internal/PrefilledAddNew.tsx` stands in
  its place to open the drawer on the sheet's place. It copies Payload's classes (`relationship-add-new*`,
  `relationship--allow-create`) and `citySheet.css` lays it out by Payload's structure (`.field-type__wrap`,
  `.relationship__wrap`): a Payload upgrade that renames them breaks the layout without an error. It also skips Payload's
  check of the right to create (`permissions.collections[slug].create`) — no effect while the CMS is local, with one
  contributor. **Remedy**: look at the field after each Payload bump; with accounts (CMS-228), read `useAuth()` and hide
  the button without that right. **Severity: worth knowing.**
- **« Exporter la base » writes to the disk for any signed-in user** (2026-11-24, CMS-499, reviews SEC-001 and SEC-005):
  the route `POST /api/export-content` checks only that a user is signed in — `users` has no role to check — and relies
  on Payload's session cookie with no `csrf` list of origins set. No effect while the CMS is local, on `127.0.0.1`, with
  one contributor. **Trigger**: going online (CMS-228) — a role allowed to export, with its migration, then the check on
  the route; the `csrf` and `cors` origins set; and online the export cannot write the atlas's folder anyway (`names.md`).
  Also left by the review: while the export runs (about 12 s), the greyed button is not announced to a screen reader;
  the toast that ends it is (A11Y-001, the same as the Wikidata button). **Severity: worth knowing.**
- **« Rattacher » on a title's page writes with every right** (2026-11-24, CMS-507, reviews SEC-001 and ARCH-002): the
  route `POST /api/titles/:id/cities` checks a signed-in user only, then `attachCities` reads and writes through the
  Local API without `user` nor `overrideAccess: false` — the same family as « Exporter la base » above. No effect while
  the CMS is local, with one contributor. **Trigger**: going online (CMS-228) — pass the request's user to every call,
  keeping the hooks that read with full rights on purpose, and no other `locale` carried into the write (the trap of
  2026-11-23). Also left: its two writes pass their data `as never`, Payload's generated row type requiring the fields a
  condition hides (population on a holder line); a field renamed in `PlacePeriods` shows only as a city « failed ».
  **Severity: worth knowing.**
- **A key of the MCP plugin does not open Payload's REST API** (2026-11-25, CARTO-498): Payload 3.92 registers an API-key
  strategy for every auth collection **except** `payload-mcp-api-keys` (`payload/src/index.ts`, line 975) — such a key
  opens `/api/mcp` only; on `/api/<collection>` the request is nobody, and the default access refuses it. Proved on a
  copy of the base. **Remedy taken**: the Cartographer acts with the CMS's own session (CARTO-535), « Ajouter au CMS »
  too since 2026-11-26 (CARTO-498) — `CMS_API_KEY` in `packages/cartographer/.env` is read by nothing any more.
  **Severity: à savoir.**
