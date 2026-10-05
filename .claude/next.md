# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`).
> **The plan of record is `files/plans/plan.md`.** This file is the short pointer to it.

## Where we are

**1655 tests** (609 `core` · 782 atlas · 264 Cartographe), gate verte sur cinq contrôles (`lint`,
`type-check`, `test`, `build`, `format:check`). Worker à **13 490 o**, toujours sans three.js.
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
| `core` | pure TS, ni three.js ni DOM ni React ni zustand — **tenu par ESLint et par `tsc`**. Cinq couches : `utils`, `geo`, `data`, `pipeline`, `editor` | config racine | **`node`**, 609 |
| `atlas` | l'application 3D, three.js vanille | config racine | `jsdom`, 782 |
| `cartographer` | l'éditeur de territoires, React 19 + Vite 8 | **sa propre config**, qui réimporte la racine | `jsdom` + plugin React, 8 |

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

## ▶ ON REPREND ICI — deux lignes, et `4d-3` est fini

**L'étape 4 en est là** : `4a` (le store), `4b` (`view/`), `4c` (`geometry/`) et `4d-1` (le canevas qui
dessine et navigue) sont **faits**. `4d-3` est **à moitié** : la cuisson du fond et son dessin sont écrits
et testés, mais **personne ne les appelle** — mesuré, le bundle n'a pris que +0,37 ko gzip, le secouage
d'arbre retirant une cuisson sans appelant.

**Ce qui manque fait deux lignes, et elles sont décidées** (06/10) :

1. `publicDir` du Cartographe → **`../atlas/public`**, dans son `vite.config.ts`. Zéro octet dupliqué :
   Vite sert ce dossier en dev **et** le recopie dans `dist` au build. Ça lui donne le DEM, le masque et
   les fleuves, et ça rend inutile la copie du favicon commitée le 05/10.
2. la garde GPL de **`build.yml` élargie à n'importe quel `dist`**, pas seulement
   `packages/atlas/dist/borders`. Aujourd'hui elle tient par une absence — les fichiers sont gitignorés
   donc jamais dans le checkout CI — et le second paquet sortirait de sa surveillance.

**Puis, dans le même pas, ce que `4d-3` doit finir** : prendre les métadonnées du DEM **dans son propre
`.json`** (ce qui **ferme `ARCH-102`** et supprime `view/backdropFrame.ts`), et afficher un état d'attente
— la cuisson coûte **~1,8 s** au supersample 2, et `H-08` est le trou ouvert voisin.

**Ensuite `4d-2`** : les deux outils, qui auront alors du relief et des fleuves à viser — ce que `s02`
exige pour reporter une frontière à vue.

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
| **4d-3** | les deux lignes ci-dessus, puis les métadonnées lues du DEM et l'état d'attente | `pnpm dev:cartographer` : on voit le relief et les fleuves |
| **4d-2** | les deux outils câblés sur `documentEdits` et `history`, l'anneau en cours, la sélection | on dessine, `ctrl+z` défait le geste |
| **5** | le chrome : `{Polities}` en arbre, les formulaires, `{Overrides}` | les valeurs viennent de `design/chrome.css` |

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
