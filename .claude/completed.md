## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

> Older sessions (2026-09-12 → 2026-11-11, code instance) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.

### 2026-11-23 — l'historien : la recherche déménage sur le disque Acer, l'Anatolie mise en place

Session **23/11 14:33 → 16:36** (≈ 2 h ; la plage du journal, 13:20 → 16:30, est partagée avec celle du matin) ; le
chantier totalise **389 h 32**. Rien n'est poussé ; douze commits, `7942469f` → `dfff9703`. Le détail : `next-historian.md`.

- **Ses règles, écrites dans `/find-sources`** : l'existence d'une ville se vérifie aussi dans un livre, autant que
  possible ; **le contexte des années d'avant, c'est moi qui le construis**, précis à la date, au lieu et aux acteurs, et
  les questions ville par ville en sortent ; le formulaire de mise en place revient, ce qu'il donne aide et ne prouve
  rien ; une région déjà faite est refaite à neuf puis confrontée fiche par fiche.
- **`/find-sources` réécrite selon les bonnes pratiques** : 375 lignes de règles et d'historique → 168 lignes d'ordres ;
  l'ancien texte entier dans `references/rules-in-full.md`.
- **Le disque Acer** (`/Volumes/Acer/atlas-historien/`) devient, par sa décision, l'espace de travail alloué des
  recherches, leur seule source de vérité : rien de l'historien sur le Mac ni dans le dépôt. Ce qui resservira à la
  racine (`ouvrages/`, `lieux/`, `outils/`), ce qui vaut pour une année et une zone sous l'année. L'ancien matériel de
  1100 (13 409 fichiers), les 21 notes de `files/plans/sources/` et mes copies de carte y sont copiés et vérifiés ; il a
  effacé les originaux. Trois scripts nouveaux (`archive.py`, `count_sheets.py`, `find_book.py`), les autres repointés.
- **REPO-501** (un RAG sur l'archive, sur le disque) en tête du Backlog ; je lui dirai quand le construire (30 livres).
- **L'audit des instructions du soir** : treize renvois laissés en retard par mes changements, corrigés (`dfff9703`).
- **L'Anatolie de 1100** : ses six axes et ses cinq livres notés ; quatre trouvés et lus (Kaldellis, Angold, Setton I,
  l'Alexiade) ; le contexte de 1071 à 1101 écrit ; 138 fiches comptées. Rien saisi.
- **Mes fautes** : des questions qu'il n'avait pas à trancher ; deux commandes de suppression données à taper, contre
  ma mémoire ; des renvois laissés en retard, trouvés par l'audit.

### 2026-11-23 — l'historien : la méthode de recherche refaite, aucune recherche lancée

Plage **23/11 13:20 → 14:18** (57 min au journal) ; le chantier totalise **387 h 20 sur 62 plages**. Rien n'est poussé.
Commit `add0fb1d`. Le détail : `next-historian.md` et `/find-sources`, « The run, in order » et « The obligation ».

- **Son constat** : la carte ne ressemble pas à ce que les autres dessinent — l'Anatolie de la reconquête d'Alexis Iᵉʳ,
  Ancyre aux Danichmendides, la Castille, aucune ville dans le Caucase ni l'ancienne Arménie.
- **Mesuré** : 3 529 lectures du registre sur 3 534 étaient des pages Wikipédia ; aucun ouvrage du disque ouvert ; sur
  13 705 fiches de 1100, 11 949 ont un détenteur sans aucune ligne (le pays dessiné sous la ville), 412 sur Wikipédia
  seule ; un seul lieu en Arménie, Géorgie et Azerbaïdjan.
- **Ses règles, écrites dans les skills** (`find-sources`, `bulk-entry`, `enter-in-cms`, l'agent `source-researcher`,
  `roles/historian.md`, `rules/decision-tree.md`) : Wikipédia n'est qu'une amorce ; un détenteur exige un livre lu ;
  notre carte n'est jamais une base de vérification ; six canaux obligatoires et l'index des livres sur un à deux
  degrés ; trois phases — la mise en place par formulaires (ses axes, ses noms, ses ressources), l'exécution qui croise
  les lectures, le démontage qui vide le disque ; chaque essai compté et dit dans un journal ; CONNEXION IMPOSSIBLE ;
  J'AI BESOIN DE TOI, les cas bloqués sur une page lisible ; une ville lue dans une source est une ville à ajouter.
- **Dans les scripts de `/bulk-entry`** : `log.py`, `prepare.py`, `region_gate.py`, `cited_works.py` (nouveaux) ;
  `meta.py` ne lit plus la carte, `verifyv.py` refuse un détenteur sans livre — essayés sur un lot de deux pages et sur
  une copie d'une ancienne vague (70 fiches refusées sur 70).
- **Sept ouvrages ajoutés par lui sur le disque**, inscrits dans `bibliotheque.md` ; le Palgrave de Byzance ouvert, un
  essai au registre (son texte donne aux Danichmendides le plateau central), ses cartes pas regardées.
- **Mes fautes** : je m'arrêtais à Wikipédia depuis des semaines et la saisie en masse recopiait la carte ; des
  réponses trop longues pour une seule question ; le cas d'Ancyre repris alors qu'il parlait du déroulé ; une recherche
  lancée par formulaire qu'il n'avait pas demandée ; une suppression de 740 Mo donnée à décider.
