## Completed

Put here the completed tasks and plans to avoid cluttering the context window.

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

### 2026-10-27 — l'atlas rangé, les icônes instanciées

Une plage au journal, l'après-midi du 27/10, jusqu'à 15 h 55. Commits jusqu'à `c1970d1`, **tous poussés** ; ATLAS-296 dans
l'arbre, non commité.

- **ATLAS-291** : l'atlas rangé par le sens comme le Cartographe (`app/`, `loading/`, `sources/`, `tunables/`, `devPanel/`,
  `scene/` par familles, les modèles 3D dans `meshes/`), des commentaires dans le corps des fonctions — *« Moi, tout ce que je
  veux, c'est que le code soit organisé »*. Plan : `files/plans/atlas/src-layout.md`. **ATLAS-293** : les points laissés
  ouverts par les revues. **REPO-294** : Dependabot à zéro.
- **ATLAS-289** : une géométrie et une matière par type d'icône, puis les halos et les images plates en instances
  (*« pour que vraiment on ait terminé le sujet »*). Il a mesuré : 1 000 / 10 000 icônes à 16,7 ms, 100 000 vers 200 ms.
- **ATLAS-296** ouvert à sa demande (les épées qui se fondent dans le relief) : codé, gate verte, review et test à faire.
- **Mes fautes** : des récapitulatifs qui renvoyaient à « point N » et à des mots privés (« poignée », « feuille ») — *« plus
  jamais ce genre de récap bidon »* ; une tartine pour expliquer les draw calls ; deux fois du contenu absurde écrit dans un
  test ; un `rm -rf` glissé dans une commande, refusé ; le contexte épuisé avant la review.

> Older sessions (2026-09-12 → 2026-10-26) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
