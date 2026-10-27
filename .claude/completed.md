## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

### 2026-10-27 (soir) — le siège devient un trébuchet animé

Même plage au journal que les deux entrées du 27/10 — **11:06 → 21:54**, comptée d'un tenant (10 h 48) ; la reprise du soir
court de **19:59 à 21:54**. Le chantier ouvert le 05/10 totalise **129 h 36 sur 24 plages**. **Tout poussé** :
`072efa5..2eebda1`, six commits.

- **ATLAS-286 → Fait**, renommé *« une pièce d'artillerie, selon l'époque »* : plus de tour au siège. Pour 1100, le
  trébuchet à traction — en 3D, il charge, lance, la pierre part presque droit et s'efface (*« le mouvement du trébuchet
  est bon »*, *« très très bien »*), fixe en trois quarts face à gauche, deux fois la taille de la tour ; de loin, une
  silhouette de profil juste après le lâcher (« C2 », bâti C, les triangles de la charpente ouverts). La tour en réserve,
  3D et à plat. Le liseré des images plates suit la largeur du dessin. **ATLAS-299** (Backlog) : l'engin selon l'époque.
- La skill `/tune-icon` → **`/make-event-icon`** ; sa règle nouvelle, le **cadre 44 × 44** pour toute image plate.
- **Mes fautes** : le premier trébuchet livré sans passer par le banc (*« pourquoi tu ne fais pas comme on a l'habitude
  de faire »*) — et à l'envers de ses photos ; le glossaire rempli de ce qui n'y va pas (*« ça se transforme en
  dictionnaire »*) ; le liseré deux fois plus fin sur le trébuchet, vu par lui (*« est-ce que tu es sûr »*).

### 2026-10-27 (fin d'après-midi) — les icônes devant le relief, les engins de siège dans la contribution

Même plage au journal que l'entrée suivante : **27/10 11:06 → 18:37 (7 h 31)**, reprise à 16 h 45 ; le chantier ouvert le
05/10 totalise **126 h 19 sur 24 plages**. **2 commits poussés** (`0b9ca67`, `072efa5`), CI verte jusqu'à Sonar ; le reste
**dans l'arbre, non commité**.

- **ATLAS-296** → Fait : épées, halo **et images plates** devant le relief (*« ça doit être pareil pour les sprites »*). La
  côte abaissée (`shoreLift` 0,002, *« un peu trop hauts »*).
- **ATLAS-297** (un calque par type d'icône, *« on sépare »*) écrit, validé, en Backlog ; **ATLAS-298** sa nouvelle idée —
  une épingle de couleur dédiée et une légende, *« ce qu'il y a de mieux »* — en Idées.
- **ATLAS-286, les engins de siège** : le siège = une tour **et** son artillerie selon l'époque ; *« il faut que ce soit
  présent dans la contribution et que tu cites »*. Plan `files/plans/contribution/siege-engines.md` ; ses choix : le plus
  récent en usage, la tour seule hors période, des dates **prudentes**. Étapes 1–4 codées (format v3, collection, export,
  seed passé sur sa base après sauvegarde). La tour 3D au sol, immobile, ronde, **taille validée**.
- **Mes fautes** : l'anglais, plusieurs fois (*« t'oublies systématiquement la langue »*) ; des backticks dans un `perl -e`
  qui ont **lancé le seed sur sa base** — intacte, vérifiée en lecture puis sur une copie ; une planche de lisibilité faite
  hors du banc, la méthode des épées oubliée → la skill `/tune-icon`. *« Tu réagis comme si tu avais la tête à l'envers »*.

> Older sessions (2026-09-12 → 2026-10-27 après-midi) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
