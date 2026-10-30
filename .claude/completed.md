## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

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

### 2026-10-29 soir → 30/10 nuit — les villes : des règles de cartographe, trois sources, la fiche « Ville à une date »

Dans la plage **29/10 15:42 → 30/10 00:54** (la session de 22:58 à 00:54, ≈ 2 h) ; le chantier ouvert le 05/10 totalise
**151 h 40 sur 27 plages**. Commités, **non poussés** : `b3cafed` (les villes à une date), `898cd65` (les sources des villes).

- **Le tableau** : ATLAS-301, 145 et 302 passés en Fait avec leur commentaire de clôture ; ATLAS-304 renvoyé dans À faire
  (R3, dessiner au besoin) ; l'étape 5 des noms devient ATLAS-319 ; le CMS bilingue devient CMS-320.
- **Les villes (ATLAS-295, en cours)** — à sa demande, les icônes suivantes attendent : *« on a beaucoup imité une
  présentation de jeux vidéo […] il faut retrouver des règles cartographiques »*. Huit décisions dans
  `files/plans/atlas/cities.md` : le point et le nom ensemble, par importance ; le filigrane des pays au dernier ordre de
  villes ; l'importance datée et **jamais tirée de la population** (*« une ville peut être peu peuplée et être très
  importante »*) ; deux formulaires, le lieu et la ville à une date ; une date ou une durée ; aucune fiche ne chevauche une
  autre du même lieu, **validée à la saisie** ; l'écran fait de Formik + Zod + son design system.
- **Les sources** : Bosker 2013, Buringh 2021, Chandler par Reba 2016, en amalgame, une colonne par source
  (`files/spikes/city-sources/`) ; une première liste des villes de 1100 (`cities-1100.md`).
- **Le CMS** : « Villes à une date » et « Raisons d'importance » ; le refus de chevauchement en une phrase, fr/en ; un texte
  sous chaque champ. Testé par lui : *« c'est vérifié »*.
- **Mes fautes** : le formulaire livré sans aucun texte (*« on comprend rien à ta merde ! Y'a pas de texte, y'a rien ! »*) ;
  le message anglais de Payload laissé tel quel ; un test demandé sans les valeurs à saisir ; une phrase de réponse
  incompréhensible (*« le pourquoi est au clic… »*) ; une durée proposée puis retirée puis remise — il le sentait : *« un
  trou dans la raquette »*.

> Older sessions (2026-09-12 → 2026-10-29 jour) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
