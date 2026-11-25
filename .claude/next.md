# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **The list of tasks is the board** — Jira since
> 2026-11-20, https://europehistoricalatlas.atlassian.net/jira/software/c/projects/EHA/boards/3, through the `/jira`
> skill (Trello from 2026-10-17 until then; the dev deleted that board on 2026-11-20). This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

**L'historien** a son propre point de reprise, `.claude/next-historian.md` (les cartes, les sources, les scans) : lu en
plus de celui-ci quand une session prend le rôle de l'historien (sa décision, 10/11).

**Pour le codeur, de l'historien (23/11)** : les notes de recherche sont sur Acer ; `wikidataId.ts:3` et `cityVerdict.ts:21` citent encore
`files/plans/sources/1100/wikidata.md`, devenu `/Volumes/Acer/atlas-historien/1100/toutes-zones/resultats/wikidata.md`.

**À lui rappeler en début de session, quel que soit le rôle** (sa demande, 19/11) : (1) la côte libanaise de sa 1100,
dessinée seldjoukide alors qu'elle était fatimide (`/Volumes/Acer/atlas-historien/1100/levant/resultats/note-de-region.md`) ;
(2) plus tard, CORE-486. L'index de la mémoire est rangé (24/11 : 47 lignes, une par thème).

## ▶ Depuis le 24/11 — les rôles et l'autonomie

**Les données sont à l'historien, toute la chaîne** (le dev, 24/11 ; `roles/coder.md`, mémoire `data-chain-is-the-historians`) :
recherche, saisie, export, son commit, sa fusion et le push. Je n'exporte plus, ne commite plus d'export, n'écris plus de
donnée du CMS ; je lui demande une pause avant une migration ou une relance du serveur, rien d'autre. **J'avance seul par
le tableau** (le dev, 24/11) : un arbre par ticket (`.claude/worktrees/<ticket>`), fusionné et retiré à la fin — sauf une
fusion qui rechargerait son Cartographe, qui attend son mot. **À la reprise** : `ListAgents`, et dire à l'historien que je
suis la nouvelle session du codeur.

**Le plan d'autonomie de 1200** : `files/plans/historian/autonomy-and-1200.md` (ma part au § 5). **Attendent sa décision**
(§ 7) : le commit d'export allégé (point a) et la suppression des pays et des personnes ouverte à l'historien (point d).

## ▶ ON REPREND ICI — le 25/11, 20 h 45 : CARTO-498, puis CARTO-536

**CARTO-535 est Fait et dans `main`** (`aeb83af1`) : son Cartographe demande son compte du CMS. **Reprendre CARTO-498**
dans son arbre (`.claude/worktrees/CARTO-498`, sur `caaba5d0` : le **resynchroniser avec `main`** d'abord) — son code
écrit, le canal vers le CMS passe de la clé MCP à la session (un cookie relayé par le serveur du Cartographe, comme
`devServer/cmsSession.ts`), « Ajouter au CMS » refusé tant qu'une session est expirée ; puis **CARTO-536**, l'écran de
départ et ses états connectés, « Fermer la carte », que le tableau des états de CARTO-535 décrit. **Le Cartographe et
le CMS de l'usage : `localhost`** (le cookie se partage entre les ports) ; **un essai : `127.0.0.1`, jamais
`localhost`**, ou il remplace sa session (`known-issues/cms.md`).

**REPO-542 À valider** : commité sur sa branche (`9a3ef960`), **pas fusionné** — `main` portait mes notes de session non
commitées dans `known-issues/cms.md` ; les commiter, puis fusionner (un conflit possible sur ce fichier, à résoudre en
gardant les deux). Il attend ses deux règles de permission (le commentaire du ticket les donne mot pour mot). **Rien
n'est poussé** : il a dit de pousser quand tout sera fini.

**Les arbres en attente** : CARTO-498, CMS-225 (son code commencé, le ticket au Backlog), REPO-542.
**Prioritaire, à lui proposer** : ATLAS-527, le crédit Cliopatria sur l'atlas — le site en ligne n'est pas en règle.
**L'interface de l'atlas** (épique ATLAS-329, `files/plans/atlas/interface-integration.md`) : ATLAS-519 Fait ; suivent
ATLAS-520 (les pièces), 521 (la barre du site, la colonne du bas, la barre verticale à droite), 522 (le siècle), la
frise (ATLAS-358).
**À valider par lui** : REPO-542 (ses règles de permission). **En cours** : CARTO-498 (débloqué par CARTO-535),
ATLAS-136, ATLAS-408, ATLAS-448 (bloqué), ATLAS-461, CMS-279, CARTO-525 et 526 (l'historien), et les épiques.

## Ce qui reste d'avant, toujours vrai

- **En haut d'« À faire »** : CMS-499, CARTO-498 ; **CMS-459** (les citations en code wiki, critique)
  est toujours en bas de la colonne : c'est à lui de le placer ; je le mettrais en tête.
- **En cours** : il en reste trop qui ne bougent plus (CMS-225, ATLAS-136, ATLAS-152, ATLAS-408…) — à trier avec lui.
  CMS-279 : il reste la garde du seed (une heure).
- **Ses décisions en attente**, une à la fois : la case « Souverain » qui s'enregistre au clic (pas à « Enregistrer ») ; une
  personne son propre parent (revue QUAL-002) ; une chaîne divergente vérifiée sur sa première lecture souveraine
  (QUAL-003) ; six vassaux à deux suzerains en 1100 (Champagne, Anjou, Bellême, Carcassonne, Naples, Lérida).

**Le CMS** : les migrations (`packages/cms/README.md`) ; **relire chaque `down` généré** (il a reconstruit une table pour
une simple colonne le 15/11) ; jamais de DROP TABLE, sauf une table enfant de traductions que rien ne référence (`known-issues/cms.md`) ; prouver sur une copie (`sqlite3 ".backup"`, `DATABASE_URL=file:…`).
Le format de l'export est à la **version 10** (le nom d'époque de chaque ville).

**Sa règle, la nuit du 12/11 : la liberté de manipulation** (mémoire `freedom-of-handling`) — un geste n'est jamais bloqué
par une règle qu'il n'a pas demandée ; **l'outil choisi reste choisi**. Quand un geste échoue : le refaire dans mon
Cartographe (port 5199, une copie de la carte), **à l'endroit exact où il me met**, jamais deviné.

**Dessiner dans le Cartographe** (un agent, lui ou moi) : la skill **`/use-cartographer`** (07/11) ; son journal est
`references/journal.md`, local. **Un seul agent par carte** : une carte s'enregistre seule deux secondes après chaque geste.

**À lui, en attente** : son icône `error.svg` à la place de la mienne ; plus tard : CARTO-365 ; **à arbitrer** : le suzerain du royaume d'Arles
et les lectures divergentes de l'historien (`/Volumes/Acer/atlas-historien/1100/toutes-zones/resultats/questions.md`).

**Le Cartographe** : une carte est un dossier de `years/` (`s19`) et s'enregistre d'elle-même deux secondes après chaque
geste, en plus de sa copie `.autosave` (gardées, sa décision). Sa 1100 d'avant dans `years/1100-backup-2026-11-02/`.

**Décidé par lui, à garder en tête** : l'importance qui ordonne la carte est **politique**, et au Moyen Âge le religieux en est
(_« le religieux et la politique, c'est la même chose »_) ; le Saint-Empire **n'a pas de capitale** ; le zoom est **un défilement à
crans** (_« des scroll top »_), plus rien de progressif sauf le rayon des noms ; **le nom du pays prime** sur un point sans nom.

**Pour faire ou régler une icône** : la skill `/make-event-icon` (une image plate se dessine dans un cadre 44 × 44). **Jamais de backtick, de `$(` ni de `$` dans un `perl -e` ou un `sed`
entre guillemets doubles** : le 27/10, ça a lancé le seed sur sa base — éditer par l'éditeur.

**Trois règles du CMS, toujours** :

- **Le serveur du CMS est à nous deux, l'historien et moi, depuis le 23/11 au soir** (sa décision : _« c'est pas à moi,
  c'est à vous, vous vous démerdez entre vous deux »_) : je le relance moi-même quand un changement le demande, après
  avoir demandé à l'historien qu'aucun agent n'écrive, détaché (`/Volumes/Acer/atlas-historien/outils/start-cms.sh`), et
  je vérifie `/admin`. Il ne relance plus qu'une session dont le contexte est plein, depuis son téléphone : on le lui dit.
- **Aucun changement de champ sans migration, même un champ ajouté** (CMS-276) : depuis le 15/11 le schéma ne change
  plus par le push (`push: false`, `f49efbb6`) ; `pnpm dev:cms` lance `migrate` avant le serveur.
- **Un `rm -rf` ne se glisse jamais dans une commande.**

**Une source qu'il donne** → `/create-data-mention`, toujours ; la liste vit sur ATLAS-152. Ses atlas :
`/Volumes/Acer/atlas-historien/bibliotheque.md` (l'Italie et la Scandinavie manquent ; piste : Spruner-Menke 1880, domaine public).

**Pour travailler** : mon shell démarre sous Node 22 : préfixer `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. **Jamais
de `cd`.** **Jamais de `git add` d'une liste calculée** : nommer chaque fichier. Parler avec **ses** mots, un point à la fois.

**Un élément du tableau est un ticket**, jamais une « carte » ; c'est lui qui dit l'état de chaque ticket (01/11).

## Where we are

Gate verte sur cinq contrôles (`lint`, `type-check`, `test`, `build`, `format:check`) ; le chunk worker reste sans
three.js et le Cartographe émet le même, au même hash — vérifié par la CI.

`git log origin/main..main` lit une référence de suivi **qui peut être périmée** : pour la vraie réponse,
`git ls-remote origin main` contre `git rev-parse HEAD`.

|       |                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| dépôt | `fubaritico/europe-historical-atlas`, **public** depuis le 19/10, branche `main`                                                           |
| site  | **https://europe-historical-atlas.netlify.app** — 1100 y est publié, refaite depuis Cliopatria le 06/11 (`b02ce87`)                        |
| CI    | huit jobs — validate ×4 (lint, type-check, test, format), build, sonarqube, quality-gate, deploy — **verte depuis le 21/10, sous Node 24** |
| Sonar | `europe-historical-atlas` sous l'organisation `fubaritico`                                                                                 |

**Dernier contrôle des versions** : 2026-11-06 — 35 à jour proposées (8 alertes de sécurité, toutes dans le CMS), 0
montées, rapport `files/versions/2026-11-06.md`. **Fait le 17/11 (CMS-468)** : Next 16.4.6 et le kit MCP forcé en 1.32.0 ; il reste 3 alertes (zod, minimatch, esbuild).
**Dernier audit des instructions** (`/doctor prompt-audit`, une fois par semaine) : **23/11**, ses six corrections appliquées avec son accord le jour même (rapport `files/prompt-audit-2026-11-23.md` ;
laissé ouvert : les `allowed-tools` de `/repo-version-manager`, et les signalements de fin de rapport) ; **le suivant est dû le 30/11**.

**Trois faits de structure à ne pas re-découvrir** : _flat config n'a aucune cascade_, donc la config d'un
paquet **réimporte** la racine et ESLint résout **une** config depuis le **répertoire courant** — d'où un
`lint` par paquet · `core` tourne sous **`node`** parce que jsdom lui prêterait un `document` que la
production n'a jamais · la **couverture est fusionnée** par `scripts/merge-coverage.mjs`, parce que chaque
paquet écrit `SF:src/…` et que Sonar résout depuis la racine (sinon **0 % sans erreur**).

**Les serveurs** : l'atlas et le Cartographe sont les siens, jamais lancés, coupés ni relancés par moi ; le CMS est à
l'historien et à moi (« Trois règles du CMS », plus haut) ; le mien
seulement depuis un worktree, après avoir lu le titre des pages sur les ports ouverts — les ports bougent (REPO-383).

## ▶ P4, LE CARTOGRAPHE — les cinq étapes

> **À relire à chaque ouverture de session** — demande du dev, 27/09 : _« ça c'était clair, et tu me le
> réponds à chaque prochaine session, parce qu'avec ça je comprends bien et je me souviens bien. »_
> L'ordre est dicté par les dépendances, pas par une préférence.

|          | c'est quoi                                                                                                                                                                                                             | ça livre quoi                                                                          | on sait que ça marche comment                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **1** ✅ | Les **types** des trois fichiers + trois **lecteurs** écrits à la main, dans `packages/core/src/data/` à côté de `heightmap.ts` et `landMask.ts`, derrière `assetError.ts`. Plus l'**adaptateur** vers `RegionPayload` | **L'atlas lit une année écrite à la main et l'affiche.** Zéro ligne de `src/` modifiée | on écrit un dossier `1100/` à la main, `pnpm dev`, la carte s'affiche                                               |
| **2** ✅ | Le **modèle de document** : les ancres une fois, les anneaux en index, et les opérations — poser, déplacer, supprimer, **dupliquer un tracé**, fermer un anneau. Plus la **dérivation des frontières**                 | Un document qu'on manipule dans des tests, sans écran                                  | un aller-retour sauvegarde/chargement **conserve le partage** : on bouge une ancre après, les deux contours suivent |
| **3** ✅ | L'**historique** : un instantané par geste, plus la ligne que `{History}` lit et les **jalons**                                                                                                                        | `ctrl+z`, et cliquer un rang                                                           | même piège : restaurer doit restaurer le **partage**, pas les coordonnées                                           |
| **4** ✅ | Le **canevas 2D**, coupé en deux : l'**arithmétique** (hit-test, marquise, élastique, écran↔monde) qui est pure, et le **dessin**, une coquille sans logique                                                           | On dessine à l'écran                                                                   | l'arithmétique se teste avec des littéraux — et c'est cette coupe qui la rend testable du tout                      |
| **5** ◀  | Le **chrome** : `{Polities}` en arbre, les formulaires, `{Overrides}`, les trois marques d'année dérivée                                                                                                               | L'application                                                                          | les valeurs viennent de `files/plans/cartographer/design/chrome.css`, jamais son markup                             |

Les étapes **4 et 5 ont créé `packages/cartographer/`** — une application, comme la taxonomie du dev
dans `architecture.md` : Payload est une app, l'atlas est une app, `core` est une ressource.

**Comment** : chaque étape se vérifie et **se commite seule**, pas d'accumulation. `core` reste sans
three.js et sans DOM, donc les étapes 1, 2 et 3 sont **entièrement pures**. Chaque garde se teste **en la
cassant exprès**. Gate à chaque fois : `pnpm type-check && pnpm lint && pnpm test`, puis `/review`, puis
`/commit`.

**La vulnérabilité bloquante est fermée** (27/09, étape 2). Une seule invariante y suffit : **le tableau
d'ancres ne perd jamais rien pendant l'édition.** Donc `removePolity` retire une _revendication_, jamais un
point — les ancres de côte d'un pays sont aussi celles de son voisin. Ce qui n'est plus référencé disparaît
à l'enregistrement, par une seule renumération. Vérifié en la cassant : 3 tests tombent.

> Le design system branché, la skill à ouvrir avant de coder et les trois décisions de l'étape 4 sont dans
> `rules/cartographer.md` depuis le 21/10 — chargé dès qu'un fichier du Cartographe est touché.

## Comment répondre, dans ce projet

- **Une convention qu'il nomme se vérifie dans tous ses dépôts voisins** (`~/Desktop/WebstormProjects/`), pas un seul.
- **Lire les `scripts` du `package.json` avant de mesurer le comportement d'un outil** : c'est eux qui disent comment il
  est lancé.
- **Quand il a tranché, exécuter** — pas argumenter la mesure.
- **Pas de question sans arbitrage** : son test, _« c'est quoi la décision qu'il y a à prendre là ? »_
- **Tout problème arrive avec son remède et sa criticité.** Jamais une liste de risques sans décision.
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.
