# Rebranding ACME de l'écran d'accueil HexGL — Design technique

## Contexte

ACME utilise HexGL comme animation lors d'un événement d'entreprise et veut que
le tout premier écran vu par le joueur porte son identité (logo, palette,
message d'accueil) plutôt que celle de HexGL/BKcore. Le jeu lui-même (piste,
physique, HUD, contrôles) ne doit pas changer : seul l'habillage visuel de
l'écran d'accueil (`#step-1`) est concerné. Le besoin est détaillé dans
`work/company-event/spec.md` (valeur de vérité fonctionnelle) et
`formation/identite/charte_graphique_acme.pdf` (valeur de vérité graphique) ;
`docs/architecture.md` documente l'état actuel du code.

C'est une codebase legacy sans build tool ni framework (HTML/CSS statiques,
JS ES5 + CoffeeScript compilé committé côte à côte, Three.js vendoré). Node
n'y sert qu'au tooling/tests (`package.json` + `node --test` sur des modules
purs dans `test/`, aucun test DOM/CSS). Contraintes fermes : ne rien
moderniser, centraliser le branding en un seul point de configuration,
préserver strictement le gameplay et toute la logique JS existante, préférer
de petits changements réversibles.

## État actuel (vérifié dans le code)

- `#step-1` (structure DOM, `index.html` lignes 46-60) :
  `#global` (fond, image `css/bg.jpg`), `#title` (logo/titre HexGL, image
  `css/title.png` en `background-image`, **pas une balise `<img>`**),
  `#menucontainer > #menu` avec les items `#start`, `#s-controlType`,
  `#s-quality`, `#s-hud`, `#s-godmode` (masqué par défaut via
  `style="display:none"` inline), `#s-credits`.
- Layout par positionnement absolu pur : `#global`, `#title`,
  `#menucontainer` sont chacun `position:absolute` avec des offsets
  `top/bottom`, sans ancêtre positionné ni flux normal. Il n'existe **aucune**
  media query dans `css/multi.css`.
- Palette actuelle codée en dur dans `css/multi.css` : bleu `#4190bb` (texte
  menu), orange `#f66439`/`#f8854b` (hover, bouton Start), dégradé blanc
  translucide vendor-préfixé sur `#menu div`. Deux animations CSS
  (`anim` sur `#title`, `animbg` sur `#global`) font flotter logo et fond.
- `launch.coffee`/`launch.js` (source de vérité = `.coffee`) ne lisent/écrivent
  que `#step-1` (toggle global) et les ids `start`, `s-controlType`,
  `s-quality`, `s-hud`, `s-godmode`, `s-credits` — jamais `#global`, `#title`,
  `#menucontainer`, `#menu`. Ces quatre derniers sont donc libres à modifier
  ou à compléter sans aucun risque de régression JS.
- `css/bg.jpg` et `css/title.png` ne sont référencés nulle part ailleurs que
  dans ces deux sélecteurs de `multi.css`.
- Aucun objet de configuration JS centralisé n'existe dans le projet (recherche
  exhaustive faite : absent de `bkcore/` et de la racine).
- `formation/identite/logo.png` (2172×724, RGBA avec transparence) contient déjà
  le mot "ACME" et un triangle en dégradé cyan/bleu ; texte du logo en tons
  sombres — **peu contrasté sur un fond sombre `#08090D`**.
- La charte graphique (page "Application événementielle") montre elle-même une
  maquette avec le logo posé sur une **carte blanche à coins arrondis**, sur
  fond `#08090D`, message d'accueil en dessous, bouton en dégradé
  violet→bleu : c'est une confirmation directe de la solution de contraste à
  utiliser, pas une extrapolation.
- `test/` (6 fichiers, `node --test`) ne couvre que des modules purs
  (`timer`, `image-data`, `utils`, `touch-controller`, `orientation-controller`,
  `gamepad-controller`) — aucun ne touche au DOM/CSS/HTML, donc aucune
  interaction avec ce changement.

## Approche technique

Un changement purement **HTML + CSS**, aucune ligne de JS/CoffeeScript
touchée :

1. **Point unique de configuration des paramètres visuels de branding** : un
   unique bloc CSS Custom Properties (`:root { --acme-* }`) en tête de
   `css/multi.css` regroupant uniquement les paramètres visuels de branding —
   palette de couleurs, dégradé CTA, chemin du logo. Toutes les règles de
   `#step-1` consomment ces variables via `var(--acme-*)`. C'est une
   fonctionnalité CSS native (aucun préprocesseur, aucun build), donc
   compatible avec "pas de framework/pas de modernisation" tout en satisfaisant
   la contrainte de centralisation : changer la palette ou le logo ne demande
   plus qu'une modification à un seul endroit. Le message d'accueil n'entre
   volontairement pas dans ce point de configuration : c'est un texte figé
   (valeur de référence de la charte, cf. spec §2.4), écrit en littéral
   directement dans `index.html`, sans indirection ni variable — aucun besoin
   exprimé de le rendre configurable dynamiquement.
2. **Fond `#global`** : fond uni sombre (`var(--acme-bg)` = `#08090D`) à la
   place de `bg.jpg`. L'animation existante `animbg` reste strictement
   inchangée (hors périmètre de ce ticket : elle continue de s'appliquer
   telle quelle, y compris au nouveau fond uni). `css/bg.jpg` reste sur
   disque, non supprimé (réversibilité).
3. **Logo ACME sur `#title`** (id réutilisé tel quel, jamais lu par le JS) :
   nouvel asset `css/logo-acme.png` (copie brute de
   `formation/identite/logo.png`, aucune retouche) en `background-image`,
   ratio préservé (un seul axe contraint ou `background-size:contain`), posé
   sur une carte claire (`background-color` blanc/gris clair + `border-radius`
   + padding) pour le contraste — solution de "support" explicitement permise
   par la spec et confirmée par la maquette de la charte, **sans** ombre,
   contour ni recoloration ajoutés au logo lui-même. L'animation existante
   `anim` reste strictement inchangée (même rationale que `#global` : hors
   périmètre, à conserver telle quelle — elle continue de faire flotter
   l'ensemble carte + logo). La boîte `#title` doit être resserrée
   (largeur/hauteur, `margin:auto`) pour que la carte blanche épouse le logo
   plutôt que toute la largeur de l'écran.
4. **Message d'accueil** : nouvel élément `<div id="welcome">Bienvenue au
   ACME Racing Challenge</div>` inséré dans `index.html` entre `#title` et
   `#menucontainer` (id neuf, aucune collision avec le JS). Comme tout le
   layout de `#step-1` est en `position:absolute` sans flux normal, ce nouvel
   élément doit explicitement recevoir `position:absolute` avec des offsets
   calés entre le bas de `#title` et le haut de `#menucontainer`, et un
   `z-index` intercalé (sinon il partirait en flux normal en haut de la page
   et chevaucherait tout). Texte blanc, police héritée `BebasNeueRegular`
   (aucune nouvelle police), `white-space:normal` explicite pour autoriser le
   retour à la ligne sans jamais tronquer.
5. **Menu et bouton Start** : couleurs de `#menu` (texte par défaut),
   `#menu div:hover` et `#start`/`#start:hover` recolorées avec les variables
   ACME ; le bouton `#start`, en tant qu'élément d'action, utilise le dégradé
   événementiel violet→bleu (seul usage autorisé de ce dégradé). Aucun id,
   texte ou structure changé — `#s-godmode` reste masqué par défaut, hérite
   juste de la nouvelle palette si son affichage était activé.
6. **Petits écrans/portrait** : un unique bloc `@media` ciblant seulement
   `#title`, `#welcome`, `#menucontainer`/`#menu`, ajouté une fois la
   disposition desktop stabilisée, pour éviter tout chevauchement — répond à
   un critère d'acceptation explicite de la spec qui n'a aujourd'hui aucune
   réponse dans le CSS existant (aucune media query n'existe).

## Fichiers et modules impactés

- `css/multi.css` — seul fichier CSS modifié : bloc `:root`, règles `#global`,
  `#title`, nouvelle règle `#welcome`, `#menu`, `#menu div:hover`, `#start`,
  `#start:hover`, nouveau bloc `@media`. Aucune autre règle du fichier
  (`#step-2` à `#step-5`, `#progressbar`, `#leapinfo`, `#credits`) n'est
  touchée.
- `index.html` — un seul ajout : `<div id="welcome">…</div>` dans `#step-1`.
  Aucun id existant renommé/supprimé, `<head>` non touché (title de page,
  Open Graph, favicon, Analytics restent hors périmètre).
- Nouvel asset `css/logo-acme.png` (copie de `formation/identite/logo.png`,
  convention du projet : assets à plat dans `css/`).
- **Non modifiés** : `launch.coffee`/`launch.js`, tout `bkcore/`/
  `bkcore.coffee/`, `css/fonts.css`, `css/touchcontroller.css`,
  `css/bg.jpg`, `css/title.png` (conservés sur disque, seulement déréférencés),
  `docs/architecture.md`, `manifest.webapp`, `cache.appcache`, `test/`.

## Structure des données de branding (point unique pour les paramètres visuels)

En tête de `css/multi.css` :

```css
:root {
  --acme-bg: #08090D;
  --acme-violet: #7628FF;
  --acme-blue: #315BFF;
  --acme-cyan: #00C4E8;
  --acme-white: #FFFFFF;
  --acme-gray-light: #E6E8EE;
  --acme-gradient-cta: linear-gradient(to right, #7628FF, #315BFF);
  --acme-logo-url: url('logo-acme.png');
}
```

Ce bloc couvre uniquement les paramètres visuels de branding (palette,
dégradé événementiel, chemin du logo) : toute évolution future de la palette
ou du logo se fait exclusivement ici, le reste du CSS ne référençant plus
jamais de valeur littérale pour ces éléments. Le message d'accueil
("Bienvenue au ACME Racing Challenge") est volontairement exclu de ce point
de configuration : c'est un texte de référence fixe de la charte, écrit tel
quel dans `index.html`, pas un paramètre de branding à variabiliser.

## Décisions techniques principales

- **CSS Custom Properties plutôt qu'une convention documentée**, limitées aux
  seuls paramètres visuels de branding (palette, dégradé, logo) : natif au
  navigateur, aucun outillage supplémentaire, impose réellement un point de
  vérité unique (contrairement à un commentaire qui n'empêche pas une valeur
  dupliquée oubliée). Le message d'accueil reste volontairement un littéral
  HTML, non couvert par ce mécanisme. Seule limite : non supporté par
  IE ≤ 11 ; hypothèse assumée d'un navigateur moderne pour un événement
  d'entreprise ponctuel, à documenter explicitement lors du commit final
  (réalisé après validation complète de l'implémentation).
- **Carte claire derrière le logo plutôt que retouche du logo** : seule
  solution qui respecte à la fois "contraste garanti" et "sans ombre/contour/
  recoloration sur le logo" ; confirmée par la maquette de la charte
  elle-même (pas une improvisation).
- **Conservation à l'identique des animations `anim`/`animbg`** plutôt que
  leur suppression ou adaptation : la spec les liste comme hors périmètre, ce
  qui signifie qu'elles ne doivent pas être touchées par ce ticket — ni
  retirées, ni modifiées — même si le contenu qu'elles animent change (fond
  uni à la place de `bg.jpg`, carte+logo ACME à la place de `title.png`).
  Décision validée explicitement par le tech lead.
- **`#welcome` en `position:absolute` explicite** : nécessaire parce que tout
  `#step-1` est déjà construit en couches absolues sans flux normal ; un
  `<div>` sans position explicite se placerait en haut du document et
  chevaucherait le reste au lieu de s'insérer entre logo et menu.
- **Aucune modification de `launch.coffee`/`launch.js`** : tous les ids lus
  par le JS restent identiques, donc risque de régression fonctionnelle fortement limité sur le menu, le démarrage, les crédits ou la suite du parcours de jeu.

## Risques et compatibilité

- **Contraste logo/fond sombre** → mitigé par la carte claire (cf. décisions).
- **Animations existantes conservées telles quelles** : le flottement
  vertical (`anim`/`animbg`), prévu à l'origine pour `bg.jpg`/`title.png`,
  continue de s'appliquer au nouveau fond uni et à la nouvelle carte logo —
  à vérifier visuellement que ce mouvement reste discret et ne nuit pas à la
  lisibilité du logo, du message ou du contraste une fois appliqué au
  nouveau contenu.
- **Chevauchement sur petits écrans/portrait**, aggravé par l'absence totale
  de media query préexistante → mitigé par l'ajout d'un bloc `@media` dédié,
  à valider visuellement en redimensionnant/en mode portrait DevTools.
- **CSS Custom Properties non supportées sur IE ≤ 11** → acceptable pour un
  événement ponctuel sur navigateurs modernes ; pas de polyfill prévu.
- **Réversibilité** : `css/bg.jpg` et `css/title.png` restent sur disque
  (juste déréférencés), donc un `git revert` du CSS/HTML suffit à restaurer
  l'état HexGL d'origine sans perte d'asset.
- **Aucun risque sur le gameplay/les contrôles/le HUD** : aucun fichier JS/
  CoffeeScript n'est touché, aucun id consommé par `launch.js` n'est modifié.

## Stratégie de tests et de vérification

- Lancer `npm test` (`node --test`) avant et après le changement : doit rester
  vert à l'identique, aucun des 6 fichiers de `test/` ne portant sur le
  DOM/CSS modifié.
- Vérification manuelle dans un navigateur (`index.html` en local), en
  reprenant chaque critère d'acceptation de `work/company-event/spec.md` §7 :
  logo intégral/non déformé/contrasté avec respiration visible, message
  "Bienvenue au ACME Racing Challenge" visible et lisible, fond sombre avec
  uniquement des couleurs de la palette ACME sur les éléments mis en avant,
  disparition du titre/logo HexGL de cet écran, chaque action du menu
  (démarrer, type de contrôle, qualité, HUD, crédits) inchangée.
- Dérouler un parcours de jeu complet (Start → aide contrôles → chargement →
  course → fin de course/score → crédits) pour confirmer qu'aucun écran
  au-delà de `#step-1` n'a changé visuellement ou fonctionnellement.
- Vérifier explicitement que `#s-godmode` reste masqué par défaut
  (`display:none` conservé) malgré le nouveau CSS.
- Redimensionner la fenêtre / simuler un écran portrait (DevTools) pour
  confirmer l'absence de chevauchement entre logo, message et menu.
- Confirmer qu'aucune nouvelle police web n'a été ajoutée (`css/fonts.css`
  inchangé) et que `git diff` ne touche que les fichiers listés ci-dessus.
- Confirmer par relecture du diff CSS que les déclarations `animation`/
  `@keyframes` (`anim`, `animbg`) restent strictement identiques avant/après
  (aucune suppression ni modification), conformément à la décision de
  conservation.

## Plan d'implémentation (5 étapes progressives)

Ces 5 étapes sont des jalons de progression et de vérification interne, pas
des points de commit indépendants : le commit (unique ou découpé selon
convenance) n'intervient qu'une fois l'ensemble des 5 étapes implémenté et
validé dans son intégralité.

1. **Fondations + fond sombre** : ajouter le bloc `:root` dans
   `css/multi.css` (paramètres visuels de branding uniquement), remplacer le
   fond de `#global` par `var(--acme-bg)` en conservant intacte l'animation
   `animbg` existante. Vérifier que le fond d'accueil est uni sombre, toujours
   animé comme avant, sans rien casser ailleurs.
2. **Logo ACME + carte de contraste** : copier `formation/identite/logo.png`
   vers `css/logo-acme.png`, adapter `#title` (nouveau `background-image`,
   carte claire, dimensionnement resserré) en conservant intacte l'animation
   `anim` existante. Vérifier logo net, non déformé, contrasté, avec
   respiration, et que le flottement hérité de l'animation reste discret sur
   le nouvel ensemble carte+logo.
3. **Message d'accueil** : ajouter `#welcome` dans `index.html` et son CSS
   (`position:absolute`, offsets, `white-space:normal`). Vérifier absence de
   chevauchement avec logo/menu en desktop.
4. **Re-skin menu et bouton Start** : recolorer `#menu`, `#menu div:hover`,
   `#start`, `#start:hover` avec les variables ACME et le dégradé CTA sur
   Start. Vérifier que chaque item déclenche toujours le comportement exact
   d'avant (clic Start, changement de réglages, crédits).
5. **Media query petits écrans/portrait** : ajouter le bloc `@media` ciblé sur
   `#title`/`#welcome`/`#menucontainer`, puis dérouler l'intégralité de la
   checklist de vérification (§ ci-dessus), y compris `npm test` et le
   parcours de jeu complet.
