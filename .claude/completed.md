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

### 2026-11-21 → 22/11 — l'historien : les Slaves entre Elbe et Oder, l'Anatolie de 1100 ville par ville

Plage **21/11 21:42 → 22/11 02:46** (5 h 03 au journal, le codeur dans une autre session) ; le chantier totalise
**383 h 34 sur 60 plages**. La carte est commitée (`90863a0f`, `fa91bd54`), les exports l'ont été par le codeur
(`574d2ba8` le dernier) ; rien n'est poussé par moi. Le détail : `next-historian.md`, `files/plans/sources/1100/wends.md`.

- **Les Slaves entre Elbe et Oder** (sa demande, sur une capture : _« villes, forteresses, tribus, peuples »_) : 26 lieux
  saisis avec leur fiche de 1100, six entités dessinées — Abodrites (sous la Saxe), Lutices, Ukranes, Ranes, Brizanes,
  Hévelles ; le pays des Sprévanes laissé sans maître (_« ça me convient comme ça »_).
- **L'Anatolie** (_« il y a un cruel manque de villes pour la Turquie »_) : 31 lieux nouveaux ; puis **la passe
  d'appartenance** qu'il a demandée (_« une passe sur l'appartenance de chaque ville dans l'année 1100 précisément »_) —
  71 fiches dont le détenteur avait été repris de la carte reçoivent leur ligne de source ; douze seigneurs de l'est
  avec leurs titres et leurs chaînes. La carte retouchée sur le plateau : Roum jusqu'à Dorylée, les Danichmendides
  jusqu'à Ancyre. **Mesuré dans Cliopatria** : Roum y garde un seul contour de 1099 à 1138 — son impression était fondée.
- **Ses décisions** : _« applique-toi, tu fais pas des traits grossiers »_ et un tracé peut déborder sur la mer, l'atlas
  la masque (`use-cartographer/references/decide.md`) ; plusieurs agents permis pour les recherches ; _« je ne comprends
  pas comment on peut avoir une chaîne incomplète là »_ — dans l'empire seldjoukide un émir relève du sultan, je cherche
  le témoin ; une carte de période qu'il donne (Armenica, Shah-Armens) est une liste de pistes : elle a fait sortir
  Malatya, les Mengüjekides et les princes de Sasun.
- **Avec le codeur** : les noms d'époque (CMS-495) sont arrivés pendant la saisie — le lieu porte son nom actuel, le nom
  d'époque est une fiche à part ; trois défauts d'outil donnés (REPO-496).
- **Reste** : le lot an-17 prêt à saisir, mes quatre fiches fausses, le latin d'Albert d'Aix, les noms d'époque.
- **Mes fautes** : l'heure annoncée de tête, fausse de trois heures (_« il est pas 6 heures du matin, il est 2 h 51 »_) ;
  un chemin donné au lieu d'ouvrir l'image (_« c'est pas ouvrable, c'est chiant »_) ; les îles laissées hors des contours
  par le suivi de côte (_« tu as laissé des espaces non revendiqués »_) ; un export lancé avant de lire le message du
  codeur sur le nouveau format ; des liens laissés vides là où un témoin existait.
