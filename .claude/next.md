# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`).
> **The plan of record is `files/plans/plan.md`.** This file is the short pointer to it.

## Where we are

**1391 tests**, gate verte. `origin/main` est à `1cbe7b8` : **le commit de clôture du 29/09 est local et
n'est pas poussé** — `git log origin/main..main` dit ce qui attend. Le dépôt est **en ligne et déployé** :

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **privé**, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app**                             |
| CI    | sept jobs, tous verts — validate ×3, build, sonarqube, quality-gate, deploy |
| Sonar | opérationnel, `europe-historical-atlas` sous l'organisation `fubaritico`    |

Structure : **deux paquets**. `@europe-historical-atlas/core` (pure TS, ni three.js ni DOM, contrats
tenus par ESLint et par `tsc`) et `@europe-historical-atlas/atlas` (l'application). `core` a désormais
**cinq couches** — `utils`, `geo`, `data`, `pipeline`, et **`editor`** ajoutée le 27/09 avec sa ligne dans
la table des frontières. `zod/mini` est une dépendance de `core` : **+9,15 ko gzip** pour tout le format,
mesuré, et **zéro octet** dans le chunk worker (13 490 o, hash inchangé).

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

## ▶ ON REPREND ICI — étape 4a, créer `packages/cartographer`

> **Décision du dev, 29/09 en fin de session** : *« on va réattaquer demain… c'est par ça qu'on reprend »*.
> Rien de `4a` n'a été commencé, et c'est délibéré — il était tard, pas bloqué.

**Tout est prêt, et l'outillage l'est aussi.** Ce qui a été mis en place le 29/09 au soir, avant de
s'arrêter :

| | état |
| --- | --- |
| skill officielle Zustand | `pmndrs@pmndrs` **installée** (dépôt seulement, `.claude/settings.local.json`), MCP `docs.pmnd.rs` branché, chaîne prouvée sur `docs://zustand/index` |
| skill projet | `.claude/skills/zustand-react-pattern/` — **une au lieu de trois**, corrigée contre la source v5.0.15 |
| context7 | branché, répond, **plafonne à v5.0.12** — `opensrc` (v5.0.15) reste l'autorité sur le comportement |
| code du paquet | **aucun fichier n'existe** |

**Rien n'a été commencé** : aucun fichier du paquet n'existe. La structure est **validée par le dev**
(29/09), l'état est **Zustand** (sa décision, après avoir lu la source et la doc), l'apparence est **des
composants React sur `chrome.css`** en attendant `fubaritico-ds` (sa décision aussi).

**Trois choses à ne pas re-découvrir en écrivant le store** (vérifiées en source, pas déduites) :
`create<T>()(...)` avec les parenthèses vides est **obligatoire** sinon TS infère `unknown` · une slice
n'est pas un store, tout va dans **un seul store lié**, et le **middleware ne se pose que sur le combiné**
· pour réinitialiser entre tests, `setState(initialState)` **sans** `replace`, qui effacerait les actions.
Tout est dans la skill projet.

`4a` livre : `package.json`, `vite.config.ts`, `tsconfig.json` (avec `jsx`), `index.html`, une entrée React
minimale qui **prouve la chaîne**, React + Zustand en dépendances, et **la ligne du paquet dans la table des
frontières ESLint** — testée **en la cassant**, comme les deux précédentes.

**À étendre en même temps** : la garde `isCore` d'`eslint.config.js` n'interdit que `three` à `core`. Elle
doit aussi interdire **`react`, `react-dom` et `zustand`** — même argument, même preuve.

**Et `CLAUDE.md` est périmé**, ce qui devient actif au moment où React entre : il dit *« No React, no
monorepo, no design system »*, et les trois sont faux depuis le 24/09. Trois lignes à corriger, sinon je
contredis le dev à chaque session.

### La suite de l'étape 4, découpée

| | quoi | on sait que ça marche comment |
| --- | --- | --- |
| **4b** | `view/` — écran ↔ monde, pan, zoom, cadrer. **Pur**, un viewport est une donnée | zoomer sur le pointeur **laisse le point sous le pointeur** |
| **4c** | `geometry/` — ancre la plus proche, marquise, élastique, fermeture. **Pur** | des littéraux : une ancre à 9 px n'est pas attrapée à 8 px de tolérance |
| **4d** | `canvas/` (le peintre, zéro décision) + les deux outils câblés sur `documentEdits` et `history` | `pnpm dev`, et on dessine |

### Trois choses décidées pour l'étape 4, à ne pas re-trancher

1. **Le repère du canevas est celui du fond**, pas la zone éditoriale — voir `known-issues` (deux boîtes).
2. **Deux canevas** : un statique redessiné au commit, un overlay redessiné au `pointermove`. La barre
   d'état s'écrit **impérativement**, jamais par un rendu React.
3. **Le fond est cuit par le Cartographe** avec `composeTerrainRgba` (pur, dans `core/pipeline`, déjà prouvé
   hors navigateur par le spike `terrain-bitmap`), plutôt qu'une troisième copie du PNG de 6,6 Mo.

### Ce que l'étape 3 a livré

Deux commits : `f1be468` la ligne d'historique, `2487895` la surface que le panneau lit (`rows`, `goTo`,
`mark`/`restoreMarker`/`dropMarker`) plus `s14-history-panel.md`. Un troisième, `1cbe7b8`, a retiré les
références à l'autre logiciel à la demande du dev.

**Une décision produit reste ouverte** : recharger un jalon **jette ce que la ligne tenait après lui**. Les
trois réponses sont dans `s14` avec leur coût, et le code n'en prend aucune — le mécanisme est dans `core`,
la politique appartient au chrome. Ne bloque pas l'étape 4.

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

- **Tout problème arrive avec son remède et sa criticité.** Jamais une liste de risques sans décision.
- **Tout terme nouveau va dans `glossaire.md`** — mais seulement s'il relève de la **cartographie** ou du
  **logiciel lui-même**. L'outillage général (build, paquets, cache, CI) n'y entre pas.
- **Ne jamais inscrire une déduction de moi comme une décision du dev.** Le tableau de `plan.md` porte
  une colonne `by` pour ça.
- Docs et config en **anglais**, conversation en **français**. Annoncer chaque commande (cause / raison /
  action). `rm -rf` demande une permission explicite à chaque fois.
