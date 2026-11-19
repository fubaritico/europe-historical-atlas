## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

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

### 2026-11-18 (nuit) → 19/11 — l'historien : la Rus', le Levant et la Mésopotamie en 1100, la Finlande dessinée

Plages journalisées **18/11 23:18 → 00:19** et **19/11 18:24 → 23:45** (avec le codeur dans une autre session ; les
saisies du CMS ne sont pas journalisées) ; le chantier totalise **371 h 58 sur 58 plages**.

- **La Rus'** (sa commande : _« travaille et saisis les résultats de ton travail »_) : 33 villes de 1100, triées par moi
  sur les pages russes, sans agents ; Selezivka (région) corrigée et Bryn complétée après le contrôle du codeur ; note
  `files/plans/sources/1100/rus.md` ; le dossier de travail supprimé à sa demande (_« tout ce dont tu t'es servi »_).
- **Le Levant, Chypre, la Mésopotamie** (_« il me faudrait des villes dans cette zone-là »_, puis _« une partie de la
  Mésopotamie »_) : 51 lieux d'Alep à Gaza et de Mossoul à Kerbala ; six détenteurs pris de la phrase retenue, en alerte
  exprès ; Beït Shéan complétée après le contrôle du codeur ; note `levant.md` (la côte libanaise dessinée seldjoukide).
- **Sa remarque** (mémoire `enough-cities-not-all`) : _« t'as mis tout le Domesday… la moitié aurait suffi »_ — une
  région se remplit jusqu'à la densité de ses voisines.
- **La Finlande** : une proposition puis une maquette en image ; son découpage validé ; dessinée dans l'arbre principal,
  Novgorod reculé à la Neva et au Ladoga (sa réponse), trois tribus, les Sames et les Kvènes en « Aucune » (CARTO-484 du
  codeur) ; relue par le codeur, commitée par lui (`1d8be087`) : _« ça me convient tel que c'est »_. Suite : CORE-486.
- **Mes fautes** : un `cd` dans une commande ; un seuil de 140 lignes pour la mémoire écrit sans source ; trois régions
  vides non annoncées au Levant ; deux téléchargements lancés ensemble, freinés par Wikipédia.
