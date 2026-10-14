## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-14 — ⟨retracer⟩, la lenteur des frontières, la coquille `Panel`, et le test au doigt du dev

Le journal compte **10:14–10:27 (12 min) et 12:33–15:35 (3 h 02)** ; la session a duré de 10:14 à ~16:25 et le trou
10:27–12:33 du journal est sans doute sous-compté (un `cd` vers 10:40, voir mes fautes). Le chantier ouvert le 05/10
totalise **53 h 57 sur 11 plages** au journal. **8 commits** `d6ddc5b`..`b754b11` (les quatre premiers poussés par le
dev), gate verte et revue à chaque pas, chaque garde prouvée par le code naïf. **3166 tests** au soir (842 → 848 `core`, 1428 → 1431 Cartographe).

- **`{Polities}` défile enfin** (`d6ddc5b`) : le corps du shell n'avait pas de ligne de grille (le dock grandissait
  à 3 646 px, la carte s'étirait et ne glissait plus) et 46 textes masqués « vassal de » s'échappaient de la liste.
- **La dérivation des frontières de 5,7 s à 0,34 s** (`b3fd4cc`) : chaque segment de côte reconstruisait les anneaux
  des 137 pays. Le dev : la correction s'affiche « sans attente ».
- **⟨retracer⟩, le premier outil de correction** (`ad09e4c`, `1b2e89e`, `719dc89`) : ‹R›, une ancre du pays visé, un
  tracé à la plume (côte, fleuve, voisin, points libres, crayon), une autre ancre du même contour ; tirets rouges
  avant le clic, ‹alt› l'autre côté. **Trois règles sorties de la marche du dev** : l'arrivée suit l'eau
  (Formentor) ; *« c'est les Obotrites qui comptent »* — un voisin qui ne fait que toucher le tronçon garde ses
  points, dit dans la barre ; le côté remplacé est **le plus petit changement** (surface), la règle « le plus près »
  ayant choisi toute l'île de la Rana. Corrigé à l'usage : Majorque, Minorque, l'Empire, les Obotrites, la Rana.
- **‹espace› donne la main de partout** au-dessus de la carte, comme Illustrator (focus arrivé par un clic ; par
  ‹Tab› il reste au contrôle, A11Y-001).
- **La liste `{Polities}` glisse vers le pays visé** (`27e1d10`) — le dev : *« on gagne énormément d'ergonomie »* ;
  **son en-tête garde ses 24 px** (`73fd1a5`).
- **Une coquille `Panel` pour les quatre panneaux** (`b754b11`), décidée par le dev ; rien ne bouge à l'écran. La
  revue m'a corrigé : le redimensionnement ira dans un `Dock`, pas dans la coquille.
- **Non commité, en attente du test du dev** : supprimer un anneau en entier (toutes ses ancres sélectionnées +
  ‹suppr›), le voisin gardant les points partagés — voir `next.md`.
- **Mes fautes** : une page rechargée qui a effacé la correction non enregistrée du dev (il l'a refaite) ; un `cd`
  en tête de commande ; un heredoc non protégé qui a vidé des gabarits (réparé) ; un premier test « Rana » qui
  passait aussi avec l'ancienne règle (réécrit, `719dc89`) ; la promesse « le redimensionnement dans la coquille »,
  fausse.

### 2026-10-13 — les frontières jusqu'à l'atlas, et le test général sur Euratlas 1100

Une plage, **13/10 14:28 → 14/10 02:11 (11 h 42, 991 actions)**, nuit comprise ; le chantier ouvert le 05/10
totalise **50 h 42 sur 9 plages**. **10 commits** `997cbb1`..`4de406c`, **aucun poussé** (le dev pousse), gate
verte et revue à quatre agents à chaque pas de code, chaque garde prouvée par le code naïf.

- **La nuit, seul, à la demande du dev** (*« tu dessines tout ce que tu peux dessiner, vassaux, sous-vassaux »*) :
  **137 pays d'Euratlas 1100** dans `years/1100/`, îles comprises, rang / statut / suzerain / couleur posés.
  Manques déclarés : au nord de 60°N, à l'est de 45°E, au sud de 32°N (aucune planche). **23 défauts de l'outil**
  relevés dans `files/plans/cartographer/general-test-defects.md`, chacun avec l'outil qui l'aurait corrigé →
  `H-46`. État de la nuit : `general-test-night.md`. `{Polities}` défile enfin (`4de406c`). **Ma faute** : un
  `cd` vers 02:00.

- **Les frontières, déléguées par le dev** (`files/plans/borders/plan.md`) : la dérivation coupée où la mer
  tourne en terre, le Cartographe dessine les frontières dans le style de leur relation, `{Layers}`,
  `{Line}`, `{Overrides}` (`997cbb1`..`2b9caf0`).
- **L'atlas montre une année dessinée telle qu'elle est dessinée** (`b85714f`) : frontières exactes depuis
  les ancres (`core/editor/atlasBorders.ts`), plus de débordement des pays (~20 km) hors du tracé, et les
  **couleurs du Cartographe** (`authoredRegionColours`) — le dev : *« les couleurs doivent être pareilles,
  c'est tout l'intérêt de l'éditeur »*. Pas encore dessiné, déclaré : l'épaisseur d'un style, le pointillé.
- **Le test général** (*« une répétition générale, il faut qu'on voie ce que l'appli a dans le ventre »*) :
  16 pays d'Euratlas 1100 dessinés dans le Cartographe. Précision mesurée : 0,5 km médian sur la frontière
  Francs–Empire. **`H-36` rectifié** (`a44d4b9`) — un point de voisin visé pile l'emporte sur l'eau ; **`H-43`
  trouvé** — deux pays tiennent les deux points cliqués, la plume en suit un sans dire lequel.
- **La skill `/draw-from-plate`** (`3e849ff`) : la méthode lente et ses scripts, pour ne jamais repartir de
  zéro.
- **Mes fautes** : dessiner trop vite et refaire trois fois la Navarre (*« prends ton temps »*) ; des tracés
  au script sans regarder le résultat ; un `cd` en début de session ; le mot « main » employé sans le
  définir.

> Older sessions (2026-09-12 → 2026-10-12 evening) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
