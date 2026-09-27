# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`).
> **The plan of record is `files/plans/plan.md`.** This file is the short pointer to it.

## Where we are

`main` at `a21e534`, **1124 tests**, gate verte. Le dépôt existe, il est **en ligne et déployé** :

|       |                                                                             |
| ----- | --------------------------------------------------------------------------- |
| dépôt | `fubaritico/europe-historical-atlas`, **privé**, branche `main`             |
| site  | **https://europe-historical-atlas.netlify.app**                             |
| CI    | sept jobs, tous verts — validate ×3, build, sonarqube, quality-gate, deploy |
| Sonar | opérationnel, `europe-historical-atlas` sous l'organisation `fubaritico`    |

Structure : **deux paquets**. `@europe-historical-atlas/core` (pure TS, ni three.js ni DOM, contrats
tenus par ESLint et par `tsc`) et `@europe-historical-atlas/atlas` (l'application).

## ▶ P4, LE CARTOGRAPHE — les cinq étapes

> **À relire à chaque ouverture de session** — demande du dev, 27/09 : *« ça c'était clair, et tu me le
> réponds à chaque prochaine session, parce qu'avec ça je comprends bien et je me souviens bien. »*
> L'ordre est dicté par les dépendances, pas par une préférence.

| | c'est quoi | ça livre quoi | on sait que ça marche comment |
| --- | --- | --- | --- |
| **1** | Les **types** des trois fichiers + trois **lecteurs** écrits à la main, dans `packages/core/src/data/` à côté de `heightmap.ts` et `landMask.ts`, derrière `assetError.ts`. Plus l'**adaptateur** vers `RegionPayload` | **L'atlas lit une année écrite à la main et l'affiche.** Zéro ligne de `src/` modifiée | on écrit un dossier `1100/` à la main, `pnpm dev`, la carte s'affiche |
| **2** | Le **modèle de document** : les ancres une fois, les anneaux en index, et les opérations — poser, déplacer, supprimer, **dupliquer un tracé**, fermer un anneau. Plus la **dérivation des frontières** | Un document qu'on manipule dans des tests, sans écran | un aller-retour sauvegarde/chargement **conserve le partage** : on bouge une ancre après, les deux contours suivent |
| **3** | L'**historique** : un instantané par geste | `ctrl+z` | même piège : restaurer doit restaurer le **partage**, pas les coordonnées |
| **4** | Le **canevas 2D**, coupé en deux : l'**arithmétique** (hit-test, marquise, élastique, écran↔monde) qui est pure, et le **dessin**, une coquille sans logique | On dessine à l'écran | l'arithmétique se teste avec des littéraux — et c'est cette coupe qui la rend testable du tout |
| **5** | Le **chrome** : `{Polities}` en arbre, les formulaires, `{Overrides}`, les trois marques d'année dérivée | L'application | les valeurs viennent de `design/chrome.css`, jamais son markup |

Les étapes **4 et 5 créent `packages/cartographer/`** — un troisième paquet, comme la taxonomie du dev
dans `architecture.md` : Payload est une app, l'atlas est une app, `core` est une ressource.

**Comment** : chaque étape se vérifie et **se commite seule**, pas d'accumulation. `core` reste sans
three.js et sans DOM, donc les étapes 1, 2 et 3 sont **entièrement pures**. Chaque garde se teste **en la
cassant exprès**. Gate à chaque fois : `pnpm type-check && pnpm lint && pnpm test`, puis `/review`, puis
`/commit`.

**La réserve, dite** : la vulnérabilité bloquante — supprimer un pays ne doit pas supprimer les ancres que
son voisin partage — vit à l'**étape 2** et ne peut pas se tester avant le modèle de document. Elle attend
une étape. Assumé, pas oublié.

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
