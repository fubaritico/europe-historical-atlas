---
paths:
  - "packages/cartographer/**"
---
# The Cartographer — what to know before coding in it

> Moved verbatim from `next.md` on 2026-10-21: reference facts, not the resume point. Loaded by path.

### Le design system est branché — ce qu'il faut savoir pour s'en servir

**Les quatre paquets `@fubaritico/*` en `0.8.0`** (24/10, pour le `Toast` ; `0.7.0` le 21/10, CARTO-117), depuis GitHub Packages (token en
local dans `~/.npmrc`, `github.token` en CI). **La 0.7.0 nomme chaque jeton de couleur d'après ce qu'il peint**
(`--color-surface-raised`, `--color-text-secondary`…) : un rôle que `theme.css` ne pose pas reste au gris clair du
DS, sans erreur, et `theme.test.ts` refuse une surcharge qui nomme un rôle disparu. Le plan
(`files/plans/cartographer/design-system-integration.md`) est **fait jusqu'au pas 4**.

1. **Une seule cascade, dans un seul module** : `ui/styles/sheets.ts` — tokens → peau → thème → reset (dans
   `@layer ui.reset`) → shell → `editor-chrome.css`. L'app et l'établi l'importent ; un test refuse tout
   import de feuille ailleurs. **Une règle hors layer bat tout layer** : c'est ce qui fait gagner nos
   surcharges, et c'est ce qui aurait fait perdre le DS contre un reset hors layer.
2. **Les couleurs : la palette dans `theme.css`, une fois**, et les tokens du DS pointés dessus. Aucune
   couleur en dur ailleurs — vérifié le 09/10. **Les tailles viennent de `design/chrome.css`.**
3. **Régler le style dans l'établi** (`pnpm dev:cartographer` → `/workbench.html`), et **prouver par le
   style calculé dans un vrai navigateur** : jsdom n'a pas de cascade de layers.
4. **Pièges déjà payés** : jamais de `display` sur `Modal`/`Drawer` · `autoFocus` de React n'écrit pas
   l'attribut, un `<dialog>` ne le verrait pas · un bouton dans un `<form>` soumet par défaut —
   `type="button"` partout sauf OK · le `Card` coupe ce qui déborde, d'où `overflow: visible` sur la
   boîte du formulaire.

**Le ColorPicker est fait** (10/10) : `ColorField` du DS `0.5.0` dans la boîte de création, « automatic » = `null`.

**Décisions du dev du 09/10, à ne pas re-trancher** : le **contraste n'est pas une contrainte** dans
l'éditeur · le formulaire est une **boîte de dialogue**, pas le panneau `{Details}` de `design/03` · un
**établi** plutôt qu'un Storybook · secondaire sur le panneau avec le filet des champs, **primaire
rempli de la couleur du filet**, texte blanc, au survol le fond des champs.

> Les notes d'avant `(c)` et `(d)` (livrés) sont archivées dans `archive/next-history.md` — à relire si une décision de cible, de curseur ou de barre d'état est remise en cause.


### La skill à ouvrir avant de coder

`/scenarii-to-code` (écrite le 06/10) : charger le `s00` du jeu, le scénario qui gouverne, et `s99` ;
faire de chaque `Then` **une assertion ou un manque déclaré** ; et ne jamais écrire dans un commentaire
une promesse qu'une étape ultérieure doit tenir — elle va dans `next.md`, relu à chaque session, ou dans la
tranche known-issues de son paquet (`.claude/rules/known-issues/<paquet>.md`) avec un déclencheur nommé. Elle existe parce que `4d-1` a livré une JSDoc, écrite deux étapes
plus tôt, promettant un cache que `4d-1` n'a pas construit.


### Trois choses décidées pour l'étape 4, à ne pas re-trancher

1. **Le repère du canevas est celui du fond** — la seule boîte : la zone éditoriale est supprimée depuis le 18/10 (`s12`).
2. **Deux canevas** : un statique redessiné au commit, un overlay au `pointermove`. La barre d'état
   s'écrit **impérativement**.
3. **Le fond est cuit par le Cartographe** avec `bakeTerrainPixels(…, null)` — le `null` est l'année
   installée, donc le terrain nu, donc « tint politique retiré » sans rien à nettoyer.

### Les skills React archivées — mesurées une par une (déplacé de `decision-tree.md`, 29/10)

> **This repository has React in it** — the Cartographer, since 2026-10-01. Of the six React skills archived
> under `files/claude-archive/skills/`, measured one by one:
>
> | skill | state |
> | --- | --- |
> | `react-canvas-and-panels` (**active**) | **this repository's own.** React owning an imperative canvas, and the panel pattern. Read it before writing a component here |
> | `solid-react-principles` (284 lines) | applicable, and overlaps `modular-architecture.md`. Load on demand |
> | `react-best-practices` | **well built and deliberately left archived, for a licence reason, not a quality one.** 70 rules in addressable files under a 7 kB entry, by Vercel Engineering — four of them are exactly our canvas seam. But there is **no LICENSE file**: the only claim is a `license: MIT` frontmatter line written by whoever packaged it, with no copyright holder, and the README describes an upstream repository that is not present. `files/` is gitignored and `.claude/` is not, so moving it in would commit 108 kB of third-party content on an unverifiable claim — in a repository that goes public. **What we do instead**: `react-canvas-and-panels` restates the few facts we need in our own words and cites the rules by name. Reopen only if the upstream and its licence are found |
> | `composition-patterns` (946 lines) | generic, same licence question. Load on demand, do not commit |
> | `new-react-component` | **dead**: it targets `packages/reference`, Storybook and Tailwind — none of which exist or are wanted here |
> | `state-storage` | **two facts absorbed, the rest stays archived.** It was first dismissed here as redundant with `zustand-react-pattern` — that judgement was made on its *scope* without reading it, and it was wrong. It carries (a) the `useSyncExternalStore` derived-slice gotcha, which independently confirms the `History.rows` finding of 2026-10-05, and (b) "the lightest sufficient tier", which says panel-local state with one writer and one reader needs **no slice at all**. Both now live in `zustand-react-pattern`. What stays archived is design-system material — the Machine tier, Listbox/Typeahead/Toaster, the behaviour-hooks catalogue — which `fubaritico-ds` answers |
> | `react-view-transitions` | out of scope |
>
> Stencil, Storybook, BEM and the monorepo DS skills stay archived and still do not apply.
