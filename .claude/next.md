# Next — the resume point

> Loaded at session start (CLAUDE.md `### Next` → `@next.md`). **Since 2026-10-17 the list of tasks is the
> Trello board** — https://trello.com/b/UJFwGl6E/europe-historical-atlas, through the `/trello` skill. This
> file holds only where we stopped, what is mid-flight, and the context that is not a task. Its former
> content, task lists included, is in `archive/next-history.md`, verbatim.

## ▶ ON REPREND ICI — 04/11 : il essaie le copier-coller, moi Claude Design et l'ornement par époque

**Ce qu'il fait demain** (ses mots, 03/11 au soir) : **essayer mes ajouts au Cartographe**, pendant que je prépare **les
consignes pour Claude Design**. Tous nos serveurs ont été arrêtés le 03/11 au soir pour repartir proprement : le sien
du CMS **aussi** (je l'avais relancé depuis ma session) — il le relance lui-même (`pnpm dev:cms`).

**CARTO-345 — le copier-coller** (En cours) : plan `files/plans/cartographer/copy-paste-between-maps.md`, scénarios
`scenarii/s22-copy-paste.md`. **Étapes 1 et 2 construites sur la branche `carto-345`**, copie de travail
`~/Desktop/WebstormProjects/europe-map-copypaste` : `d231fdb` (presse-papier, ‹cmd+C›), `bea262b` (une table de touches, les
raccourcis selon le système, ‹cmd+O› ‹cmd+shift+S›), `3e1eadc` (la barre de menus Fichier / Édition), `2714cb0` (l'essai
écrit dans s22). **Pour qu'il essaie** : `pnpm dev:cartographer` depuis la copie, puis Édition › Copier, ‹cmd+O›, les
menus au clavier — **les collages sont grisés, pas encore construits**. **Rien fusionné** : après son essai, je fusionne
dans `main` (sa copie principale n'a rien de la branche). **Ensuite**, étape 3 : coller un tronçon sur un contour.
**Encore ouvert, ma proposition** : si le navigateur refuse de garder la copie, la barre d'état le dit, en rouge quand
CARTO-273 existera.

**Sa direction pour le langage visuel, 03/11 au soir** : *« de la classe — je veux du Versailles, du Napoléon, du
Fontainebleau. Pense à la France »*. Trois époques françaises : **Fontainebleau** (la Renaissance de François Iᵉʳ — la
galerie de Rosso, vers 1530–40, est le berceau des **cuirs découpés**), **Versailles** (Louis XIV : Le Brun, Le Pautre,
Bérain), **l'Empire** (Percier et Fontaine). Elles recoupent son idée de designs qui alternent selon le siècle. **À lui
soumettre** : un atlas de l'Europe habillé à la française d'un bout à l'autre, ou la France pour certains siècles
seulement.

**ATLAS-329 — l'interface de l'atlas** : Claude Design **en pause** jusqu'au 04/11, son résultat pris tel quel ; il
m'enverra des écrans pour mon retour. La consigne : `~/Desktop/atlas-interface-brief.md` et `~/Desktop/atlas-design-prompt.txt`
(sur son Bureau, hors dépôt). Le ton : `files/plans/atlas/interface-scenarios.md`, « The tone ». **Mon travail** : chercher
des **bibliothèques d'ornement de plusieurs époques** — son idée : peut-être **trois designs qui alternent selon le siècle**,
l'atlas allant du Iᵉʳ au XXIᵉ siècle (il tombait dans *« le design XVIIᵉ, Versailles, Louis XIV »*) ; le XVIIᵉ est fait
(`files/plans/atlas/ornament-17th-century.md`, sa question ouverte : quelle époque de cartouche). **Un texte à coller**
se donne dans un fichier brut ou un bloc de code, **jamais en citation** (les barres partent avec la copie).

**L'historien** (`europe-map-9b`) : rien saisi le 03/11 ; il commence par `/enter-in-cms`, qui vérifie d'abord la connexion
`cms` (`claude mcp list`). La clé du dev lit places, villes à une date, sources (lire, créer, modifier) et les raisons
d'importance (lire). Ce qu'il saisit, je le vérifie dans la base en lecture seule. **Toujours dû** : les pays des villes
de 1100 (Groenland → Q16488964, Islande → Q62389, Venise → Q4948), puis l'export — **alors je commite
`content/events.json`**, pas avant (sa décision).

**Sur `main`, non poussés** : `49a623d` → le commit de clôture du 03/11 (la clé du CMS et `/enter-in-cms`, le README du
CMS, le plan du copier-coller, `uncheck`, ces notes). `years/` et `content/events.json` restent hors commit (les siens).

**Où en sont les tickets** : CARTO-345 En cours ; CARTO-239 (la barre de menus) en tête d'À faire, entrée dans CARTO-345 ;
CMS-335 À valider ; **CARTO-193** (Villes) attend les pays de l'historien ; **ATLAS-333** (vitesse) à remesurer à sa
taille réelle. **À lui** : supprimer `~/Desktop/WebstormProjects/europe-map-panels` et `stash@{0}` ; la décision sur le
stockage du navigateur pour la disposition des panneaux (`rules/known-issues/cartographer.md`). **Lire le titre d'une
page avant d'y ouvrir un onglet** : ses serveurs changent de port.

**Le Cartographe** : une carte est un dossier de `years/` (`s19`) et s'enregistre d'elle-même deux secondes après chaque
geste, en plus de sa copie `.autosave` (gardées, sa décision). Sa 1100 d'avant dans `years/1100-backup-2026-11-02/`.
**À lui** : supprimer `packages/cartographer/.autosave/`. Exporter le CMS : `pnpm export:content`, puis recharger.

**Les domaines** : commandés et branchés le 02/11 (`.org` principal, `.com` `.eu` `.net` `.fr`), DNS chez OVH, page d'attente
sur le site Netlify `europe-historical-atlas-soon` (la page : `~/Desktop/europe-historical-atlas-soon/`). **Le certificat
ne couvre que `.org` et `www.org`, par ma faute** (j'ai fait retirer un domaine qui marchait) : le message au support de Netlify
lui a été donné ; ne plus cliquer « Renew » (5 par semaine). Boîtes Zimbra `contact@` et `demandes@` à créer.

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

**Des fautes de frappe dans ses données du CMS** : « pelrinage » dans « Raisons d'importance » (« évêché » corrigé le 31/10) ; le type d'événement « Polithique - Accession au trone » — à lui de les corriger.

**Pour le design system** : son menu déroulant, ouvert vers le haut, cache le champ au-dessus ; il ne peut pas relier un texte
d'aide au menu — deux demandes à transmettre à son Claude.

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

**6 015 tests** sur `main` (1 663 `core` · 2 316 Cartographe · 1 495 atlas · 372 CMS · 169 plugin `eslint-plugin-eha`, 03/11 soir ; la branche `carto-345` : 1 704 `core`, 2 402 Cartographe), gate
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

**Dernier contrôle des versions** : aucun encore (`/repo-version-manager`, créée le 01/11) — un premier coup d'œil le
01/11 : 32 paquets ont plus récent, 7 majeures, 7 mineures, 18 correctifs ; pas de rapport écrit.
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
