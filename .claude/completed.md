## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-21 → 22/11 — le codeur : les noms d'époque, de la décision à la carte

Plage **21/11 21:42 → 22/11 02:58** (5 h 15 au journal, partagée avec l'historien dans une autre session ; ma session
va de 22 h 00 à 3 h 00) ; le chantier totalise **383 h 46 sur 60 plages**. **Rien n'est poussé.** Le détail :
`files/plans/contribution/names.md` et les commentaires de CMS-495.

- **Fermés** : ATLAS-288 (les icônes : sept types sur treize, les six restantes au Backlog, ATLAS-478 à 483, l'épique
  ATLAS-132 reste ouverte) ; CARTO-497 (ouvert puis fermé : l'alerte de Cizre était juste).
- **CMS-495, en cours** — parti d'ATLAS-448 et de son documentaire sur les Comnènes (_« on a un problème plus profond
  avec les noms »_). **Dans `main`** : la table « Noms d'époque » et sa migration (tournée sur sa base, rien de perdu),
  le champ sur la fiche datée avec son « + », l'export en version 10, une règle du cœur qui nomme une ville pour
  l'atlas et le Cartographe, la skill de saisie de l'historien, la liste des 132 et 255 noms à trier. **Sur l'arbre
  `coder` seulement** : le tableau des noms d'un territoire dans les autres langues et sa migration, la règle qui
  nomme un pays depuis le CMS et le contrôle des noms manquants.
- **Ses décisions** : les noms se contribuent dans le CMS ; le lieu porte son nom actuel, la fiche datée désigne le nom
  d'époque, _« Ancire devient donc Ankara »_ ; la carte écrit le nom d'époque seul, le nom actuel entre parenthèses
  au clic ; une table à part, contribuée à la volée (_« ce type de contribution à la volée […] est fondamental »_) ;
  tout maintenant (_« ce que l'on fait aujourd'hui, on n'aura pas à le faire demain »_) ; sans nom d'époque, le nom
  du lieu, mais contrôlé ; pour un territoire un seul nom par langue ; _« il ne peut pas y avoir de nom manquant »_ ;
  la recherche Wikidata reste dans le Cartographe, avec « Ajouter au CMS » (CARTO-498) ; un bouton d'export dans le
  CMS (CMS-499) ; _« tout sera en ligne »_, sur des sous-domaines.
- **Mesuré** : 13 297 lieux sur 13 684 portent déjà leur nom actuel ; 191 pays dessinés sur 392 sont reliés à un
  territoire du CMS ; Wikidata donne un nom français à 271 des 290 pays, plusieurs faux pour une carte.
- **Avec l'historien** : six exports commités ; la prise de Brandebourg de 1100, absente du CMS ; ses défauts d'outil
  (REPO-496) ; la langue des contributions (CMS-494).
- **Mes fautes** : un `cd` ; un message à l'historien annonçant une fusion qui venait d'être refusée ; une fusion dans
  `main` pendant qu'il dessinait, sans le dire avant ; un repli écrit avant sa décision, retiré à la revue ; deux
  commits refusés pour une ligne de message trop longue ; le tiroir du « + » jamais vu dans un navigateur.

### 2026-11-22 — le codeur : la fusion des noms, un tiroir vu, le rattrapage des noms anglais commencé

Plage **22/11 16:01 → 18:26** (2 h 24 au journal, l'historien dans une autre session) ; le chantier totalise
**386 h 16 sur 61 plages**. **Rien n'est poussé.** Le détail : le commentaire du 22/11 sur CMS-495.

- **Dans `main`** : les quatre commits de la nuit sur les noms, rejoués sur une seule ligne (il avait vu deux lignes
  dans son journal Git) ; la migration `territory_other_names` prouvée sur une copie puis tournée sur sa base ; la règle
  qui nomme un pays depuis le CMS passée par la revue, aucun défaut ; l'export de l'historien (`a38abeda`).
- **Le tiroir du « + » du champ « Nom d'époque », vu dans un navigateur** : il s'ouvre et se referme. Deux défauts :
  sous la langue de contenu « English » les lieux s'affichent « Sans titre » et ne se trouvent pas (11 lieux sur
  13 717 ont un nom anglais) ; le lieu de la fiche n'est pas prérempli. Enregistrer, rouvrir, modifier, retirer : pas essayés.
- **Ses décisions** (`files/plans/contribution/names.md`) : le nom d'un lieu ou d'un territoire se retrouve par un
  identifiant, auquel répondent plusieurs traductions ; un champ de traduction qui existe ne reste jamais vide, _« il
  faut procéder à un rattrapage »_ ; ce que Wikidata ne nomme pas revient à l'historien, après son travail en cours.
- **Le rattrapage, commencé** : `files/spikes/english-names/fetch_labels.py` lit le nom anglais de Wikidata par
  identifiant ; arrêté à 8 040 réponses sur 14 055 (7 899 nommés, 141 sans nom anglais). Rien d'écrit dans la base.
- **Avec l'historien** : son lot d'Anatolie orientale contrôlé en lecture seule ; son dessin des vassaux du sultan sur
  la 1100 refusé par le dev, qui la retouche lui-même ; un défaut possible du contrôle des villes en Idées (REPO-500).
- **Mes fautes** : trois modèles proposés de suite pour un seul défaut d'affichage ; une suppression de table demandée
  que sa réponse rendait inutile ; une étiquette de secours codée avant sa décision, retirée avant tout commit ; un
  préremplissage annoncé « je commence » et pas commencé ; l'audit des scénarios toujours pas fait.
