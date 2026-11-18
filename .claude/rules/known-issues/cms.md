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
  dans la transaction de Payload — une reconstruction de table efface en cascade (noms, liens d'événements). **La
  descente générée en écrit une même pour une simple colonne ajoutée** (`holder_title`, 15/11 : `place_periods`
  reconstruite, ses lignes de source effacées en cascade) — relire chaque `down`, l'écrire à la main en `DROP INDEX`
  puis `DROP COLUMN`, et la prouver sur la copie (`payload migrate:down`) ; (3)
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
- **Le serveur du CMS est le sien** (25/10) : je ne le lance, ne le coupe ni ne le relance jamais. Mes relances pendant
  qu'il remplissait un lieu ont donné un « Failed to fetch » qu'il a pris pour un défaut du bouton. Je vérifie par des
  tests et des scripts sur une base à moi (CMS-279). **Sévérité : à savoir.**
- **Lancer le CMS depuis une session Claude** (17/11, l'historien) : le contrôleur de permissions refuse `pnpm dev:cms`
  tant que l'ordre du dev n'est pas écrit en toutes lettres dans la conversation (deux refus ; une note de reprise ne
  suffit pas) ; une fois accepté, une tâche de fond est tuée (SIGTERM, code 143) à la fin de l'appel, le serveur déjà prêt.
  Seul un lancement **détaché** tient (`setsid` par perl, `nohup`, `files/resources/historien/outils/start-cms.sh`, journal dans le dossier
  temporaire). Le même soir, le codeur note que le dev a coupé trois fois son serveur parce que la session de
  l'historien le relançait : deux sessions ne lancent jamais le CMS chacune de leur côté. **Remède** : il le lance
  lui-même, ou il en donne l'ordre en toutes lettres ; je dis au premier refus d'où il vient. **Sévérité : à savoir.**
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
    page (`files/resources/historien/1100/chaines/chains-1100-verify/render_quotes.py`), appliquée d'un coup par le codeur sur une copie de la base ;
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
- **L'historien supprime par le MCP, et rien ne dit quelles fiches sa clé a créées** (18/11, CMS-454, `mcp/mcpAccess.ts`) :
  la suppression est ouverte sur les fiches de ville, les lieux, les sources, les titres et les maillons, case par case sur
  la clé. Trois refus la tiennent : ce qu'une autre fiche cite (`claimDependants.refuseDeletingCited`, la liste tenue
  contre le schéma par `deleteGuards.test.ts`), une suppression par filtre (`mcp/refuseBulkDelete.ts` : une fiche à la
  fois, par son identifiant), et la case non cochée. **Pas tenu** : un modèle peut supprimer une fiche de ville, un titre
  non cité ou un maillon saisis par le dev — pas de corbeille, le retour est la copie de la base. **Remède si ça mord** :
  un champ « créé par » sur chaque fiche (une migration), le refus au-delà. **Sévérité : à savoir.**
