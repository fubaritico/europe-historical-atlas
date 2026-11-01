## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

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

### 2026-10-30 — l'écran « Ville à une date », une seule règle du formulaire à l'export, l'admin du CMS en sombre

Plages au journal : **12:14 → 14:30** et **17:29 → 22:27** (7 h 13), la seconde presque entière **par Remote Control, le dev
loin de l'écran** — je testais dans Chrome et lui envoyais les captures ; le chantier ouvert le 05/10 totalise **159 h 02 sur
29 plages**. Commités, **non poussés** (11 commits en avance) : de `736bc19` à `4a7a9ee`.

- **L'admin du CMS** en sombre, le lambda de l'atlas à la place des images de Payload (`f19aa90`) ; Formik et le design system
  au catalogue ; les fichiers que Payload écrit hors du contrôle du format (CMS-290, Fait).
- **L'écran « Ville à une date »** (ATLAS-295) : notre formulaire à la place de celui de Payload — valide à la saisie, bouton
  grisé, lieu et source cherchés dans la base à chaque frappe, refus d'une fiche en double pendant la saisie, raisons en choix
  multiple (fubaritico-ds 0.9.0, livré par son Claude dans la soirée), lignes de sources ; **une seule règle** dans `core`
  pour le formulaire, le serveur et l'export. Ses mots : *« Il faut le griser, oui. Évidemment »*.
- **L'export écrit les villes** dans le fichier de l'atlas, **préparées à l'export** — sa décision : *« les données, elles
  arrivent préparées, comme en GraphQL »* ; l'atlas ne les dessine pas encore.
- **Décidé par lui** : l'importance qui ordonne la carte est **politique** ; le Saint-Empire n'a pas de capitale, aucune
  symbolique (*« Charlemagne, il est mort depuis 300 ans »*) ; une chapelle d'Aix en 3D un jour (ATLAS-321, Idées).
- **Un compte de test** `claude-test@localhost.test` dans sa base, avec son accord, pour tester à sa place.
- **Mes fautes** : un numéro à la place d'une chose (« décision 8 », « v5 ») — *« je te l'interdis »*, règle notée ; l'export
  annoncé court alors qu'il n'exportait aucune ville ; « aucune jointure » quand l'export en est une ; mon choix de
  recopier les enregistrements (25/10) écrit comme une décision ; un commentaire disant qu'un crochet passe après les règles
  des champs (il passe avant) ; parler d'incertitude sans qu'aucun algorithme n'existe — *« toute cette branlette
  intellectuelle »*.

> Older sessions (2026-09-12 → 2026-10-30 nuit) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
