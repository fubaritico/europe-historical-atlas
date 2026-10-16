## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-16 — les côtes de l'atlas, les remplissages exacts, les tribus dans l'atlas, l'empilement au clavier

Une plage au journal, **16/10 12:24 → 18:50 (6 h 26, 378 actions)** ; le chantier ouvert le 05/10 totalise **68 h 53
sur 13 plages**. **10 commits** `0566243`..`5c96eaf`, plus celui de cet état, **poussés le soir à la demande du dev**.
**3 455 tests** (965 `core`, 1 524 Cartographe, 884 atlas, 82 plugin).

- **Les côtes de l'atlas** (`d74f272`) : le relief descend au niveau de la mer sur la ligne du masque (`data/shoreRamp`),
  le trait de côte reste dessus. Le relief à la résolution du DEM (`3869822`), l'atlas s'ouvre sur 1100 (`ac97836`).
- **Les remplissages exacts** (`1818096`, `ed5ee1a`) : chaque pays découpé en triangles posés à plat sur le relief,
  teinte mélangée dans le shader ; frontières et fleuves coupés aux mailles du relief (`pipeline/gridDrape`). Le dev :
  *« On a un rendu magnifique … Là, on est avec les grands. »* L'étape « couper les teintes en mer » : plus rien à faire.
- **Les tribus dans l'atlas comme dans le Cartographe** (`3ba62ee`) : pas de teinte, contour en tirets ; tirets en
  pixels écran (8/4 px), *« on va rester comme ça »*. Parité écrite dans `architecture.md` (`cfea532`).
- **L'empilement au clavier** (`5c96eaf`, demandé en priorité, testé par le dev : *« c'est bon »*) : ‹cmd+↑/↓›,
  ‹⇧› jusqu'au bout, affichés dans le menu ; la carte ne défile plus sur une flèche modifiée.
- **Le dev a fini la Rus'** et retouche l'Angleterre, puis Écosse, Irlande, Byzance. Publication de 1100 souhaitée ;
  la licence Euratlas reprise **quand il montrera la carte finie** (*« il faut se calmer là »*).
- **Mes fautes** : des réponses trop techniques (*« de quoi tu me parles ? »*) ; `main.tsx` modifié pendant qu'il
  dessinait, deux rechargements Vite de sa page (mémoire [[never-reload-the-devs-page]] renforcée).

### 2026-10-15 (soir) — l'étendue, le creusement, la dérivation par côté, les tribus

Une plage au journal, **15/10 19:24 → 16/10 00:22 (4 h 58, 332 actions)** ; le chantier ouvert le 05/10 totalise
**62 h 14 sur 12 plages**. **6 commits** `d49509e`..`220ae18`, plus celui de cet état, **poussés le soir à la demande
du dev**. **3 294 tests** (904 `core`, 1 503 Cartographe, 805 atlas, 82 plugin), revue à quatre agents à chaque pas.

- **Un vassal est le voisin de son suzerain** (décision du dev, mémoire [[vassal-is-a-neighbour]]) : l'**étendue** d'un
  suzerain est calculée (`core/editor/extent.ts`), son contour tracé quand il est visé (`186d017`) ; un contour fermé
  pour un vassal est **creusé** dans le domaine propre du suzerain (`core/editor/carve.ts`, `0003896`), jamais dans un
  co-vassal, en un seul ‹ctrl+z›.
- **Les frontières partagées jugées côté par côté** (`H-44`, `86496e6`) : Bohême–Pologne, Bohême ↔ terre sans maître et
  les côtes des vassaux ne sortent plus en pointillé. Co-vassaux au trait du vassal (`69f3035`) ; un segment entre deux
  ancres de côte lu comme côte (`d49509e`).
- **Les tribus** (`220ae18`) : le rang `tribe` → pas de remplissage, le contour en tirets dans sa couleur, ses frontières
  dérivées retirées (`core/editor/tribes.ts`). Le rang `people` de la nuit du 14/10 renommé `tribe` dans `years/1100`
  (15 tribus, 14 au dernier enregistrement du dev). Le menu « Rank » propose `tribe` et **tous les rangs de l'année** —
  il n'en offrait que cinq, le dev : *« qu'est-ce qui empêche les choses ? »*. **L'atlas les remplit encore.**
- **Quinze vassaux recreusés à la main** dans `years/1100` (Champagne, Frise, Bohême, Toulouse, Provence, Gênes, les
  marches saxonnes, Chester, Durham, Shrewsbury, Hereford, Roussillon) : dessinés la nuit du test, avant que la plume
  sache creuser. Copies de secours dans le brouillon de la session (`backup-2240`, `-2245`, `-2253`).
- **La Rus' de 1100** : trois cartes trouvées (Shepherd 1097, domaine public ; *Principalities of Kievan Rus'
  1054-1132*, CC BY-SA, référence seule ; EGO) ; les 72 noms traduits et croisés avec le registre dans
  `~/Desktop/rus-1100-correspondances.md`.
- **Mes fautes** : des réponses trop longues et trop techniques pendant qu'il dessinait (*« je comprends rien »*) ;
  **deux corrections écrasées par son ‹ctrl+s›**, la page tenant l'ancien état — je ne l'avais pas prévenu de recharger
  sans enregistrer ; une commande à coller trop longue, coupée en trois au collage ; un `cd` (vers `/dev/null`, sans
  effet) ; le mode automatique a bloqué l'écrasement de son fichier deux fois, passé par un script qu'il a lancé.

### 2026-10-14 — ⟨retracer⟩, la coquille `Panel`, puis l'après-midi des corrections au doigt du dev

Le journal compte **10:14–10:27 (12 min) et 12:33–18:52 (6 h 19)** ; le trou 10:27–12:33 est sans doute
sous-compté (un `cd` vers 10:40). Le chantier ouvert le 05/10 totalise **57 h 14 sur 11 plages** au journal.
**11 commits** `d6ddc5b`..`b3f4e20`, **tous poussés** le soir (`73fd1a5..b3f4e20`, par moi à la demande du dev).
**3204 tests** au soir (860 `core`, 1457 Cartographe).

**L'après-midi, le dev corrige ses îles et le Nil, et chaque gêne devient une règle** (`f709e57`, `b3f4e20`) :
- **Supprimer un anneau entier** (toutes ses ancres + ‹suppr›), le voisin gardant les points partagés.
- **Aucune suppression refusée** (*« y'a rien qui doit m'empêcher d'enlever des points. Rien. »*) : un contour du
  pays visé sous trois ancres part entier ; celui d'un voisin garde ses points, nommé dans la barre.
- **Le clic de fermeture suit l'eau** jusqu'à la première ancre, prévisualisé (`canvas/waterClosing.ts`).
- **La plume ne pose jamais un tronçon deux fois** : sur une boucle, le plus court sauf s'il repasse, alors l'autre
  sens (le Nil) ; sur une ligne ouverte, seul le sommet.
- **La flèche blanche n'insère plus**, seule la plume (`arrow-insert` retiré) — *« beaucoup plus cohérent »*.
- **Souder point par point** (`H-37`, moitié) : une ancre tirée seule près de l'ancre ou du tronçon d'un voisin
  s'aimante, et le relâchement fusionne (`core/editor/anchorWeld.ts`, `canvas/weldGestures.ts`). Le dev : *« ce
  sera déjà une grosse avancée »*. **Pas encore marché dans l'appli, pas revu à quatre agents** (commit demandé).
- **Mes fautes de l'après-midi** : un onglet Chrome piloté par moi ouvert pendant son test, et sa page a cessé de
  répondre jusqu'à ce que je le ferme (mémoire [[no-automation-tab-while-he-tests]]) ; des fichiers écrits pendant
  qu'il testait (risque de rechargement Vite) ; des tests aux comptes faux du premier coup, recomptés.

Le matin :

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
- **Mes fautes** : une page rechargée qui a effacé la correction non enregistrée du dev (il l'a refaite) ; un `cd`
  en tête de commande ; un heredoc non protégé qui a vidé des gabarits (réparé) ; un premier test « Rana » qui
  passait aussi avec l'ancienne règle (réécrit, `719dc89`) ; la promesse « le redimensionnement dans la coquille »,
  fausse.

> Older sessions (2026-09-12 → 2026-10-13) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
