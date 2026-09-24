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

## ▶ PROCHAINE SESSION — P3, le spike `registry.json`

**`registry.json` n'existe pas**, et tout le Cartographe en dépend. Les identités des 51 polities de
1100 — noms, rangs, Q-ids, `name:fr` sur 81 % — dorment dans le `relations.json` mis en cache par le
spike `fetch-ohm`. Un spike doit émettre le registre avant que l'éditeur puisse ouvrir quoi que ce soit.

**Pourquoi celui-là d'abord** : c'est court, ça tape dans un cache qui existe déjà, et c'est le seul item
du plan dont la difficulté est réellement inconnue.

## ▶ PUIS — P4, le Cartographe

Dans cet ordre, dicté par les dépendances et non par la préférence :

1. **le format en types et lecteurs** — `registry.json` + `<year>.json`, lecteurs écrits à la main
   derrière `data/assetError.ts`, plus l'adaptateur vers `RegionPayload` pour que l'atlas ne change pas
   d'une ligne. Pur, testable avec des littéraux ;
2. **le modèle de géométrie** — les ancres stockées une fois, les anneaux comme listes d'index. Le test à
   écrire en le cassant : un aller-retour sauvegarde/chargement **conserve le partage** ;
3. **le gestionnaire d'historique** — un instantané par geste, même piège : il doit restaurer _le
   partage_, pas seulement les coordonnées ;
4. **le canevas 2D** — hit-test, marquise, élastique : de l'arithmétique pure ;
5. **le chrome** — porter les valeurs de `design/chrome.css`, pas son markup. `initDocks` devient
   `ui/panelDock.ts` avec sa suite à cinq niveaux.

## Ce qui reste de P1, et n'est pas bloquant

- **La capture d'écran du README**, différée à **P5** avec sa raison : un relief sans couche politique se
  lit comme un rendu de terrain. Elle vaudra le jour où 1100 sera dessiné.
- **`packages/core/README.md`** devra accueillir les traductions et le type de date quand ils arriveront.

## Ce qui attend le dev, quand il voudra

- **e-Soleau (P0)** — 15 € pour dater le corpus de conception. Non fait, et l'atlas est désormais public.
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
