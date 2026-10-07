# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`).
> **The plan of record is `files/plans/plan.md`.** This file is the short pointer to it.

## Where we are

**1771 tests** (621 `core` · 782 atlas · 368 Cartographe), gate verte sur cinq contrôles (`lint`,
`type-check`, `test`, `build`, `format:check`). Worker à **13 490 o**, toujours sans three.js — et depuis
le 07/10 le Cartographe émet **le même chunk, au même hash**, le fond étant cuit par le même port.
`git log origin/main..main` dit ce qui attend un push. Le dépôt est **en ligne et déployé** :

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **privé**, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app**                             |
| CI    | sept jobs, tous verts — validate ×3, build, sonarqube, quality-gate, deploy |
| Sonar | opérationnel, `europe-historical-atlas` sous l'organisation `fubaritico`    |

Structure : **trois paquets**, orchestrés par **Turbo**, avec un **catalogue de versions** dans
`pnpm-workspace.yaml`.

| paquet | ce que c'est | lint | tests |
| --- | --- | --- | --- |
| `core` | pure TS, ni three.js ni DOM ni React ni zustand — **tenu par ESLint et par `tsc`**. Cinq couches : `utils`, `geo`, `data`, `pipeline`, `editor` | config racine | **`node`**, 621 |
| `atlas` | l'application 3D, three.js vanille | config racine | `jsdom`, 782 |
| `cartographer` | l'éditeur de territoires, React 19 + Vite 8. Son `publicDir` **est** celui de l'atlas | **sa propre config**, qui réimporte la racine | `jsdom` + plugin React, 368 |

**Trois faits de structure à ne pas re-découvrir** : *flat config n'a aucune cascade*, donc la config d'un
paquet **réimporte** la racine et ESLint résout **une** config depuis le **répertoire courant** — d'où un
`lint` par paquet · `core` tourne sous **`node`** parce que jsdom lui prêterait un `document` que la
production n'a jamais · la **couverture est fusionnée** par `scripts/merge-coverage.mjs`, parce que chaque
paquet écrit `SF:src/…` et que Sonar résout depuis la racine (sinon **0 % sans erreur**).

`zod/mini` est une dépendance de `core` : **+9,15 ko gzip** pour tout le format, mesuré, et **zéro octet**
dans le chunk worker (13 490 o, hash inchangé — toujours vérifié par la CI).

## ▶ P4, LE CARTOGRAPHE — les cinq étapes

> **À relire à chaque ouverture de session** — demande du dev, 27/09 : *« ça c'était clair, et tu me le
> réponds à chaque prochaine session, parce qu'avec ça je comprends bien et je me souviens bien. »*
> L'ordre est dicté par les dépendances, pas par une préférence.

| | c'est quoi | ça livre quoi | on sait que ça marche comment |
| --- | --- | --- | --- |
| **1** ✅ | Les **types** des trois fichiers + trois **lecteurs** écrits à la main, dans `packages/core/src/data/` à côté de `heightmap.ts` et `landMask.ts`, derrière `assetError.ts`. Plus l'**adaptateur** vers `RegionPayload` | **L'atlas lit une année écrite à la main et l'affiche.** Zéro ligne de `src/` modifiée | on écrit un dossier `1100/` à la main, `pnpm dev`, la carte s'affiche |
| **2** ✅ | Le **modèle de document** : les ancres une fois, les anneaux en index, et les opérations — poser, déplacer, supprimer, **dupliquer un tracé**, fermer un anneau. Plus la **dérivation des frontières** | Un document qu'on manipule dans des tests, sans écran | un aller-retour sauvegarde/chargement **conserve le partage** : on bouge une ancre après, les deux contours suivent |
| **3** ✅ | L'**historique** : un instantané par geste, plus la ligne que `{History}` lit et les **jalons** | `ctrl+z`, et cliquer un rang | même piège : restaurer doit restaurer le **partage**, pas les coordonnées |
| **4** ◀ | Le **canevas 2D**, coupé en deux : l'**arithmétique** (hit-test, marquise, élastique, écran↔monde) qui est pure, et le **dessin**, une coquille sans logique | On dessine à l'écran | l'arithmétique se teste avec des littéraux — et c'est cette coupe qui la rend testable du tout |
| **5** | Le **chrome** : `{Polities}` en arbre, les formulaires, `{Overrides}`, les trois marques d'année dérivée | L'application | les valeurs viennent de `design/chrome.css`, jamais son markup |

Les étapes **4 et 5 créent `packages/cartographer/`** — un troisième paquet, comme la taxonomie du dev
dans `architecture.md` : Payload est une app, l'atlas est une app, `core` est une ressource.

**Comment** : chaque étape se vérifie et **se commite seule**, pas d'accumulation. `core` reste sans
three.js et sans DOM, donc les étapes 1, 2 et 3 sont **entièrement pures**. Chaque garde se teste **en la
cassant exprès**. Gate à chaque fois : `pnpm type-check && pnpm lint && pnpm test`, puis `/review`, puis
`/commit`.

**La vulnérabilité bloquante est fermée** (27/09, étape 2). Une seule invariante y suffit : **le tableau
d'ancres ne perd jamais rien pendant l'édition.** Donc `removePolity` retire une *revendication*, jamais un
point — les ancres de côte d'un pays sont aussi celles de son voisin. Ce qui n'est plus référencé disparaît
à l'enregistrement, par une seule renumération. Vérifié en la cassant : 3 tests tombent.

## ▶ ON REPREND ICI — `4d-3` est fini, la suite est `4d-2`

**L'étape 4 en est là** : `4a` (le store), `4b` (`view/`), `4c` (`geometry/`), `4d-1` (le canevas qui
dessine et navigue) et **`4d-3` (le fond, servi et peint)** sont **faits**. Il reste **`4d-2`**, les deux
outils.

**Ce que `4d-3` a livré le 07/10**, et les quatre choses à ne pas re-découvrir :

1. **`publicDir` du Cartographe → `../atlas/public`.** Zéro octet dupliqué, et c'est ce qui garantit que
   le fond est *la* texture de l'atlas plutôt qu'une copie. La garde GPL de `build.yml` est élargie à
   **`packages/*/dist`** — prouvée en la faisant tirer : localement, où les fichiers GPL existent, elle
   trouve les deux `dist/borders`. Le favicon dupliqué du 05/10 est supprimé, il n'y a qu'un `public/`.
2. **Le fond passe par le port `TerrainBake`, dans le worker** —
   `core/pipeline/computeWorker?worker`, le même import que `atlas/src/main.ts`, même chunk, **même hash,
   13 490 o**. Donc les ~1,8 s de cuisson ne gèlent rien, et `onProgress` donne une progression
   **mesurée** au lieu d'une barre qui s'anime au chronomètre. `canvas/backdrop.ts` a disparu : il cuisait
   sur le thread principal, ce qui aurait rendu invisible l'état d'attente qu'on affiche au-dessus.
3. **Le terrain est nu parce que `computePolitical` n'est jamais appelé.** Pas de `clearPolitical` à
   oublier — gardé par un test qui assère que ni l'un ni l'autre n'est appelé.
4. **`ARCH-102` est fermé** : le repère vient de `dem.meta` (`frameFromHeightmap`), plus aucun littéral en
   production. `view/backdropFrame.ts` est devenu `view/testFrame.ts` / `TEST_BACKDROP_FRAME`, **fixture
   de test uniquement**, et un test interdit à la production de l'importer. `boundsMatch` est enfin
   branché : un masque qui ne couvre pas le sol du relief est refusé en `semantic` avant toute cuisson.

**Mesuré** : Cartographe 219,65 → **241,22 ko / 76,44 ko gzip** (+7,81 ko pour tout le fond).
**1655 → 1691 tests.**

**Le bug que la revue a trouvé, et qui n'aurait mordu qu'en dev** : un garde « charger une seule fois »
écrit comme un **booléen** dans un ref est faux sous `StrictMode` — le cleanup fantôme annule la seule
promesse en vol et l'éditeur reste en attente **pour toujours**. Ce qu'il faut tenir dans le ref est la
**promesse**, chaque invocation attachant son propre écouteur. Détail et mécanisme dans `known-issues.md`,
parce que l'étape 5 va charger d'autres choses.

### La promesse de `4d-3` que l'étape 5 doit tenir

**Décision du dev, 07/10 : si un asset du fond manque, les deux sont bloquants — mais l'application
s'ouvre quand même.** Seule la **zone canevas** est bloquée : pas de carte, le vélin nu, un message
`role="alert"`. Les autres zones s'affichent **à l'état de repos**, ce que le `Background` de `s00`
spécifie déjà (*« no file is loaded »*, `{Polities}` vide, Undo et Redo désactivés).

**Ce qui n'est pas fait, parce que le chrome n'existe pas encore** : *« tout ce qui dépend du fond doit
être désactivé »*. L'ordre qu'il a posé est **le fond cuit d'abord, l'année posée dessus ensuite** — sans
le repère du DEM, une frontière n'a rien contre quoi se projeter. Donc à l'étape 5 : `[Open…]`, les deux
outils et `[Save]` sont **désactivés tant que le fond n'est pas prêt**, et c'est `MapArea` qui sait s'il
l'est. Le repli par altitude (`createElevationLandMask`) reste à l'atlas et **n'entre pas** ici : une côte
discrètement fausse serait relue comme un mauvais tracé de l'auteur pendant toute la vie de l'année.

### Offline et online — tranché le 06/10, et c'est écrit

| | |
| --- | --- |
| **le geste ne change pas** | l'auteur fait ‹ctrl+s› dans les deux modes et n'a pas à savoir lequel. Seule la **destination** change — c'est ce qui fait des deux modes un choix de câblage et non deux produits |
| **offline** (aujourd'hui) | trois fichiers par année (`registry`/`polities`/`borders.json`) + le manifeste `years/index.json`. Ils vont dans `packages/atlas/public/years/<année>/`, commités, et l'atlas les lit par **URL relative** comme le DEM |
| **online** (plus tard) | une **Netlify Function** tenant le token **côté serveur** commite les fichiers ; la CI rebuild et redéploie. Plan payé, donc disponible |
| **refusé** | un *blob store* lu à l'exécution pour les années publiées — la donnée sortirait du build, donc les deux gardes CI cesseraient de la couvrir, et git garde l'historique qu'un bucket ne garde pas |
| **la coupe si autosave un jour** | brouillons dans un store, **années publiées dans git** |

Tout le flux est en **scénarios d'intégration** dans
`files/plans/cartographer/scenarii/s15-offline-and-online.md` — les deux modes, les pannes qui décident
réellement la conception, et **quatre trous neufs : H-27 à H-30**. Le plan porte le résumé (`plan.md`,
section « Offline and online » sous P5).

### Un déclencheur à ne pas perdre

`mapPipeline.ts:97` lit **encore** `/borders/europe-<année>.json` — les 21 payloads GPL-3.0, présents sur
la machine du dev (6,5 Mo, gitignorés, donc **jamais dans git ni en production**). Le jour où 1100 est
dessiné, il faut **supprimer `borders/` et son lecteur `unauthored`**. C'est le moment où le dépôt cesse
d'avoir du GPL *sur la machine*, pas seulement hors de git.

### La skill à ouvrir avant de coder

`/scenarii-to-code` (écrite le 06/10) : charger le `s00` du jeu, le scénario qui gouverne, et `s99` ;
faire de chaque `Then` **une assertion ou un manque déclaré** ; et ne jamais écrire dans un commentaire
une promesse qu'une étape ultérieure doit tenir — elle va dans `next.md` ou `known-issues.md`, les deux
seuls fichiers relus à chaque session. Elle existe parce que `4d-1` a livré une JSDoc, écrite deux étapes
plus tôt, promettant un cache que `4d-1` n'a pas construit.

### La suite de l'étape 4, découpée

| | quoi | on sait que ça marche comment |
| --- | --- | --- |
| **4d-3** ✅ | `publicDir` partagé, garde GPL élargie, fond cuit dans le worker, repère lu du DEM, état d'attente | `pnpm dev:cartographer` : on voit le relief **à faire confirmer par le dev** |
| **4d-2 (a)** ✅ | la côte et les fleuves **en vecteurs** : `chainSegments` dans `core`, `vectorLayers.ts`, le dessin sous `setTransform` | `pnpm dev:cartographer` : le trait de côte épouse la limite terre/mer du relief |
| **4d-2 (b)** ✅ *à moitié* | la **barre d'état** : la position du pointeur en `2°21′E 48°51′N`, écrite **impérativement**, vide hors de la carte | on survole, la position suit |

**Ce que la barre d'état ne dit pas encore, et `s01` le demande** — déclaré plutôt que laissé croire fini :
le **pays sous le pointeur** (`· unclaimed`, `· Holy Roman Empire · empire`), qui attend qu'une année soit
dessinée · l'**échelle en km par pixel écran**, dont l'arithmétique existe déjà (`view/resolution.ts`,
`kmPerScreenPixel`) et qu'il suffira de brancher · le **résumé du document** (`51 polities · 16 579
vertices · unclaimed land 55 %`) · et l'avertissement `backdrop resolution exceeded` quand `scale > 1`
(`isBackdropExceeded`, écrit et sans appelant). Son **placement et son style sont provisoires** : à
l'étape 5 elle passe dans le chrome et ses valeurs viennent de `design/chrome.css`.

| **4d-2 (b′)** | le **second canevas**, l'overlay — **déplacé en tête de (d)**, parce qu'il n'a rien à peindre tant qu'aucun outil n'existe : l'élastique, la marquise et l'ancre surlignée sont tous des gestes d'outil, et le document est vide. Le livrer seul serait l'erreur du 06/10 (du code qu'aucun appelant n'atteint) | |

**Traité en chemin le 07/10, à la demande du dev** : la fluidité du zoom (coalescence sur
`requestAnimationFrame`, élagage au viewport, décimation au pixel écran) — jugée **acceptable**, le reste
étant l'image du relief redimensionnée par frame (`known-issues`). Et le **plafond de zoom passé de 8 à
32**, parce que le 8 reposait sur les cellules de 1,9 km du raster **de l'atlas**, que le Cartographe
n'utilise pas : il stocke des degrés à six décimales et dérive ses frontières des ancres *partagées*. À
32, un pixel écran fait ~240 m de terrain — et c'est **moins cher** à dessiner que la vue d'ouverture,
l'élagage mordant d'autant plus qu'on est zoomé.

| **4d-2 (c)** | `[+ New polity]`, la **bannière de cible**, et la plume qui **refuse** sans cible (`s02`) | on sait toujours pour qui on dessine |
| **4d-2 (d)** | les deux outils câblés sur `documentEdits` et `history` | on dessine, `ctrl+z` défait le geste |
| **5** | le chrome : `{Polities}` en arbre, les formulaires, `{Overrides}`, **et les contrôles désactivés tant que le fond n'est pas prêt** | les valeurs viennent de `design/chrome.css` |

**Deux faits mesurés à `4d-2 (a)`, à ne pas re-découvrir.** La côte sort de marching squares en **segments
indépendants** — 95 212 à la résolution de l'atlas — et il faut les **chaîner** : pas d'abord pour la
vitesse, mais parce que `s02` insère *« le sous-chemin de côte entre les deux clics »*, ce qui n'a aucun
sens dans un nuage. Chaînés : **2 029 contours**, 47× moins de sous-chemins et moitié moins de points. Et
les jonctions coïncident **au bit près** (le producteur est déterministe), donc la clé est exacte : un
epsilon souderait deux rives qui se frôlent dans un détroit. Chiffres et argument dans
`files/spikes/coastline-volume/`.

**Les fleuves sont tous dessinés, sans seuil de zoom** — palier le plus léger, `s00` ne demande pas de
niveau de détail. Si c'est illisible au cadrage continental, c'est deux lignes et ça se décide à l'œil.

### Trois choses décidées pour l'étape 4, à ne pas re-trancher

1. **Le repère du canevas est celui du fond**, pas la zone éditoriale — voir `known-issues` (deux boîtes).
2. **Deux canevas** : un statique redessiné au commit, un overlay au `pointermove`. La barre d'état
   s'écrit **impérativement**. (`4d-1` n'en a qu'un : le second arrive avec l'élastique, à `4d-2`.)
3. **Le fond est cuit par le Cartographe** avec `bakeTerrainPixels(…, null)` — le `null` est l'année
   installée, donc le terrain nu, donc « tint politique retiré » sans rien à nettoyer.

### P3 — fait le 27/09, et ça a retourné le format

Le spike `files/spikes/build-registry/` a tourné. Regrouper les 2 059 relations OHM par Q-id **éclate le
Royaume de France en quatre** — OHM donne un Q-id par période. D'où la décision du dev : **un registre par
année, rien de partagé**. `format.md` réécrit, `s04`/`s05`/`s07`/`s08`/`s99`/`s00` et le glossaire corrigés,
`s13-overrides.md` créé.

## Ce qui reste de P1, et n'est pas bloquant

- **La capture d'écran du README**, différée à **P5** avec sa raison : un relief sans couche politique se
  lit comme un rendu de terrain. Elle vaudra le jour où 1100 sera dessiné.
- **`packages/core/README.md`** devra accueillir les traductions et le type de date quand ils arriveront.

## Ce qui attend le dev, quand il voudra

- ~~**e-Soleau (P0)**~~ — **fait vers le 25/09**, rapporté par le dev le 27/09. Un dépôt est scellé, on ne
  le met pas à jour : dater un état ultérieur = un nouveau dépôt, 15 €. **Sa décision : un seul de plus,
  quand tout sera terminé.** Ne pas reposer la question.
- **Sentry** — décidé pour le palier de mise en ligne de la contribution. Reste ouvert, et seulement
  ouvert : est-ce que l'atlas déjà public le justifie à lui seul ?
- **H-03, H-05b, H-08**, les trois trous du Cartographe, qui se décident en codant.

## Comment répondre, dans ce projet

- **Quand le dev nomme une convention, aller voir TOUS ses dépôts voisins, pas un.** C'est la faute du
  01/10, qui a coûté la première heure de la session et une remise à zéro complète : il a dit que la
  surcharge ESLint se met dans le paquet, j'ai ouvert **un seul** de ses sept dépôts, j'y ai vu une config
  à la racine et j'ai généralisé. Un `find` sur les sept rend **9 configs par paquet**. Les dépôts sont au
  même niveau que celui-ci, dans `~/Desktop/WebstormProjects/`.
- **Avant de mesurer ce qu'un outil fait, lire comment il est appelé.** C'est le défaut sous le défaut, le
  01/10 : j'ai mesuré correctement qu'une config ESLint imbriquée est ignorée par un `eslint .` lancé depuis
  la racine — mais j'avais vérifié **la mauvaise proposition**. La question n'était pas « une config
  imbriquée peut-elle marcher si je garde la commande de la racine ? », c'était « comment lance-t-il son
  lint ? », et la réponse tenait dans une ligne de son `apps/home/package.json` : `"lint": "eslint ./src"`.
  J'avais lu sa config, jamais les **scripts** qui la chargent. **Lire les `scripts` du `package.json`
  avant de mesurer le comportement d'un outil** — de la rigueur dirigée vers la mauvaise question coûte
  autant que pas de rigueur, et donne en plus de l'assurance.
- **Quand il a tranché, exécuter — pas argumenter la mesure.** Même soir : il a redemandé deux fois, et
  j'ai répondu par le détail technique au lieu de faire. *« Elle est où ma surcharge ? »*
- **Ne pas poser une question qui n'a pas d'arbitrage.** Trois posées le 01/10, zéro nécessaire. Son test :
  *« c'est quoi la décision qu'il y a à prendre là ? »* Si la réponse est « aucune », on fait et on le dit.
- **Tout problème arrive avec son remède et sa criticité.** Jamais une liste de risques sans décision.
- **Tout terme nouveau va dans `glossaire.md`** — mais seulement s'il relève de la **cartographie** ou du
  **logiciel lui-même**. L'outillage général (build, paquets, cache, CI) n'y entre pas.
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.
