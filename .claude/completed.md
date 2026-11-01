## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

### 2026-11-01 nuit — les scénarios de l'atlas, écrits depuis le code

Plage **01/11 01:51 → 03:06**, le prolongement de celle ouverte le 31/10 à 17:39 (9 h 19 en tout) ; le chantier ouvert le 05/10
totalise **168 h 23 sur 30 plages**. **Un commit, non poussé** : `5202b43`.

- **ATLAS-324** : `files/plans/atlas/scenarii/`, sur le modèle du Cartographe — l'index, **dix scénarios** (de l'ouverture aux
  langues), chacun avec son *construit le* (commit, ticket) et son *parcouru* ; **quatorze trous** dans `s99` (A-01 → A-14) ;
  chaque ligne de plan contredite barrée avec une note datée (`03-camera-ux`, `01-foundations`, `focus-mode`, `vassal-lod`,
  `country-names`, `detail-levels`, `cities`…) ; deux termes au glossaire ; la skill `/scenarii-to-code` à jour.
- **Décidé par lui** : trois tickets de correction — ATLAS-326 (*« si c'est juste un mouseleave et un window blur, on y va »*),
  ATLAS-327 (A-01), ATLAS-328 (A-12) ; **ses citations en anglais** dans les fichiers neufs (mémoire notée) ; la suite,
  **l'interface au-dessus de la carte décrite en scénarios pour Claude Design**, puis retour au code. Ses mots : *« je pense que tu
  n'as rien oublié »*.
- **Ma faute** : les noms des pays écrits « en capitales » d'après un commentaire de `cityLabel.ts`, sans lire la valeur
  (`capitals` est éteint) — recopié dans trois fichiers avant de le voir ; corrigé, et le commentaire noté (A-13).

### 2026-10-31 soir → 01/11 nuit — 113 villes, les paliers de détail, les villes sur la carte, l'inventaire des scénarios

Plage **31/10 17:39 → 01/11 01:43** (8 h 03) ; le chantier ouvert le 05/10 totalise **167 h 08 sur 30 plages**. **14 commits, tous
poussés**, de `8808863` à `6c23c15`, CI verte jusqu'au déploiement.

- **Les villes dans le CMS** (ATLAS-295) : 59 par le seed (Bosker capitale → capitale, archevêché → grande ville, trois sources →
  ville), puis l'Est et le Nord (capitales datées par Wikidata), Riazan déplacée à la Vieille Riazan, Mourom ajoutée, les sièges
  de la Rus' lus sur une carte qu'il a donnée (mention RÉFÉRENCE sur ATLAS-152) — **113 villes**. Le titre « Paris — 1100 » d'une fiche.
- **Les villes sur la carte** : marques choisies sur le banc (« C4 avec le blanc à 60 % ») ; **les paliers de détail** — le zoom en
  défilement à crans, quatre paliers, fondu de 0,6 s, deux seuils (`files/plans/atlas/detail-levels.md`) ; noms selon la distance à
  la caméra ; ATLAS-322 (ordre des couches par palier), **ATLAS-323** (un point de capitale sur un nom de pays cède — testé par lui),
  **ATLAS-325** (noms plus grands, plus gras, nets — testé), passés en Fait. Ses retouches de 1100 commitées.
- **Décidé par lui** : *« le religieux et la politique, c'est la même chose »* (l'archevêché est une importance politique) ; *« des
  scroll top »* ; *« c'est le nom du pays qui est le plus important »* — après mon essai de faire contourner les capitales par les
  noms, retiré avant commit : *« c'est mieux comme ça »*.
- **Les scénarios de l'atlas** : l'inventaire fait (`files/plans/atlas/scenarios-inventory.md`), le découpage accepté, ATLAS-324 en
  tête d'À faire — la session suivante reprend là.
- **Mes fautes** : l'heure de reprise lue par `tail` sans la comparer à la date (19 h annoncées « 6 minutes ») — règle ajoutée à
  `start-session` ; les villes dessinées sans test de profondeur, l'épingle passée derrière ; un changement des noms annoncé sans
  vérifier qu'il s'était appliqué (*« c'est pas assez grand »* — rien n'avait changé) ; trois `cd`.

> Older sessions (2026-09-12 → 2026-10-30) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
