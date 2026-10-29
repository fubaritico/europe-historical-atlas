## Completed

The two latest sessions' account; older ones in `archive/completed-history.md`.

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

### 2026-10-29 (jour) — les noms des pays jusqu'au bout, le démarrage, le panneau en développement seulement

Plages au journal : **11:43 → 14:06** et **15:42 → 22:55** (9 h 36) ; le chantier ouvert le 05/10 totalise **149 h 42 sur 27
plages**. **Poussé**, de `2f60766` à `cdbf930`, CI verte, le site déployé avec tout `main` ; `5c36f35` et ces notes partent ensemble.

- **Les noms** : la construction unique (ATLAS-301), puis ATLAS-308 (sous les icônes 3D), 309 (Venise), 310 (les pays sans
  place, dits en console) ; le nom court saisi dans le Cartographe (CARTO-307) ; un nom coupé qui se décale sur la terre
  libre (ATLAS-314) ; l'étiquette déportée sur la mer, ou sur un voisin avec sa ligne de points (ATLAS-315) ; les tribus en
  blanc sur liseré brun, gardé très fin de près (*« là c'est parfait »*) ; la case « Toujours le nom court » (CARTO-318).
- **Le reste** : le flou derrière un contrat (ATLAS-304/305) ; le halo des épingles (ATLAS-306) ; aucune frontière le long du
  bord (CORE-313) ; ‹Entrée› ouvre la fiche (CARTO-312) ; le relief d'abord puis tout en fondu (ATLAS-316) ; le panneau et le
  compteur sous `pnpm dev` seulement (ATLAS-317) ; le relief à 0,2 de près, son réglage ; le commentaire de clôture d'un
  ticket (comment, où, avant → après) dans la skill Trello ; une poussée annule la CI en cours (`concurrency`).
- **L'audit des instructions** (`/doctor prompt-audit`, quatre agents) : rapport `files/prompt-audit-2026-10-29.md`. Appliqué à
  sa demande : les 21 corrections sûres (`a9e3c0d` — le CMS entre dans les contrôles de sécurité, `/review` relit le travail
  non commité, cinq paquets) et les 31 probables (`cdbf930` — le ton, l'historique, les contradictions) ; `reliefWorldY`
  inscrit (`5c36f35`).
- **Mes fautes** : sa demande sur le démarrage mal lue (*« c'est épuisant de devoir répéter »*) ; trois `cd` ; un remède
  faux pour les Obotrites (le nom court ne s'écrit que là où le complet ne tient pas — je ne l'avais pas relu) ; *« c'est
  exactement ce que je veux »* pris pour l'option que j'écartais ; deux poussées à 15 s d'écart, l'ancienne déployée par-dessus
  la nouvelle. La revue à plusieurs agents sautée le soir, à sa demande. Puis une question posée sans arbitrage derrière
  (*« Mais quelle décision ! »*), deux commits refusés pour une ligne de plus de 100 caractères, deux `cd` glissés sans effet.

> Older sessions (2026-09-12 → 2026-10-29 nuit) are archived in `archive/completed-history.md` — not auto-loaded, read on demand.
