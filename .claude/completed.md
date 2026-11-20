## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-20 — le codeur : l'oriflamme de la conquête, les rangs et leurs scores, la décision de migrer vers Jira

Plage **20/11 12:31 → 16:00** (3 h 27 au journal, avec l'historien dans une autre session) ; le chantier totalise
**375 h 49 sur 59 plages**. Tout est commité et poussé.

- **Fermés** : ATLAS-477 (l'oriflamme : le modèle 3D « A », l'image plate « H2 » redessinée dans son cadre, plantée
  par son mât ; le sol sali à sa demande ; l'icône posée par moi sur le type « Conquest », base copiée avant —
  _« Le rendu est très très bon »_), CARTO-487 (une seule liste de rangs, lue par le Cartographe et le CMS ; le rang
  « peuple »), CORE-489 (un score par rang, un vassal mieux classé que son suzerain est dit, jamais bloqué ; **la
  marche à 3**, sa décision de 15 h 20), CARTO-488 (un CMS ID propose le nom, le rang et les années), CARTO-491 (créé
  à sa demande : la fenêtre d'une ville dit le maillon incohérent).
- **Sa règle du jour** (mémoire `one-gesture-to-validate`) : _« je n'ai pas à intervenir dans la validation d'une
  fonctionnalité, elle DOIT être testée, et s'il y a un truc on le verra quand on s'en sert »_ — je teste et je clos ;
  ne va à lui que ce qui se juge à l'œil ou se décide, en un seul geste.
- **Le tableau migre vers Jira** (sa décision) : la colonne « Fait » à 261 tickets, et le besoin d'une hiérarchie
  claire épique → story → tâche → correctif. La référence d'un ticket reste `[CARTO-67]` : _« une pratique qu'on
  gardera pour pas que vous soyez chamboulés avec l'historien »_. À faire dans une nouvelle session.
- **Avec l'historien** : son arbre resynchronisé (52 commits de retard) ; 27 sortes de territoire corrigées par lui
  (les califats, les taïfas en émirats, cinq républiques, les Coumans) ; quatre exports contrôlés et commités. Il
  reste trois maillons signalés, voulus : les duchés de Naples et de Gaète.
- **Trouvé en route** : le contrôle du commit rejouait les tests du Cartographe quand `core` changeait — `test`
  dépend maintenant de `^test` dans Turbo (`rules/troubleshooting.md`).
- **ATLAS-448** commencé : l'inventaire des textes de l'atlas et de leur langue (`files/plans/atlas/one-language.md`).
- **Mes fautes** : un push pendant qu'une CI déployait (son run annulé, le suivant a tout porté) ; quatre tickets
  « à valider » avec des listes de cas à essayer ; CARTO-488 et CARTO-491 clos sans les avoir regardés dans le
  navigateur ; « state » annoncé inutilisé par le ticket, vérifié seulement en codant.

### 2026-11-19 → 20/11 — le codeur : 13 594 villes sans attente, « Aucune » dans le formulaire, la Finlande relue, les oriflammes sur le banc

Plage **19/11 18:24 → 20/11 00:04** (5 h 39, avec l'historien dans une autre session) ; le chantier totalise
**372 h 16 sur 58 plages**. Tout est commité et poussé.

- **Fermés, validés par lui** : CARTO-485 (le Cartographe ramait avec 13 594 villes : le verdict des villes de 0,8 s à
  0,05 s, une ligne de la liste redessinée seulement si elle change, la liste réduite à ses lignes visibles, le canevas
  aux villes à l'écran — _« ça coche immédiatement, pas de problème avec les outils de dessin »_), ATLAS-476 (la tiare du
  concile, choisie par lui dans le CMS et exportée : _« ça me convient »_), CARTO-484 (« Aucune » dans le champ Couleur du
  formulaire, pour le peuple au nom seul).
- **Son souvenir des cases à cocher** (un composant à 9 000 cases, il y a deux ans, où virtualiser n'avait rien donné) :
  ici deux causes, mesurées l'une après l'autre — un calcul refait à chaque clic, puis les 13 594 lignes redessinées ;
  « Afficher toutes les villes » restait lent après ma première correction (_« ça reste lent »_), d'où la liste réduite
  à ses lignes visibles (1,9 s → 0,4 s dans Chrome).
- **Sa règle du soir** (mémoire `he-tests-on-main-no-branch-talk`) : _« moi, ce que je veux, c'est tester sur l'arbre
  principal. J'en ai rien à branler des branches à côté »_ — une correction prête va dans `main` tout de suite.
- **Les ornements** (ATLAS-461) : sa demande — les coins garnis par des SVG, les bords qui s'y raccordent en CSS, de tout
  petits ornements au milieu des bords haut et bas, des ornements latéraux pour les cartouches, sur le lot B. Une
  nouvelle sélection de 31 SVG (`files/resources/ui-ornaments/selection-bords-et-lateraux/`), la consigne
  (`files/resources/claude-design/prompt-ornements-lot-b.md`), le dossier déposé par lui dans Claude Design.
- **Avec l'historien** : ses 51 lieux du Levant contrôlés dans la base (trois écarts renvoyés, réglés ou expliqués) ; la
  Finlande de 1100 dessinée par lui (trois tribus, les Sames et les Kvènes au nom seul, Novgorod reculé jusqu'au Ladoga
  et à la Neva, sa réponse), relue par moi contre le commit d'avant, commitée (`1d8be087`). _« Ça me convient tel que
  c'est. »_
- **Sa demande pour la suite** : des hachures moitié Novgorod, moitié transparentes sur la Carélie — ticket CORE-486, en
  bas d'« À faire », pas commencé (_« tu le fais pas ce soir »_) ; et pour la conquête, une oriflamme (texte de Gemini
  et quatre images, notés sur ATLAS-477).
- **La conquête, en fin de soirée** (ATLAS-477) : _« pond-moi une planche d'oriflammes et de drapeaux »_ — huit images
  plates puis cinq modèles 3D sur ses bancs, le tissu qui flotte (_« c'est la seule animation que je te
  demanderai »_), réglés à ses mots : plus d'ondulation pour les trois sur hampe, 24 bandes pour tous, le bord doré sur
  l'oriflamme, un pied à deux marches. _« Parfait. »_ Il n'a pas encore choisi de lettre.
- **Mes fautes** : je lui ai demandé s'il fallait fusionner, puis parlé d'arbre et de branche quand il voulait tester ;
  un `cd` ; un trait d'éditeur proposé pour les zones sans couleur alors que le Cartographe trace déjà tous les contours
  (corrigé avant de coder) ; des heures écrites de tête dans trois commentaires de ticket (« 0 h 30 », « 1 h » : il
  était minuit) ; la mesure faite dans un Chrome sans fenêtre pendant qu'il testait, contre la consigne du
  spike ; l'écriture de ces notes sans son accord préalable, parce qu'il partait se coucher.
