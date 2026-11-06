# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — après une coupure de 2-3 jours (05/11 au soir) : essayer le tronçon, puis la fiche (CARTO-345)

**Où on en est** (CARTO-345, En cours) : le collage d'**un pays entier** est dans `main`, branché sur ‹⌘V› et Édition ›
Coller les entités — **essayé par lui, la Livonie a marché** (05/11). Le collage d'**un tronçon** est dans `main` aussi
(`e833792`), branché sur ‹⌘V› et Édition › Coller le tronçon sur … — **personne ne l'a essayé** : fusionné à sa demande
(*« on s'en branle, fusionne, ça avance pas »*). **Au retour** : lui faire essayer le tronçon sur sa Pologne (dans la
sauvegarde, ‹A›, quelques points qui se suivent, ‹⌘C› ; dans sa 1100, la Pologne sélectionnée, ‹⌘V›) ; puis **la fiche**
(Coller la fiche…, la boîte champ par champ, `s22` « # 3 »), **construite et branchée d'un bloc** jusqu'à ce qu'il puisse
l'essayer — jamais un morceau dans `core` seul (sa colère du 05/11). Restent ouverts : la boîte du nom déjà pris (dit
dans la barre d'état aujourd'hui) ; les points d'un tronçon collé ne sont pas sélectionnés. **Mis de côté par lui** : la
sélection de plusieurs pays. **Ses décisions du 05/11**, dans le plan `copy-paste-between-maps.md` : pas de découpe ni de
creusement (*« quand tu colles, tu colles »*) ; le suzerain retrouvé par son nom ; entre deux points soudés, le tracé suit
le voisin. **Lui parler par son cas** (sa Pologne), jamais par « tronçon » ni « bouts ».

**Sa demande de fin de session** : CARTO-360 (Idées) — un champ de recherche dans {Polities} et {Cities}, filtre ou
défilement jusqu'au meilleur résultat.

**La copie à part** `~/Desktop/WebstormProjects/europe-map-copypaste` (branche `carto-345-paste`, au niveau de `main`) : on
y a construit le collage. Elle garde, ignorées par git, une copie de sa sauvegarde et `1100-essai-collage` (sa 1100 du
05/11 après-midi), à recopier. **Gardée pour la fiche** (sa décision) : la remettre au niveau de `main`.

**L'interface de l'atlas — ATLAS-329, la maquette d'ambiance de Claude Design, v2** (05/11). Le contenu des pages est
inventé, ne pas le juger. **Tout ce que Claude Design fait pour l'écran de l'atlas vit dans `files/resources/claude-design/`**
(sa décision, 05/11) : `atlas-html/` (README = ses règles : palette, fontes, cadre, capsule, boutons ; `planches/` ;
`images/`, nos captures), `atlas-png/` (les écrans, bureau, tablette, téléphone ; les modifiés marqués « v2 »),
`prompts_claude_design.md` (ses prompts du logo par époque). **Une seule version, pas d'historique** (sa décision) : la
v1 est à la corbeille. **Mon rôle** : je reprends son travail — jetons et styles dans `fubaritico-ds`. **Lui** : dessine
dans Illustrator les ornements et les cartouches du logo (*« Claude Design est catastrophique pour les ornements »*) ;
je lui donne les repères de taille. **Ses idées à garder** : un bandeau d'en-tête plus foncé ;
le plein écran (ordinateur et iPad). **Prochaine étape** : découper en tickets, avec lui. Ornements et logo par époque :
`files/plans/atlas/ornament-by-era.md` (§ 5b : ses quatre époques ; les deux du XXᵉ hors de l'atlas ; « Fontainebleau »
mal placé au XIXᵉ ; les Temps modernes XVIIᵉ ou XVIIIᵉ, à lui de choisir).

**Ses décisions du 05/11, écrites** : l'atlas va **idéalement du Iᵉʳ siècle av. J.-C. à 1900** (`roadmap.md`), sans
habillage contemporain ; **un habillage par époque** (glossaire) ; **la frise synchronoptique** (ATLAS-358, Idées),
d'après **Arno Peters, *Synchronoptische Weltgeschichte*** (son scan de cinquante ans) : **cinq couches** (période,
guerres, politique, personnalités, civilisation), un nom et des dates, le texte au clic dans le panneau, seulement ce qui
a un lieu sur la carte ou encadre l'année, **les événements du CMS partagés avec la carte** (`interface-scenarios.md`) ;
**le nom des mers** (ATLAS-359, Idées). **À lui** : CARTO-239 (la barre de menus) est construite et encore en À faire.

**L'historien** (`europe-map-9b`) : il commence par `/enter-in-cms`, qui vérifie d'abord la connexion `cms`. **Toujours
dû** : les pays des villes de 1100 (Groenland → Q16488964, Islande → Q62389, Venise → Q4948), puis l'export — **alors je
commite `content/events.json`**, pas avant (sa décision).

**Sur `main`, non poussés** : depuis `49a623d` — dont le collage (`41a184c` → `e833792`), `3b90207` de l'historien (la
Serbie et la Dioclée en 1100) et le commit de clôture du 05/11 au soir. `years/` et `content/events.json` restent hors
commit (les siens).

**Où en sont les tickets** : CARTO-345 En cours ; **CARTO-193** (Villes) attend les pays de l'historien ; **ATLAS-333**
(vitesse) ne se ferme qu'une fois une seconde carte terminée par lui, côtes comprises (05/11). **À lui** : la décision sur
le stockage du navigateur pour la disposition des panneaux (`rules/known-issues/cartographer.md`).

**Le Cartographe** : une carte est un dossier de `years/` (`s19`) et s'enregistre d'elle-même deux secondes après chaque
geste, en plus de sa copie `.autosave` (gardées, sa décision). Sa 1100 d'avant dans `years/1100-backup-2026-11-02/`.
**À lui** : supprimer `packages/cartographer/.autosave/`. Exporter le CMS : `pnpm export:content`, puis recharger.

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

**6 261 tests** sur `main` (1 783 `core` · 2 424 Cartographe · 1 495 atlas · 372 CMS · 169 plugin `eslint-plugin-eha`, 05/11 au soir, après le collage), gate
verte sur cinq contrôles (`lint`, `type-check`, `test`, `build`, `format:check`). Le chunk worker reste sans
three.js et le Cartographe émet le même, au même hash — vérifié par la CI.

`git log origin/main..main` lit une référence de suivi **qui peut être périmée** : pour la vraie réponse,
`git ls-remote origin main` contre `git rev-parse HEAD`.

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **public** depuis le 19/10, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app** — 1100 y est publié (16/10) |
| CI    | huit jobs — validate ×4 (lint, type-check, test, format), build, sonarqube, quality-gate, deploy — **verte depuis le 21/10, sous Node 24** |
| Sonar | `europe-historical-atlas` sous l'organisation `fubaritico`                  |

**Dernier contrôle des versions** : 2026-11-06 — 35 à jour proposées (8 alertes de sécurité, toutes dans le CMS), 0
montées, rapport `files/versions/2026-11-06.md`. **Le kit MCP forcé en 1.32.0** (six failles) : d'accord sur le
principe, **à faire à la prochaine relance de son CMS** — pas tant que l'historien y travaille (06/11).
**Dernier audit des instructions** (`/doctor prompt-audit`, une fois par semaine) : **01/11** ; le suivant dès le 08/11.

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

**Un seul serveur de dev** : le dev fait tourner le sien (`pnpm dev:cartographer`, souvent sur 5174). Ne pas
en lancer un second ; lui donner l'adresse du sien.

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
