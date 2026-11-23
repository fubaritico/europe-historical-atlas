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

**À lui rappeler en début de session, quel que soit le rôle** (sa demande, 19/11) : (1) ranger avec l'historien l'index
de la mémoire (172 lignes, limite 200) ; (2) la côte libanaise de sa 1100, dessinée seldjoukide alors qu'elle était
fatimide (`/Volumes/Acer/atlas-historien/1100/levant/resultats/note-de-region.md`) ; (3) plus tard, CORE-486.

## ▶ ON REPREND ICI — le 23/11, 18 h : les noms anglais rattrapés (CMS-495, En cours)

Le plan : `files/plans/contribution/names.md` ; l'état, le commentaire du 23/11 sur CMS-495. **Fait le 23/11 au soir**,
tout dans `main` : les noms anglais lus dans Wikidata et écrits dans sa base (13 558 lieux, 319 territoires, 391
personnes) et mes traductions des types d'événement, des raisons d'importance et des engins de siège ; l'anglais
**obligatoire** dans le tableau « Le nom dans les autres langues » d'un territoire **et d'un lieu** (sa décision du
23/11 : le lieu prend le tableau du territoire ; la migration `place_other_names` a tourné sur sa base, copie dans
`.backups/`) ; la liste de l'historien, `files/plans/contribution/noms-anglais-a-faire.md`. **Rien n'est poussé
depuis le 20/11.**

**Ce qui reste, dans l'ordre** : (1) **à lui** : les fautes de ses libellés de types
d'événement (« Polithique », « trone », « Conquest » en français) ; (2) le lieu prérempli dans le tiroir du « + » du
« Nom d'époque », puis le tiroir essayé sur toute sa vie ; (3) la suite d'avant : les quatorze noms d'époque
d'Anatolie (de l'historien), le contrôle des noms en commande, les pays en français ; (4) les 364 noms anglais que
Wikidata ne donne pas, à l'historien (`noms-anglais-a-faire.md`). Puis CMS-499 et CARTO-498, en tête d'« À faire ».

**Le nom de tout le registre est le français seul** depuis le 23/11 au soir — lieux, territoires,
personnes, confessions, types d'événement, raisons, engins (migrations `plain_french_names` et
`plain_french_register_names`) ; restent traduits le titre et la description des événements ; le seed ne bâtit plus
une base neuve (`known-issues/cms.md`, avec CMS-279) : l'anglais n'existe plus que dans le tableau. **Les 30 noms d'époque** sont posés (Ancyre →
Ankara, `noms-a-trier.md` trié). **Un piège payé le 23/11** : une commande du CMS lancée depuis l'arbre `coder` crée une base neuve
(`known-issues/cms.md`).

**Sa 1100 est à lui** (22/11) : il retouche lui-même l'est de l'Anatolie ; `polities.json` et `registry.json` ne sont
ni commités ni touchés, et **je lui demande avant toute fusion qui lui ferait recharger le Cartographe**.

**Deux règles du code qui sont de moi, à garder ou à lever par lui** : une fiche ne prend qu'un nom d'époque de son
propre lieu ; un nom que des fiches citent ne change pas de lieu. **En attente de lui** (CARTO-498) : un pays relié au
CMS garde-t-il un nom et des dates modifiables dans le Cartographe ; les 201 pays par un script en lot.

**Sur le tableau** : CMS-499 puis CARTO-498 en tête d'« À faire » (son geste, vu le 23/11), puis CORE-486 et
CMS-441. **En Idées** : REPO-496, REPO-500 (le contrôle des villes muet sur un vassal direct non dessiné), CMS-494.
**Un manque** : l'historien n'a pas d'outil pour créer un événement. Deux personnes pour Danichmend (9 et 179) : à lui.

**Les icônes** : ATLAS-288 fermé le 21/11, sept types sur treize ; les six autres au Backlog (ATLAS-478 à 483), faites
quand une carte en a besoin. **ATLAS-448** (une seule langue sur la carte) est porté par CMS-495.
**ATLAS-461, les ornements — En cours, chez Claude Design** : j'attends ce qu'il rend (`~/Desktop/claude-design-ornements`).

**Le tableau** : Jira depuis le 20/11, par le MCP d'Atlassian et `/jira` ; le Backlog est une page, pas une colonne. **Les
rangs** : `core/src/data/ranks.ts` ; à lui, le rang des États pontificaux, un score pour la seigneurie épiscopale et le despotat.

**L'export** : `pnpm export:content` écrit `atlas.json` et `cartographer.json` dans `packages/atlas/public/content/` ; le dernier commité est
du 22/11 (`a38abeda`). **Le Cartographe ne lit l'export qu'à l'ouverture de sa page.** Une copie de la base d'avant la
migration des noms : `packages/cms/.backups/cms-20261122-000012-…db` ; celle du 20/11, `cms.backup-2026-11-20-oriflamme.db`
(ignorées par git, à supprimer avec son accord).

**Ses règles récentes** : une correction prête va dans `main` tout de suite (19/11) — **sauf quand l'historien dessine
sur l'arbre principal** (22/11) ; ce qui resservira va dans un spike, le reste est supprimé (18/11). **Ne jamais pousser
pendant qu'une CI déploie** : `gh run list -L 1` avant. **Il ne valide plus une fonctionnalité** (20/11) : je la teste
et je la clos ; ne va à lui que ce qui se juge à l'œil ou se décide, en un seul geste.

**Sur `main`, pas à moi** : `editor-chrome.css` (CARTO-465, pas validé), les fichiers de l'historien.

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

**L'historien** : `/find-sources` (BnF dans chaque lot), `/enter-in-cms` ; après son export, **je commite `packages/atlas/public/content/atlas.json` et `cartographer.json`**.

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

- **Son serveur du CMS est le sien** : je ne le lance, ne le coupe ni ne le relance jamais.
- **Aucun changement de champ sans migration, même un champ ajouté** (CMS-276) : depuis le 15/11 le schéma ne change
  plus par le push (`push: false`, `f49efbb6`) ; `pnpm dev:cms` lance `migrate` avant le serveur.
- **Un `rm -rf` ne se glisse jamais dans une commande.**

**Une source qu'il donne** → `/create-data-mention`, toujours ; la liste vit sur ATLAS-152. Ses atlas :
`/Volumes/Acer/atlas-historien/bibliotheque.md` (l'Italie et la Scandinavie manquent ; piste : Spruner-Menke 1880, domaine public).

**Pour travailler** : mon shell démarre sous Node 22 : préfixer `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. **Jamais
de `cd`.** **Jamais de `git add` d'une liste calculée** : nommer chaque fichier. Parler avec **ses** mots, un point à la fois.

**Un élément du tableau est un ticket**, jamais une « carte » ; c'est lui qui dit l'état de chaque ticket (01/11).

## Where we are

**7 144 tests** sur `main` le 09/11 (2 062 `core` · 1 696 atlas · 2 838 Cartographe · 379 CMS · 169 plugin), gate
verte sur cinq contrôles (`lint`, `type-check`, `test`, `build`, `format:check`). Le chunk worker reste sans
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

**Cinq paquets**, orchestrés par **Turbo**, avec un **catalogue de versions** dans `pnpm-workspace.yaml` :
`core` (pure TS, ni three.js ni DOM ni React ni zustand — tenu par ESLint et `tsc`, tests sous **`node`**),
`atlas` (three.js vanille, `jsdom`), `cartographer` (React 19 + Vite, **sa propre config ESLint** qui
réimporte la racine, son `publicDir` est celui de l'atlas), `cms` (Payload 3 + Next, son serveur est celui du dev,
tests sous `node`), `eslint-plugin-eha` (nos règles de lint).

**Trois faits de structure à ne pas re-découvrir** : _flat config n'a aucune cascade_, donc la config d'un
paquet **réimporte** la racine et ESLint résout **une** config depuis le **répertoire courant** — d'où un
`lint` par paquet · `core` tourne sous **`node`** parce que jsdom lui prêterait un `document` que la
production n'a jamais · la **couverture est fusionnée** par `scripts/merge-coverage.mjs`, parce que chaque
paquet écrit `SF:src/…` et que Sonar résout depuis la racine (sinon **0 % sans erreur**).

**Les serveurs** : ses serveurs (atlas, Cartographe, CMS) sont les siens, jamais lancés, coupés ni relancés par moi ; le mien
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
