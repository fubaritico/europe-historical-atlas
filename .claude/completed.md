## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-13 — les frontières jusqu'à l'atlas, et le test général sur Euratlas 1100

Une plage, **13/10 14:28 → 23:33 (9 h 05, 634 actions)** ; le chantier ouvert le 05/10 totalise **48 h 05 sur
9 plages**. **9 commits** `997cbb1`..`3e849ff`, **aucun poussé** (10 en attente avec `1d946d1`), gate verte et
revue à quatre agents à chaque pas de code, chaque garde prouvée par le code naïf.

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

### 2026-10-12 (soir) — enregistrer et rouvrir, les outils attendent le zoom, les fleuves de l'atlas, la barre d'actions

Une session à distance, **12/10 ~18:20 → 22:59 (~4 h 40, dans la plage 14:45 → 22:59, 712 actions)** ; le
chantier ouvert le 05/10 totalise **38 h 50 sur 8 plages**. **9 commits** `8f37372`..`9082652`, **tous
poussés**, **2633 → 2831 tests**, gate verte et revue à quatre agents à chaque pas, chaque garde prouvée par
le code naïf. Le dev, absent de l'écran, m'a laissé **conduire son Chrome** et juger à l'usage.

- **Enregistrer et rouvrir, en mode local** (`H-28` tranché local) : le serveur de dev du Cartographe écrit
  `years/<année>/` (`PUT /__years/<année>`, même machine, validé par le schéma de `core`, fichiers `.tmp` puis
  renommés, manifeste en dernier) ; ‹ctrl+s› partout ; l'année s'ouvre au démarrage. **Les années ne sont
  jamais commitées** (*« ils sont pour nous pour travailler »*), les traces gardées en copies suffixées
  (`1100.bourgogne-v1/`). Allers-retours identiques à l'octet (md5).
- **La France 1100 et la Bourgogne dessinées par moi**, enregistrées, rouvertes — d'où mon carnet de dessin
  (`files/plans/cartographer/drawing-as-claude.md`) et des scénarios *Walked for real* dans `s02`/`s15`.
- **Les outils attendent le zoom** (`H-34`, `s17`) : de trop loin (portée d'accroche > 10 km au sol) la plume,
  le crayon et les touches qui modifient des points refusent, le curseur et la barre d'état le disent.
- **Les fleuves suivis d'un morceau à l'autre** (`H-35`, `mendRivers`, 591 → 398 polylignes) et **dessinés
  comme dans l'atlas**, d'une seule définition dans `core` (`riverDisplay.ts`). `H-36` fermé : 46 ancres sur
  52 partagées au simple clic sur les fleuves.
- **La barre d'actions de `{Polities}`** : `+` et poubelle au pied, ses dessins en pixels entiers,
  confirmation `[Cancel]` en focus, ‹ctrl+z› depuis le panneau. **Deux bugs invisibles à jsdom trouvés dans
  son Chrome** (le `<dialog>` rendait le focus à la poubelle désactivée ; ‹ctrl+z› n'était entendu que par le
  canevas) — d'où sa note : **des tests Playwright**.
- **Mes fautes** : deux `cd` ; un premier ‹ctrl+z› de page qui court-circuitait le geste en cours (attrapé
  par la revue, ARCH-101) ; une phrase de boîte qui contredisait `s07` ; des clics envoyés pendant le
  chargement du fond, perdus.

> Older sessions (2026-09-12 → 2026-10-12 afternoon) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
