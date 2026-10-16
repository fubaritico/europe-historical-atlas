# Next — current actionable state

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`).
> **The plan of record is `files/plans/plan.md`.** This file is the short pointer to it.

## Where we are

**2831 tests** (756 `core` · 787 atlas · 1206 Cartographe · 82 plugin `eslint-plugin-eha`, 12/10 au soir), gate verte sur cinq contrôles (`lint`,
`type-check`, `test`, `build`, `format:check`). Worker à **13 490 o**, toujours sans three.js — et depuis
le 07/10 le Cartographe émet **le même chunk, au même hash**, le fond étant cuit par le même port.

`git log origin/main..main` dit ce qui attend un push — **mais il lit la référence de suivi locale, qui
peut être périmée.** Le 08/10 elle annonçait neuf commits en attente qui étaient déjà en ligne depuis la
veille ; un `git push` les a rafraîchis sans rien envoyer. Pour la vraie réponse :
`git ls-remote origin main`. Le dépôt est **en ligne et déployé** :

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
| `core` | pure TS, ni three.js ni DOM ni React ni zustand — **tenu par ESLint et par `tsc`**. Cinq couches : `utils`, `geo`, `data`, `pipeline`, `editor` | config racine | **`node`**, 682 |
| `atlas` | l'application 3D, three.js vanille | config racine | `jsdom`, 782 |
| `cartographer` | l'éditeur de territoires, React 19 + Vite 8. Son `publicDir` **est** celui de l'atlas | **sa propre config**, qui réimporte la racine | `jsdom` + plugin React, 886 |

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

## ▶▶▶▶ ON REPREND ICI — après le 16/10

**Tout est commité et poussé** (`5c96eaf` + l'état de session ; vérifier par `git ls-remote origin main`). Le dev
retouche l'Angleterre, puis Écosse, Irlande, Byzance — surtout des réglages de couleurs. Ordre proposé, **il tient
l'ordre** (mémoire [[do-not-start-unasked-work]]) :

1. **Son retour sur l'expérience de dessin dans le Cartographe** (*« compliqué à expliquer »*) : le recueillir même en
   désordre, en faire des scénarios avant de coder.
2. **Les couleurs** : comparer et régler le mélange atlas ↔ Cartographe, capture pour capture.
3. **`H-46`** : la validation des contours qui se recoupent (19 pays listés dans
   `files/plans/atlas/2026-10-16-coasts/exact-fills.md`).
4. **Recreuser un vassal depuis l'outil** (`known-issues`).
5. **La séance sur le style des frontières** : épaisseurs par main, vrai pointillé, main de frontière (`H-45`).
6. La revue à quatre agents de la soudure (`b3f4e20`) et `H-37` partie 2 ; ⟨retracer⟩ / supprimer depuis un suzerain
   sur les bords tenus par un vassal ; le `Dock` redimensionnable et le zoom 128 ; `H-43` et la marque « modified ».
7. Le découpage des teintes dans le worker et un index pour le picking ; `boundsMatch` et la suppression de `borders/`
   (GPL) ; Playwright ; trier les copies de `years/1100*` (`rm` : sa permission) ; la nouvelle version du DS en dernier.
8. **La publication de 1100 et la licence Euratlas** (clauses 6/9) : à reprendre **quand il montre la carte finie**,
   pas avant.

## ▶▶ LE TEST GÉNÉRAL — contexte (le dessin est fait, voir le point ci-dessus)

**Le test général** : copier la planche Euratlas **AD 1100** dans le Cartographe, tout ce qui se dessine
(royaumes, duchés, comtés, vassaux), pour éprouver l'outil et rectifier les décisions prises avant l'usage
(le dev : *« s'il y a des décisions erronées, tu nommes le problème et on rectifie »*). **Ouvrir
`/draw-from-plate`** — la méthode **lente**, un pays à la fois, vérifié contre la planche avant le suivant.

- **Fait** (nuit du 14/10) : 137 pays, tout ce que les huit planches couvrent. **Reste** : le nord, l'est et le
  sud hors planches (captures Euratlas à faire), et les corrections du journal des défauts.
- **L'atlas s'ouvre sur 1500** : passer `year` à 1100 dans le panneau de dev pour voir le tracé. Proposer au
  dev qu'il s'ouvre sur l'année dessinée (une ligne, `devParams/political.ts`).
- **À la fin du test** : ranger `years/1100/` en `years/1100.test-euratlas/`, remettre
  `years/1100.avant-test-euratlas/` en `years/1100/` (voir `known-issues.md`).
- **Questions en attente du dev** : remplacer
  « main » par « style » dans le glossaire ; la séance sur le **style des frontières** (épaisseur, pointillé
  dans l'atlas) ; **l'intégration de la nouvelle version du DS en dernier** (`MIGRATION-color-roles-from-
  fubaritico-ds.md` à la racine, non lu).
- **`H-43`** (`s99`) attend une décision : nommer le pays suivi dans le message du résultat.
- **`H-44`** (`s99`), relevé par le dev dans l'atlas : un vassal dessine des **pointillés sur ses côtes** et **contre un souverain étranger** (Bohême–Pologne). Une seule cause — sur un tronçon partagé, le suzerain dont la limite coïncide compte comme l'autre côté — et un seul remède : le retirer, puis juger ce qui reste. **À faire en premier, avec son test.**
- **`H-45`** : les tirets du style vassal sont trop longs dans l'atlas — une cadence de tirets par style, dans la table des styles (`borderHands.ts`). Avec la séance sur le style des frontières.
- **Le push** : le dev pousse lui-même les commits en attente (13/10).

## ▶ ON REPREND ICI (13/10) — une nouvelle méthode, puis les « petites choses »

**La méthode, décidée par le dev le 12/10 au soir** : *« tu vas vraiment tester toi-même ce que tu codes sur
l'application […] ça fait tester l'accessibilité […] et puis je te regarderai faire. »* Chaque changement du
Cartographe se termine par **moi qui l'utilise dans son Chrome**, clavier compris, sous ses yeux, avant de
dire « fait » (mémoire [[test-it-yourself-in-the-app]]). Attendre le fond avant d'agir : les clics pendant
« Preparing the backdrop… » se perdent.

| | quoi | |
| --- | --- | --- |
| **1** | **Les « plein de petites choses qui vont pas »** — le dev a essayé l'app le 12/10 au soir et les a vues, sans les lister. **Lui demander la liste d'abord**, puis les prendre une à une avec la méthode ci-dessus | ◀ |
| **2** | **Une question à lui poser** : la barre d'actions reste active de loin, contrairement aux outils (`s17`) — ma recommandation ; une ligne s'il veut l'inverse | |
| **3** | **Nos propres frontières** — *« il faudrait qu'on puisse faire nos propres frontières, c'est dans les specs »* (12/10). Existe : la dérivation dans `core` (`derivedBorders.ts`, `borderGraph.ts`, [[borders-are-derived-not-drawn]]), la main d'une frontière déduite du registre ([[border-hand-is-not-a-relation]]), `s13` et `{Overrides}`. Manque : les afficher et les régler dans le Cartographe, et que **l'atlas les dessine depuis l'année** au lieu des 21 payloads GPL (`mapPipeline.ts` lit encore `/borders/europe-<année>.json`). **À découper avec lui** : lire `s13`, `s08` et `format.md` ensemble d'abord | |
| **4** | **Des tests end-to-end Playwright** — sa note du 12/10 : *« s'il y a un bug que tu n'as pas trouvé par JSDOM […] il peut être trouvé via le navigateur »*. Rien n'existe. Premiers cas : le `<dialog>` natif qui rendait le focus à la poubelle désactivée, ‹ctrl+z› entendu par le seul canevas. À proposer comme chantier | |

**Livré le 12/10 au soir** (détail dans `completed.md`) : enregistrer et rouvrir **en mode local** (‹ctrl+s›,
ouverture au démarrage, `H-28` tranché) · les outils attendent le zoom (`s17`) · les fleuves suivis d'un
morceau à l'autre et dessinés comme dans l'atlas · la barre d'actions de `{Polities}`, calée à droite. **Les
années enregistrées ne sont jamais commitées** ; l'année de travail est `years/1100/` (France + Bourgogne),
une trace dans `years/1100.bourgogne-v1/`.

**Un seul serveur de dev** : le dev fait tourner le sien (`pnpm dev:cartographer`, souvent sur 5174). Ne pas
en lancer un second ; lui donner l'adresse du sien.

**Les deux barres du haut sont posées (13/10)** : `[Save]`, Undo et Redo branchés (les boutons passent par
le relais du canevas, `historyRelay.ts`, jamais `store.undo()` direct — ARCH-101) ; `[Open…]`, `[Save as…]`,
`[Registry]`, le `×` de l'onglet et `[Check this year]` posés **indisponibles** (`aria-disabled`, l'infobulle
nomme le scénario). `[Export for the atlas…]` **retiré** (note dans `s04`). **Manquent** : la marque
« modified » (suivre la version enregistrée) et la promesse de `4d-3` — `[Save]` désactivé tant que le fond
n'est pas prêt.

**Noté, non prioritaire** : masquer un pays (`H-32`, besoin non prouvé — essayer d'abord un affichage contours
seuls) · les fleuves jusqu'à la mer (**remis à plus tard par le dev**) · alléger les tronçons de côte
(Douglas–Peucker) · la confirmation avant de supprimer une ancre partagée (`s03`) · tracer au clavier · le
geste « souder » deux ancres (`H-37`) · l'inspecteur `{Details}` · les noms datés de `s07` (**plus tard**).

**Poussé** : tout est en ligne au 12/10 au soir ; vérifier à l'ouverture avec `git ls-remote origin main`
contre `git log -1`.

> **Le découpage `a/b/c/d` est figé — ne plus le re-trancher.** Il a bougé deux fois le 07/10, et
> c'est ce qui a fait perdre le fil au dev. S'il paraît faux à la reprise, le dire **avant** d'y
> toucher. L'ordre a déjà changé une fois, le 08/10, pour une raison nommée : `(c2)` attendait le
> design system, donc la façade DS-indépendante de `(d)` — les touches et les curseurs — est passée
> devant. Le découpage lui-même n'a pas bougé.

### Le design system est branché — ce qu'il faut savoir pour s'en servir

**`@fubaritico/react` en `0.2.1`, `tokens`/`styles` en `0.2.0`**, depuis GitHub Packages (token en
local dans `~/.npmrc`, `github.token` en CI). Le ColorPicker arrive en **`0.3.0`** : alors monter les
plages et ajouter le champ couleur, avec son état « automatic » = `null`. Le plan
(`files/plans/cartographer/design-system-integration.md`) est **fait jusqu'au pas 4**.

1. **Une seule cascade, dans un seul module** : `styles/sheets.ts` — tokens → peau → thème → reset (dans
   `@layer ui.reset`) → shell → `editor-chrome.css`. L'app et l'établi l'importent ; un test refuse tout
   import de feuille ailleurs. **Une règle hors layer bat tout layer** : c'est ce qui fait gagner nos
   surcharges, et c'est ce qui aurait fait perdre le DS contre un reset hors layer.
2. **Les couleurs : la palette dans `theme.css`, une fois**, et les tokens du DS pointés dessus. Aucune
   couleur en dur ailleurs — vérifié le 09/10. **Les tailles viennent de `design/chrome.css`.**
3. **Régler le style dans l'établi** (`pnpm dev:cartographer` → `/workbench.html`), et **prouver par le
   style calculé dans un vrai navigateur** : jsdom n'a pas de cascade de layers.
4. **Pièges déjà payés** : jamais de `display` sur `Modal`/`Drawer` · `autoFocus` de React n'écrit pas
   l'attribut, un `<dialog>` ne le verrait pas · un bouton dans un `<form>` soumet par défaut —
   `type="button"` partout sauf OK · le `Card` coupe ce qui déborde, d'où `overflow: visible` sur la
   boîte du formulaire.

**Le ColorPicker est fait** (10/10) : `ColorField` du DS `0.5.0` dans la boîte de création, « automatic » = `null`.

**Décisions du dev du 09/10, à ne pas re-trancher** : le **contraste n'est pas une contrainte** dans
l'éditeur · le formulaire est une **boîte de dialogue**, pas le panneau `{Details}` de `design/03` · un
**établi** plutôt qu'un Storybook · secondaire sur le panneau avec le filet des champs, **primaire
rempli de la couleur du filet**, texte blanc, au survol le fond des champs.

> Les notes d'avant `(c)` et `(d)` (livrés) sont archivées dans `archive/next-history.md` — à relire si une décision de cible, de curseur ou de barre d'état est remise en cause.

### Ce que `(c1)` a livré le 08/10, et ce qu'il laisse ouvert

**Livré** : `state/toolSlice.ts` (l'outil en main + l'id de la cible, **hors de la ligne d'annulation**,
`s99` l'exigeant) · `state/drawingTarget.ts`, le seul endroit qui résout « pour qui dessine-t-on ? » ·
`createPolity` sur la slice d'édition, undoable, qui **rend `false`** sur id déjà pris au lieu de lever —
c'est l'auteur qui a tapé cet id, donc le formulaire doit pouvoir pointer le champ ·
`core/editor/polityId.ts`, le forgeage d'id tranché par le dev (**H-31**, trou non enregistré jusque-là).

**La propriété qui porte le pas, et c'est elle qu'il faut garder en tête** : la cible est un **id**, pas
un objet. Donc annuler la création d'un pays fait que la cible **cesse de résoudre** — la bannière
disparaît et la plume refuse, sans écouteur, sans nettoyage, sans rien à penser dans `undo` / `goTo` /
`restoreMarker`. Vérifié en écrivant la version qui tient l'objet : le test tombe.

**`(c2)` livré le 09/10, sauf la bannière** : `[+ New polity]` dans la tête de `{Polities}`, le
formulaire (`components/PolityForm.tsx`, la vue ; `NewPolityDialog.tsx`, le branchement ;
`polityDraft.ts`, la lecture pure qui ne refuse que ce qui casse le fichier). Le câblage est bien
`if (createPolity(p, step)) aimAt(p.id)` — et **l'ordre est gardé par un test**, viser avant de lire le
refus laisserait la plume pointée sur un pays inexistant. **Restent** : la liste `{Polities}` avec
« no territory » (s02 : *« it appears in {Polities} marked "no territory" »*) et l'avis transitoire.

**Une question que `s02` ne tranche pas, et qui n'a pas été décidée ici** : presser ‹P› **seul** doit-il
garder une cible choisie il y a longtemps, ou l'oublier ? Aujourd'hui `selectTool` ne touche pas à la
cible — ce qui rend vraie la phrase *« [Draw territory] me rend la plume, avec elle comme cible »* et
évite de perdre l'aim chaque fois qu'on attrape ‹space› pour paner. Le cas gênant est l'inverse : revenir
à la plume une heure plus tard et dessiner dans un pays qu'on avait oublié viser. **La bannière le dit**,
ce qui est précisément pourquoi `s02` l'exige — donc ce n'est pas bloquant. À reprendre à `(d)`.

### Ce que `4d-3` et `4d-2 (a)/(b)` ont livré le 07/10 — à ne pas re-découvrir

1. **`publicDir` du Cartographe → `../atlas/public`**, donc le fond est *la* texture de l'atlas et non une
   copie. Garde GPL de `build.yml` élargie à **`packages/*/dist`**, prouvée en la faisant tirer.
2. **Le fond cuit dans le worker** (`core/pipeline/computeWorker?worker`) — même chunk, **même hash**,
   13 490 o. `onProgress` donne une progression mesurée.
3. **Le terrain est nu parce que `computePolitical` n'est jamais appelé.** Rien à nettoyer.
4. **`ARCH-102` fermé** : le repère vient de `dem.meta`. `view/testFrame.ts` est une **fixture de test**,
   et un test interdit à la production de l'importer. `boundsMatch` est branché.
5. **La côte se chaîne** : 95 212 segments → **2 029 contours**, sans epsilon (le producteur est
   déterministe). Nécessaire d'abord pour `s02`, qui insère *« le sous-chemin entre les deux clics »*.
6. **Les vecteurs se dessinent sous `setTransform`**, élagués au viewport et décimés au pixel écran.

**Mesuré** : Cartographe 219,65 → **247,36 ko / 78,65 ko gzip**. **1655 → 1771 tests.**

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

### Quatre questions ouvertes, aucune bloquante

1. **Le cover force un zoom profond sur une fenêtre large.** Le fond fait 1280×1164 (ratio 1,10)
   contre une fenêtre à ~1,9 : couvrir rogne ~42 % de la hauteur, donc **aucune échelle ne montre
   plus l'Europe entière**. C'est la conséquence directe du plancher demandé le 08/10. Illustrator,
   lui, laisse dézoomer au-delà du plan de travail et montre son *pasteboard*. **À rouvrir si ça
   gêne à l'usage** — le remède est une ligne (plancher = `fitScale` au lieu de `coverScale`), plus
   le fond de l'app visible autour.
2. **Presser ‹P› seul garde une cible choisie il y a une heure.** `s02` ne tranche pas. Aujourd'hui
   `selectTool` ne touche pas à la cible, ce qui rend vraie la phrase *« [Draw territory] me rend la
   plume, avec elle comme cible »*. Le cas gênant est l'inverse, et **la barre d'état le dit** —
   donc non bloquant.
3. **L'avis de cible : disparaître, ou se réduire dans un coin ?** Sa variante « tout petit en bas »
   est la seule qui couvre le cas pour lequel l'avis a été écrit. **Non prioritaire**, dit tel quel.
4. **Un geste modifie le document avant que l'historique l'enregistre** — voir `known-issues.md`.
   Déclencheur : le jour où un copieur peut légitimement échouer.

### La suite de l'étape 4, découpée

| | quoi | on sait que ça marche comment |
| --- | --- | --- |
| **4d-3** ✅ | le fond servi, cuit dans le worker, le repère lu du DEM, l'état d'attente | le relief s'affiche |
| **4d-2 (a)** ✅ | la côte et les fleuves en vecteurs | le trait de côte épouse la limite terre/mer |
| **4d-2 (b)** ✅ | la barre d'état — *le second canevas est passé en tête de (d), voir plus haut* | la position suit le pointeur |
| **4d-2 (c1)** ✅ | l'**état** de la cible : `toolSlice` (outil + cible, hors de la ligne d'annulation), `createPolity` undoable, `describeDrawingTarget`, et le forgeage d'id dans `core/editor/polityId.ts` | annuler la création fait **évaporer la cible** toute seule |
| **4d-2 (c1b)** ✅ | les touches d'outil ‹P› ‹A› ‹space› et les curseurs — la façade de `(d)` qui ne dépend pas du DS, passée devant parce que `(c2)` attendait | le curseur refuse quand personne n'est sélectionné |
| **4d-2 (c2)** ✅ | le **design system câblé** puis `[+ New polity]` et le formulaire — **restent la liste `{Polities}` et l'avis de cible**, qui peuvent suivre `(d)` | OK donne la plume, vérifié dans l'application |
| **4d-2 (d)** ◀ | le **second canevas**, les deux outils câblés sur `documentEdits` et `history` | on dessine, `ctrl+z` défait le geste |
| **5** | le chrome : `{Polities}` en arbre, les formulaires, `{Overrides}`, **et les contrôles désactivés tant que le fond n'est pas prêt** | les valeurs viennent de `design/chrome.css` |

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
