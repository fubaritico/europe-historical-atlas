## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-17 (nuit) → 18/11 — le codeur : la boîte commune des icônes, l'export en deux fichiers, la tiare du concile

Plages **17/11 21:04 → 21:28**, **18/11 01:40 → 02:10** et **18/11 14:39 → 20:21** (5 h 42 la dernière, avec
l'historien) ; le chantier totalise **362 h 39 sur 57 plages**. Tout est commité et poussé, sept commits de `42e4989c` à `77cb1589`, puis les notes.

- **Fermés, validés par lui** : ATLAS-469 (chaque modèle 3D dans une boîte commune, sa taille cuite dans ses sommets, une
  seule échelle ; les ombres des icônes immobiles dessinées une fois), ATLAS-341 (les villes suivent l'année montrée —
  relevé par lui en testant : _« on retrouve les villes dans les années 1200 et 1300 »_), ATLAS-373 (plus rien ne lit les
  frontières GPL ; une année sans carte dit « Cette année n'a pas encore de carte »), CARTO-375 (le bouton « Registre »),
  CMS-223 (l'export écrit deux fichiers, `atlas.json` 0,4 Mo et `cartographer.json` 14,5 Mo ; l'atlas en lisait 21).
- **Sa règle du jour** (mémoire `decided-removals-need-no-validation`) : _« je vois pas pourquoi ça doit passer par moi »_
  — un ménage qui exécute un retrait déjà décidé se commite et se clôt sans attendre son test.
- **Son point sur les icônes** : elles ne sont pas toutes faites ; la cathédrale illustre un évêché, pas un événement ;
  les petits modèles 3D iront au statut d'une ville, _« il faut y aller progressivement »_. Et sa demande d'organisation
  (_« c'est pas juste une question comme ça »_) : **ATLAS-288 devient le ticket parent**, une ligne par type d'événement,
  huit tickets enfants créés (ATLAS-476 à 483 : le besoin, pourquoi pas encore d'icône, trois pistes).
- **Le concile** (ATLAS-476), d'après ses mots (_« le chapeau que porte le pape »_) : quatre candidates sur le banc, son
  choix « B2 », la tiare et la crosse tournée vers l'extérieur (_« simple et clair, le rendu est au rendez-vous »_) ;
  passée dans la carte et dans la liste du CMS (`f4077218`). Il n'a pas encore jugé son image plate ni sa taille.
- **CMS-454, à sa demande en fin de session** (_« le droit de suppression à l'historien »_) : la suppression par le MCP
  ouverte sur cinq collections, tenue par trois refus (ce qui est cité, la suppression par filtre, la case de la clé) ;
  une migration, prouvée sur une copie (`77cb1589`). À valider par lui.
- **Contrôlés pour l'historien**, en lecture seule : 91 forteresses et abbayes, puis 1 838 villages — conformes.
- **Le serveur du CMS** coupé trois fois à sa demande le 17 au soir (la session de l'historien le relançait).
- **Mes fautes** : deux `cd` dans mes commandes ; un ticket renommé sans son numéro (remis aussitôt) ; je lui ai présenté
  un ménage de code mort comme une décision à prendre (_« je sais pas ce que c'est 373 »_) ; les territoires annoncés dans
  le fichier de l'atlas, puis laissés dehors.

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
