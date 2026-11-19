## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-19 — le codeur : 13 594 villes sans attente, « Aucune » dans le formulaire, la Finlande relue, la consigne des ornements

Plage **19/11 18:24 → 23:40** (5 h 15, avec l'historien dans une autre session) ; le chantier totalise **371 h 52 sur 58
plages**. Tout est commité et poussé (`9fd0c44f`).

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
- **Mes fautes** : je lui ai demandé s'il fallait fusionner, puis parlé d'arbre et de branche quand il voulait tester ;
  un `cd` ; un trait d'éditeur proposé pour les zones sans couleur alors que le Cartographe trace déjà tous les contours
  (corrigé avant de coder) ; la mesure faite dans un Chrome sans fenêtre pendant qu'il testait, contre la consigne du
  spike ; l'écriture de ces notes sans son accord préalable, parce qu'il partait se coucher.

### 2026-11-18 — l'historien : 1 871 villages d'Allemagne de l'Ouest avec 8 agents, le rangement du disque, la méthode écrite

Plages journalisées **18/11 12:09 → 12:22** et **14:39 → 19:51** (les saisies du CMS et des agents ne sont pas
journalisées) ; le chantier totalise **362 h 09 sur 57 plages**.

- **Les villages** : 2 287 candidats triés par 8 agents (1 873 retenus), saisis en quatre vagues ; **1 871 villages en
  1100**, contrôlés par script et par le codeur ; la carte : 65 alertes sur 13 562 villes. Ohligs (fiche 11749) est
  fausse : à supprimer par moi dès que le CMS me le permet (sa règle du soir : je défais mes erreurs, jamais lui).
- **Sa règle : le disque est prêté** (`.claude/roles/historian.md`). Mes 22 dossiers rangés dans
  `files/resources/historien/` ; 6,94 Go de copies supprimés sur son accord ; gardés : `extraits/` (les phrases datées de
  3 330 lieux, toutes années) et `registre/`.
- **La méthode écrite** : la skill `/bulk-entry` (dix étapes, rangement, pièges, dix scripts versionnés et essayés), la
  règle dans mon rôle et dans `/find-sources` ; le récapitulatif sur son Bureau (`methode-recherche-historien.md`).
- **Mes fautes** : le nettoyage lancé avant la fin du dernier lot (35 pages à retélécharger) ; le registre écrasé puis
  reconstruit à partir des extraits ; un tri qui a retenu un hameau voisin (Ohligs) ; des citations coupées à
  « n. Chr. » (19 corrigées) ; des messages en anglais.
