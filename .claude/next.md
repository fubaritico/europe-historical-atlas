# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.


**L'historien** a son propre point de reprise, `.claude/next-historian.md` (les cartes, les sources, les scans) : lu en
plus de celui-ci quand une session prend le rôle de l'historien (sa décision, 10/11).

## ▶ ON REPREND ICI — après la session du 11/11 au soir (les rôles, l'identifiant byzantin, l'automatisation)

**Les rôles existent depuis le 11/11** : `claude` démarre en codeur ; « commence une session en tant qu'historien » (ou
`claude --agent historian`) donne l'historien, son garde-fou et sa ligne d'état ; `.claude/roles/<rôle>.md` dit ce que
chacun fait. Une session déjà ouverte avant ces réglages affiche « sans rôle » — normal. **Pas encore essayé dans une vraie
session neuve** : le premier lancement de demain est le test (la ligne d'état, la phrase, un refus sous `packages/`).
**Sa question ouverte, REPO-419** : un **rôle de manager** — la session sans rôle du 11/11 a fait ce travail toute la
journée ; peut-être le rôle par défaut. Mon avis lui est donné ; à trancher avec lui.

**12/11 — le rôle noté par session (non commité, en attente de son essai)** : deux consoles dans l'arbre de `main` se
volaient le rôle (une note par arbre). Corrigé : une note par session, passée d'une session à l'autre au `/clear`.
**À lui rappeler en fin de session, ou avant une compaction** : quitter la console de l'historien, la relancer en
historien, vérifier les deux lignes d'état (historien / codeur), puis `/clear` chez l'historien (doit rester historien) ;
ensuite je commite.

**À faire en ouvrant** :
- **commiter** les deux plans réécrits avec des noms (`files/plans/automation.md`, `files/plans/automation-online.md`) et le
  glossaire (trois termes) — écrits le 11/11, non commités ;
- **pousser**, sur son accord : `70d4760`, `8e4a7be`, `eb81084`, `a467cc7` et ce commit ;
- **sa 1100 en cours** (la Croatie ajoutée, l'Empire byzantin déjà en `Q12544`) est dans l'arbre de `main`, non commitée :
  quand il la dit finie, la commiter, puis reprendre `coder` sur `main` — ma correction `03d9f19` y tombera d'elle-même.

**L'automatisation, REPO-418** : les deux plans ci-dessus. **Décidé** (11/11) : l'agent passe par la même porte qu'un
contributeur ; une affirmation sans concurrente, à deux sources indépendantes, passe « attestée, non arbitrée ». **Ouvert** :
« une décision attend là où elle est enregistrée » (réexpliqué avec l'identifiant byzantin et la règle de date, pas encore
accepté) ; un hook qui refuse les choses désignées par un numéro dans `files/plans/` et `.claude/` (proposé, pas décidé —
il était trop tard). **La première automatisation proposée** : la synchronisation des arbres par un hook git.

**L'état** : `main` = le dépôt distant = `43e73f7` (l'Adriatique de l'historien, ses identifiants de 1200 et 1300) ; quatre
commits locaux devant. Mon worktree `coder`, branche `coder` (renommés le 11/11 ; avant, `baked-years` et
`atlas-396-speed`), sur `main` + `03d9f19` ; celui de l'historien (`historian-1109`) **sur `main`** — sa règle : chaque arbre
suit `main` dès qu'il bouge. **1000, 1400, 1500, 1600, 1700 ne se commitent pas** avant
d'être nettoyées (1000 copiée dans l'arbre de `main` par l'historien, **non listée** dans `index.json` — sa décision du 10/11,
on travaille avec en local). `tsx` est au catalogue depuis `f70b725` : `pnpm install` fait par lui.

**Sur le tableau** : En cours — **ATLAS-396** (restent : la pose en morceaux qui se met en pause, **à mesurer d'abord** —
`atlas year <année> aside` dans son navigateur, ~0,15 s le 08/11 ; puis les frontières et les noms dans le calculateur ; l'essai
des tribus dans le worker reste dans une remise git du worktree, aucun gain mesuré), ATLAS-408 (la provenance de 1300).
À valider — **CMS-414** (le lot géographique de l'historien, 41 cas à lui). À faire — **CORE-412** en bas (la projection
identique partout). Idées — **ATLAS-411** (le relief à 6,7 Mo non compressé). ATLAS-394 porte le point de la coupure réseau
pendant une préparation en arrière-plan.

**Dettes, à savoir** : les scénarios des hachures et des paliers du 09/11 pas écrits (`/scenarii-to-code` §7) ; la bande des
souverains absente du Cartographe (essai atlas seul) ; CARTO-365 (les rayures cuites côté Cartographe) ; le PNG du README
(`.github/brand-mark.png`) ne se régénère pas seul — à refaire si la marque change (dessiné par Core Graphics depuis
`brandMarkSvg(64)`).

**L'épique des villes, CARTO-363** : tout ce qui était dans À faire est fait et validé (367 à 371, 382, 384 à 391) ; CMS-391
montre dans l'atlas les seules villes cochées. **Ouverts, à sa décision** : une ville choisie puis écartée par un filtre
reste choisie (revue QUAL-004 de CARTO-390) ; CARTO-387, la boîte de la ville en panneau flottant. **Puis son plan** :
reprendre la retouche des frontières dans le Cartographe.

**Dessiner dans le Cartographe** (un agent, lui ou moi) : la skill **`/use-cartographer`** (07/11) ; son journal est
`references/journal.md`, local. **Un seul agent par carte** : une carte s'enregistre seule deux secondes après chaque geste.

**L'historien** : `/find-sources` (BnF dans chaque lot), `/enter-in-cms` ; après son export, **je commite `content/events.json`**.

**À lui, en attente** : la carte de 1100 montre-t-elle le 1ᵉʳ janvier ou le 31 décembre (Barbastro, prise le 18/10/1100) ?
`pnpm export:content` ; son icône `error.svg` à la place de la mienne ; **à arbitrer** : le suzerain du royaume d'Arles et
les lectures divergentes de l'historien (`files/plans/sources/1100.md`).

**Plus tard** : forcer le kit MCP en 1.32.0 à la prochaine relance de son CMS ; **CARTO-365**, des hachures cuites comme
une texture (_« sinon ça vibre »_).

**En cours** : le tableau, `/trello` → `list` — il juge l'état, plusieurs sujets en parallèle ; la liste n'est pas recopiée
ici.

**Le Cartographe** : une carte est un dossier de `years/` (`s19`) et s'enregistre d'elle-même deux secondes après chaque
geste, en plus de sa copie `.autosave` (gardées, sa décision). Sa 1100 d'avant dans `years/1100-backup-2026-11-02/`.

**Décidé par lui, à garder en tête** : l'importance qui ordonne la carte est **politique**, et au Moyen Âge le religieux en est
(_« le religieux et la politique, c'est la même chose »_) ; le Saint-Empire **n'a pas de capitale** ; le zoom est **un défilement à
crans** (_« des scroll top »_), plus rien de progressif sauf le rayon des noms ; **le nom du pays prime** sur un point sans nom.

**Le compte de test** : `claude-test@localhost.test`, mot de passe dans `packages/cms/.env.test-user` (ignoré par git) — me
connecter : mettre un temps `admin.autoLogin` avec `prefillOnly` dans `payload.config.ts` (lit ce fichier), cliquer, **retirer
aussitôt**. Je ne lis jamais le mot de passe ni un jeton dans la conversation (refusé par les permissions). À lui de le
supprimer dans « Contributeurs ».

**Quand il teste** : lui donner les valeurs exactes à saisir et le résultat attendu, en trois lignes ; lire sa base en
lecture seule (`sqlite3 "file:packages/cms/cms.db?mode=ro"`) plutôt que de deviner ce qu'il a enregistré.

**Ses arbitrages en attente** (une question à la fois) :

- **l'erreur des noms** (police, worker) n'est dite qu'en console — proposition du 28/10, pas tranchée.

**À savoir, laissé de côté** : un nom sur chaque îlot ; le trait parchemin de la frontière collé au brun à un zoom seulement
(un décalage en pixels dans le shader le réglerait) ; le flou ne suit aucune préférence système (A11Y-002) ; le filigrane des
noms est son choix (A11Y-001) ; l'encre blanche des tribus n'est pas floutée de près.

**Clore un ticket** : depuis le 29/10, le commentaire de clôture dit comment, où (fichier:ligne) et la correction clé avant →
après, posté par `commentfile` depuis un fichier (skill `/trello`, « The closing comment »).

**Ouvert par décision, à lui de trancher un jour** : les icônes animées (épées qui se balancent, trébuchet) ignorent
« réduire les animations » du système — un constat de la revue du 27/10, ATLAS-300 dans Idées.

**Pour faire ou régler une icône** : la skill `/make-event-icon` (une image plate se dessine dans un cadre 44 × 44). **Jamais de backtick, de `$(` ni de `$` dans un `perl -e` ou un `sed`
entre guillemets doubles** : le 27/10, ça a lancé le seed sur sa base — éditer par l'éditeur.

**Trois règles du CMS, toujours** :

- **Son serveur du CMS est le sien** : je ne le lance, ne le coupe ni ne le relance jamais.
- **Aucun changement de champ qui retire ou renomme sans migration** (CMS-276) : en mode push, Payload pose une question
  dans le terminal et tout attend derrière. Un champ **ajouté** passe sans question (vérifié le 26/10, `withDefault`).
- **Un `rm -rf` ne se glisse jamais dans une commande.**

**Une source qu'il donne** → `/create-data-mention`, toujours ; la liste vit sur ATLAS-152. Ses atlas :
`files/plans/sources/bibliotheque.md` (l'Italie et la Scandinavie manquent ; piste : Spruner-Menke 1880, domaine public).

**Pour travailler** : mon shell démarre sous Node 22 : préfixer `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. **Jamais
de `cd`.** **Jamais de `git add` d'une liste calculée** : nommer chaque fichier. Parler avec **ses** mots, un point à la fois.

**Le tableau** : `/trello` → `list`. Un élément du tableau est un **ticket**, jamais une « carte ». C'est lui qui dit l'état de chaque ticket : il n'est plus recopié ici (01/11).

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
montées, rapport `files/versions/2026-11-06.md`. **Le kit MCP forcé en 1.32.0** (six failles) : d'accord sur le
principe, **à faire à la prochaine relance de son CMS** — pas tant que l'historien y travaille (06/11).
**Dernier audit des instructions** (`/doctor prompt-audit`, une fois par semaine) : **08/11**, appliqué avec son accord le même matin (rapport `files/prompt-audit-2026-11-08.md` ; laissé ouvert : les
`allowed-tools` de `/repo-version-manager`, et les signalements de fin de rapport) ; le suivant dès le 15/11.

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
