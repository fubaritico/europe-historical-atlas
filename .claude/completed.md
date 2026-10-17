## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-17 — Trello, la sauvegarde automatique, la Norvège rapide, le suzerain tapé, Wikidata, le double-clic

Une plage au journal, **17/10 14:43 → 22:03 (7 h 19, 486 actions)** ; le chantier ouvert le 05/10 totalise **76 h 38 sur
14 plages**. **8 commits** `218910a`..`7f0b2be`, **tous poussés** à la demande du dev, plus celui de cet état.
**3 629 tests** (977 `core`, 1 686 Cartographe, 884 atlas, 82 plugin). Le détail de chaque livraison est sur sa carte.

- **Le suivi passe sur Trello** (REPO-236) : compte dédié, skill `/trello`, 6 colonnes par maturité, tickets `[CARTO-41]`
  à compteur unique, étiquettes, modèles, DoD ; « Fait » rempli de 113 cartes, **exhaustivité prouvée** (284 des 315
  commits cités) ; Backlog tiré des plans (92) ; `next.md` allégé. Règle « un seul endroit par fait ».
- **Livré et testé par le dev** : CARTO-240 (Norvège : 4,6 s → 55 ms, index par bandes de latitude, sortie identique à
  l'octet), CARTO-238 palier 1 (brouillon sur disque, reprise à l'ouverture), CARTO-241 (suzerain par saisie),
  CARTO-242 (créer au-dessus du pays sélectionné, dans son groupe), CARTO-243 palier 1 (Wikidata dans la fiche :
  dates, suzerain, anachronisme — Tripoli n'existe pas en 1100 ; Mossoul était une catégorie), CARTO-246 (double-clic
  sur la carte ouvre la fiche).
- **Basic Memory** reçoit son rôle (décision du dev) : le graphe entre projets ; 13 notes dans `main/patterns/`.
- **Échanges sur les sources** : lire et reporter à la main = permis ; décalquer un trait récent = non ; Shepherd 1911
  (domaine public) = oui. Idées notées : ATLAS-244 (Wikipédia au clic), ATLAS-245 (drapeaux en 3D), CARTO-248.
- **Mes fautes** : la page du dev rechargée plusieurs fois (sabotages et comparaisons dans `core`, `main.tsx`) ;
  trois commandes interrompues avaient agi en partie (14 doublons dans Fait, archivés) ; un premier `.gitignore` qui
  n'ignorait pas `.env.local` (corrigé avant toute fuite) ; mon e-mail dans un en-tête Wikidata sans accord ; le
  « Gravité » puis « Basic Memory » mal présentés d'abord. Revues : une dizaine de vrais défauts attrapés avant commit.

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

> Older sessions (2026-09-12 → 2026-10-15) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
