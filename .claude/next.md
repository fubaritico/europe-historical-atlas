# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — après la nuit du 07 au 08/11 : son essai de CARTO-393, la barre d'ouverture

**D'abord, son essai de CARTO-393** (À valider) — **dans le worktree `.claude/worktrees/city-status-ring`, branche
`carto-393-opening-progress`, non commité**. Mon serveur est mort avec la session : le relancer depuis ce worktree
(`pnpm -C <worktree> dev:cartographer`, lire le titre du port d'abord), ou lui le sien après la fusion. Ce qu'il doit voir
(ses valeurs, sur le ticket) : sous la barre, « downloading the relief… », « compositing the relief » de 5 à 73 % qui avance
ligne à ligne, « tracing the coast… » à 73 %, « drawing the map » à 92 % ; jamais en arrière. **Après son « c'est bon »** :
`/commit` (scopes `core` et `cartographer` ; le scénario `s01` est dans le même lot), fusion dans `main`, ticket en Fait.
**À lui dire** : la barre de l'atlas avance aussi pendant la composition du relief (le même calcul).

**L'épique des villes, CARTO-363** : tout ce qui était dans À faire est fait et validé (367 à 371, 382, 384 à 391) ; CMS-391
montre dans l'atlas les seules villes cochées. **Ouverts, à sa décision** : une ville choisie puis écartée par un filtre
reste choisie (revue QUAL-004 de CARTO-390) ; CARTO-387, la boîte de la ville en panneau flottant. **Puis son plan** :
reprendre la retouche des frontières dans le Cartographe.

**À lui, dans l'arbre de travail, non commité — sa décision** : la retouche de 1100 par l'historien (Almudévar, Bolea,
Gurrea passés à Saragosse : `years/1100/polities.json`, et le scénario `s03` qu'il a écrit) ; `years/index.json` qui annonce
**1200** (son « Enregistrer sous » ; le dossier `years/1200/` existe) — commiter l'un ou l'autre le publie. **Les numéros des
ports fixes** (REPO-383 ; ma proposition : l'atlas 5173, le Cartographe 5174).

**Dessiner dans le Cartographe** (un agent, lui ou moi) : la skill **`/use-cartographer`** (07/11) ; son journal est
`references/journal.md`, local. **Un seul agent par carte** : une carte s'enregistre seule deux secondes après chaque geste.

**L'historien** : `/find-sources` (BnF dans chaque lot, copies en ligne lisibles jamais liées), `/enter-in-cms` ; **dimanche
08/11** *« racler les fonds de tiroir »* (sa décision du 06/11). Après son export, **je commite `content/events.json`**.

**À lui, en attente** : la carte de 1100 montre-t-elle le 1ᵉʳ janvier ou le 31 décembre (Barbastro, prise le 18/10/1100) ?
`pnpm export:content` ; son icône `error.svg` à la place de la mienne ; **à arbitrer** : le suzerain du royaume d'Arles et
les lectures divergentes de l'historien (`files/plans/sources/1100.md`).

**Plus tard** : forcer le kit MCP en 1.32.0 à la prochaine relance de son CMS ; **CARTO-365**, des hachures cuites comme
une texture (_« sinon ça vibre »_).

**L'interface de l'atlas — l'épique ATLAS-329** : la maquette de Claude Design (v2, son contenu inventé, ne pas le juger)
vit dans `files/resources/claude-design/`, une seule version. Je reprends son travail en jetons et styles dans
`fubaritico-ds` ; lui dessine dans Illustrator ornements et cartouches. **Prochaine étape** : la découper en tickets, avec
lui. Ornements par époque : `files/plans/atlas/ornament-by-era.md`.

**En cours — où en est chaque ticket** (il juge l'état, plusieurs sujets en parallèle) :

- CMS-338, chaque source liée à une année et à sa question — ce que l'historien fait depuis le 05/11 ; l'écran manque.
- CARTO-334, l'import de Cliopatria aux côtes calées — 1100 faite et publiée (`b02ce87`) ; l'outil reste un script.
- ATLAS-156, les repères 3D des villes et événements — les icônes en cours (épique icônes).
- ATLAS-152, la provenance de 1100 affichée — la liste des sources tenue sur le ticket.
- ATLAS-295, les villes sur la carte — 113 villes de 1100, par paliers de détail.
- ATLAS-333, changer d'année en deux secondes — se ferme quand une seconde carte est finie par lui.
- CORE-337, trancher entre les cartes — les hachures faites (CARTO-364), le vote pas encore.
- CARTO-193, chaque ville du bon côté — attend les pays de l'historien.
- CMS-279, une base d'essai — commencée.
- ATLAS-134 et ATLAS-136, maquettes et légende — sous l'épique ATLAS-329.
- CMS-281 et CMS-282, les écrans des périodes d'un lieu et du registre des sources — l'habillage de Payload fait (CMS-283).
- CMS-225, amorcer les événements depuis Wikidata.

**Le Cartographe** : une carte est un dossier de `years/` (`s19`) et s'enregistre d'elle-même deux secondes après chaque
geste, en plus de sa copie `.autosave` (gardées, sa décision). Sa 1100 d'avant dans `years/1100-backup-2026-11-02/`.

**Le gestionnaire de sources** : CMS-332, `files/plans/contribution/source-manager.md` — tout se construit tel qu'écrit, par
moi, boîte mail comprise, chaque mail sur son clic, et piloté à la voix par le plugin MCP de Payload.

**Les villes, où on en est** (ATLAS-295, en cours) : **113 villes de 1100** dans sa base et dans le fichier de l'atlas ; dessinées
par paliers de détail (`files/plans/atlas/detail-levels.md`, dix décisions), noms selon la distance à la caméra, un point de capitale
sur un nom de pays cède (ATLAS-323). **En attente, à lui de trancher un jour** : les sièges que ni Wikidata ni la carte de la Rus'
ne datent (Roskilde, Nidaros) ; les villes qu'aucune des trois sources n'atteste (la Géorgie — Koutaïssi, Tbilissi —, Uppsala,
Sigtuna, Ispahan) — une source de plus, ou Wikidata seul, jamais inventées. **Toujours dû** (demandé le 30/10) : un système de
sources qui accompagne toute saisie (lieux, événements) — devenu le **gestionnaire de sources**, CMS-332 (01/11, Backlog ;
`files/plans/contribution/source-manager.md`). **L'incertitude** : n'en parler que quand un algorithme existe.

**Décidé par lui, à garder en tête** : l'importance qui ordonne la carte est **politique**, et au Moyen Âge le religieux en est
(*« le religieux et la politique, c'est la même chose »*) ; le Saint-Empire **n'a pas de capitale** ; le zoom est **un défilement à
crans** (*« des scroll top »*), plus rien de progressif sauf le rayon des noms ; **le nom du pays prime** sur un point sans nom.

**Le compte de test** : `claude-test@localhost.test`, mot de passe dans `packages/cms/.env.test-user` (ignoré par git) — me
connecter : mettre un temps `admin.autoLogin` avec `prefillOnly` dans `payload.config.ts` (lit ce fichier), cliquer, **retirer
aussitôt**. Je ne lis jamais le mot de passe ni un jeton dans la conversation (refusé par les permissions). À lui de le
supprimer dans « Contributeurs ».

**Quand il teste** : lui donner les valeurs exactes à saisir et le résultat attendu, en trois lignes ; lire sa base en
lecture seule (`sqlite3 "file:packages/cms/cms.db?mode=ro"`) plutôt que de deviner ce qu'il a enregistré.

**Ses arbitrages en attente** (une question à la fois) :
- **l'erreur des noms** (police, worker) n'est dite qu'en console — proposition du 28/10, pas tranchée.

**À savoir, laissé de côté** : un nom sur chaque îlot ; le trait parchemin de la frontière collé au brun à un zoom seulement
(un décalage en pixels dans le shader le réglerait) ; le flou ne suit aucune préférence système (A11Y-002) ; le filigrane à
40 % est son choix (A11Y-001) ; l'encre blanche des tribus n'est pas floutée de près.

**Clore un ticket** : depuis le 29/10, le commentaire de clôture dit comment, où (fichier:ligne) et la correction clé avant →
après, posté par `commentfile` depuis un fichier (skill `/trello`, « The closing comment »).

**Pièges, à ne pas refaire** : empiler des règles visuelles — quand il est perdu, **s'arrêter et lui donner la règle en trois
lignes** ; deviner un chiffre dans un test ; une demande répétée après un refus d'outil est **la même** demande ; « flou » =
flou d'image ; parler franglais ; deux sondes dans un même onglet ; `delete` d'une propriété de `window`. **Et ceux du
29/10 jour** : **relire le code avant de proposer un remède** (le nom court ne s'écrit que là où le complet ne tient pas) ;
**jamais de `cd`**, même pour revenir à la racine ; quand sa phrase peut désigner deux options, dire celle que je comprends
avant d'agir.

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

**6 489 tests** sur `main` (1 849 `core` · 2 604 Cartographe · 1 495 atlas · 372 CMS · 169 plugin `eslint-plugin-eha`, 07/11, après CARTO-370), gate
verte sur cinq contrôles (`lint`, `type-check`, `test`, `build`, `format:check`). Le chunk worker reste sans
three.js et le Cartographe émet le même, au même hash — vérifié par la CI.

`git log origin/main..main` lit une référence de suivi **qui peut être périmée** : pour la vraie réponse,
`git ls-remote origin main` contre `git rev-parse HEAD`.

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **public** depuis le 19/10, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app** — 1100 y est publié, refaite depuis Cliopatria le 06/11 (`b02ce87`) |
| CI    | huit jobs — validate ×4 (lint, type-check, test, format), build, sonarqube, quality-gate, deploy — **verte depuis le 21/10, sous Node 24** |
| Sonar | `europe-historical-atlas` sous l'organisation `fubaritico`                  |

**Dernier contrôle des versions** : 2026-11-06 — 35 à jour proposées (8 alertes de sécurité, toutes dans le CMS), 0
montées, rapport `files/versions/2026-11-06.md`. **Le kit MCP forcé en 1.32.0** (six failles) : d'accord sur le
principe, **à faire à la prochaine relance de son CMS** — pas tant que l'historien y travaille (06/11).
**Dernier audit des instructions** (`/doctor prompt-audit`, une fois par semaine) : **08/11** (rapport `files/prompt-audit-2026-11-08.md`, rien appliqué, 41 constats à prendre avec lui) ; le suivant dès le 15/11.

**Cinq paquets**, orchestrés par **Turbo**, avec un **catalogue de versions** dans `pnpm-workspace.yaml` :
`core` (pure TS, ni three.js ni DOM ni React ni zustand — tenu par ESLint et `tsc`, tests sous **`node`**),
`atlas` (three.js vanille, `jsdom`), `cartographer` (React 19 + Vite, **sa propre config ESLint** qui
réimporte la racine, son `publicDir` est celui de l'atlas), `cms` (Payload 3 + Next, son serveur est celui du dev,
tests sous `node`), `eslint-plugin-eha` (nos règles de lint).

**Trois faits de structure à ne pas re-découvrir** : *flat config n'a aucune cascade*, donc la config d'un
paquet **réimporte** la racine et ESLint résout **une** config depuis le **répertoire courant** — d'où un
`lint` par paquet · `core` tourne sous **`node`** parce que jsdom lui prêterait un `document` que la
production n'a jamais · la **couverture est fusionnée** par `scripts/merge-coverage.mjs`, parce que chaque
paquet écrit `SF:src/…` et que Sonar résout depuis la racine (sinon **0 % sans erreur**).

**Un seul serveur de dev, le sien** : jamais un second ; son port bouge (5173 le 07/11, REPO-383) — lire le titre d'abord.

## ▶ P4, LE CARTOGRAPHE — les cinq étapes

> **À relire à chaque ouverture de session** — demande du dev, 27/09 : *« ça c'était clair, et tu me le
> réponds à chaque prochaine session, parce qu'avec ça je comprends bien et je me souviens bien. »*
> L'ordre est dicté par les dépendances, pas par une préférence.

| | c'est quoi | ça livre quoi | on sait que ça marche comment |
| --- | --- | --- | --- |
| **1** ✅ | Les **types** des trois fichiers + trois **lecteurs** écrits à la main, dans `packages/core/src/data/` à côté de `heightmap.ts` et `landMask.ts`, derrière `assetError.ts`. Plus l'**adaptateur** vers `RegionPayload` | **L'atlas lit une année écrite à la main et l'affiche.** Zéro ligne de `src/` modifiée | on écrit un dossier `1100/` à la main, `pnpm dev`, la carte s'affiche |
| **2** ✅ | Le **modèle de document** : les ancres une fois, les anneaux en index, et les opérations — poser, déplacer, supprimer, **dupliquer un tracé**, fermer un anneau. Plus la **dérivation des frontières** | Un document qu'on manipule dans des tests, sans écran | un aller-retour sauvegarde/chargement **conserve le partage** : on bouge une ancre après, les deux contours suivent |
| **3** ✅ | L'**historique** : un instantané par geste, plus la ligne que `{History}` lit et les **jalons** | `ctrl+z`, et cliquer un rang | même piège : restaurer doit restaurer le **partage**, pas les coordonnées |
| **4** ✅ | Le **canevas 2D**, coupé en deux : l'**arithmétique** (hit-test, marquise, élastique, écran↔monde) qui est pure, et le **dessin**, une coquille sans logique | On dessine à l'écran | l'arithmétique se teste avec des littéraux — et c'est cette coupe qui la rend testable du tout |
| **5** ◀ | Le **chrome** : `{Polities}` en arbre, les formulaires, `{Overrides}`, les trois marques d'année dérivée | L'application | les valeurs viennent de `design/chrome.css`, jamais son markup |

Les étapes **4 et 5 ont créé `packages/cartographer/`** — une application, comme la taxonomie du dev
dans `architecture.md` : Payload est une app, l'atlas est une app, `core` est une ressource.

**Comment** : chaque étape se vérifie et **se commite seule**, pas d'accumulation. `core` reste sans
three.js et sans DOM, donc les étapes 1, 2 et 3 sont **entièrement pures**. Chaque garde se teste **en la
cassant exprès**. Gate à chaque fois : `pnpm type-check && pnpm lint && pnpm test`, puis `/review`, puis
`/commit`.

**La vulnérabilité bloquante est fermée** (27/09, étape 2). Une seule invariante y suffit : **le tableau
d'ancres ne perd jamais rien pendant l'édition.** Donc `removePolity` retire une *revendication*, jamais un
point — les ancres de côte d'un pays sont aussi celles de son voisin. Ce qui n'est plus référencé disparaît
à l'enregistrement, par une seule renumération. Vérifié en la cassant : 3 tests tombent.

> Le design system branché, la skill à ouvrir avant de coder et les trois décisions de l'étape 4 sont dans
> `rules/cartographer.md` depuis le 21/10 — chargé dès qu'un fichier du Cartographe est touché.

## Comment répondre, dans ce projet

- **Une convention qu'il nomme se vérifie dans tous ses dépôts voisins** (`~/Desktop/WebstormProjects/`), pas un seul.
- **Lire les `scripts` du `package.json` avant de mesurer le comportement d'un outil** : c'est eux qui disent comment il
  est lancé.
- **Quand il a tranché, exécuter** — pas argumenter la mesure.
- **Pas de question sans arbitrage** : son test, *« c'est quoi la décision qu'il y a à prendre là ? »*
- **Tout problème arrive avec son remède et sa criticité.** Jamais une liste de risques sans décision.
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.
