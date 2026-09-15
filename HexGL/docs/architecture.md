# Architecture de HexGL (état actuel)

> Document d'exploration décrivant **uniquement l'état actuel** du code présent dans `HexGL/`.
> Il ne contient aucune recommandation, aucune proposition de refactoring, aucune correction.
> Les références `fichier:ligne` renvoient au code tel qu'il existe aujourd'hui.

## 1. Stack et points d'entrée

- **Nature du projet** : jeu de course futuriste en HTML5/WebGL, propulsé par **Three.js**. Three.js est bundlé dans `libs/` — **aucun gestionnaire de paquets, aucun bundler, aucun linter, aucun outil de build**, et aucune dépendance déclarée. L'application `HexGL/` fait ~21 Mo au total.
- **Outillage Node** : `package.json` (`"private": true`, aucune dépendance) n'expose que deux scripts — `npm test` (`node --test`, tests de non-régression des modules purs, voir §5) et `npm run verify:branding` (`tools/verify-branding.js`, contrôles de sources de l'habillage, voir §3.5). Aucune CI dans le dépôt.
- **Exécution locale** : l'application doit être **servie en HTTP** (`cd HexGL && python3 -m http.server 8000`, puis `http://localhost:8000/`). Ouverte directement depuis le système de fichiers (`file://`), le navigateur bloque les chargements d'assets (CORS, origine `null`) : la barre de progression reste à 0 % et l'écran de chargement noir ne se quitte jamais. `README.md` documente désormais ce point.
- **Historique git** : 5 commits, branche courante `refactor/company-event`.
- **Langages** :
  - **JavaScript ES5** « classique » pour le moteur de jeu (`bkcore/`), avec un *namespacing* manuel via un unique objet global `bkcore` (`var bkcore = bkcore || {}` en tête de chaque fichier).
  - **CoffeeScript** pour les utilitaires plus anciens (`bkcore.coffee/`), chaque `.coffee` source étant committé **à côté de son `.js` déjà compilé**. Aucun pipeline de compilation : les deux fichiers sont statiques et leur synchronisation est manuelle.
  - **HTML/CSS** classiques pour toute l'UI (écran-titre, écran d'aide, barre de progression, écran de fin, HUD DOM).
- **Rendu** : WebGL via Three.js. Deux builds vendorisés coexistent dans `libs/` : `Three.dev.js` (chargé par `index.html`, la version active) et `Three.r53.js` (uniquement référencé par `bkcore.coffee/tests.html`). L'API employée est très ancienne (méthodes mutantes `addSelf`, `subSelf`, `multiplySelf`, `translateX`, `rotateAxis`).
- **Audio** : Web Audio API, avec repli sur balise `<audio>` quand `AudioContext` est indisponible (`bkcore/Audio.js`).
- **Contrôles** : clavier, tactile, gyroscope (`OrientationController`), manette (`GamepadController`) et Leap Motion (`libs/leap-0.4.1.min.js`).
- **Point d'entrée HTML** : `index.html` — charge séquentiellement toutes les libs, puis **chaque** module `bkcore.*` dans un ordre de dépendance manuel, et enfin `launch.js`. Aucun système de modules : l'ordre des balises `<script>` est structurant.
- **Point d'entrée logique** : `launch.coffee` (compilé en `launch.js`, chargé en dernier) — gère l'écran-titre et ses réglages, instancie `bkcore.hexgl.HexGL` et lance le chargement des assets.
- **Métadonnées d'empaquetage legacy** : `manifest.webapp`, `package.webapp`, `package.zip` (3,1 Mo) et `cache.appcache` — vestiges d'un packaging Firefox OS / AppCache. `.htaccess` déclare les types MIME associés.

## 2. Flux principal de lancement

1. `index.html` affiche `#step-1` : le logo ACME, le message d'accueil `#welcome` et le menu, composé de `#start`, `#s-controlType`, `#s-quality`, `#s-hud`, `#s-godmode` (masqué en inline `style="display:none"`) et `#s-credits`. L'habillage de cet écran est décrit en §3.5 ; les identifiants et la logique du menu sont inchangés par ce rebranding.
2. `launch.js` : `init()` (`launch.js:42`) est déclarée, puis `u = bkcore.Utils.getURLParameter` (`launch.js:78`) lit les paramètres d'URL pour pré-remplir les quatre réglages via la boucle `_fn` (`launch.js:82-113`). Les valeurs par défaut sont les indices `0` (clavier — ou tactile sur appareil tactile), qualité `3`, HUD `1`, godmode `0`. Les libellés affichés viennent de l'objet `labels` (`launch.js:15-41`, reporté à la main dans `launch.coffee`) ; une valeur d'URL hors liste (par ex. `?controlType=9`) reçoit un libellé de repli (`launch.js:93-105`) au lieu de la chaîne `undefined`, et la valeur reste transmise telle quelle au jeu. Les clics du menu sont câblés, chaque item cyclant sur son tableau de valeurs.
3. Clic sur `#start` → `hasWebGL()` (`launch.js:135-148`) teste un contexte `webgl` puis `experimental-webgl` → affiche `#step-2` (écran d'aide) et lui affecte `css/help-<controlType>.png` en image de fond (`launch.js:160`). Si aucun contexte n'est obtenu, le **libellé** de `#start` devient « WebGL requis : le jeu ne peut pas demarrer » (`launch.js:152`) — mise en forme du bouton conservée, clic détourné vers `http://get.webgl.org/`.
4. Clic sur `#step-2` → affiche `#step-3` (barre de progression) → appelle `init(s[0][3], s[1][3], s[2][3], s[3][3])` (`launch.js:115-119`).
5. `init()` instancie `new bkcore.hexgl.HexGL({...})` avec `track: 'Cityscape'` et `difficulty: 0` **codés en dur**, `gameover: $('step-5')`, puis appelle `hexGL.load({onLoad, onError, onProgress})`.
6. `HexGL.load()` (`bkcore/hexgl/HexGL.js:60`) se contente de déléguer : `this.track.load(opts, this.quality)`. C'est **`Cityscape.load()`** qui porte toute la logique de chargement.
7. `Cityscape.load(opts, quality)` (`bkcore/hexgl/tracks/Cityscape.js:40`) sélectionne un profil d'assets selon la qualité : si `quality < 2`, les chemins pointent vers `textures/` ; sinon vers `textures.full/`. Les deux profils déclarent les mêmes clés.
8. `bkcore.threejs.Loader.load(data)` (`bkcore/threejs/Loader.js:60`) parcourt six types de ressources — `textures`, `texturesCube`, `geometries`, `analysers`, `images`, `sounds` — et incrémente un compteur global `progress.total`. Chaque chargement terminé appelle `updateState()`, qui déclenche `onProgress` ; quand `progress.loaded == progress.total`, `onLoad` est appelé.
   - Les `analysers` (`textures/*/tracks/cityscape/collision.png` et `height.png`) sont chargés via `bkcore.ImageData` — ce sont les cartes de collision et de hauteur, lues pixel par pixel.
   - Les `sounds` passent par `Loader.loadSound()` (`bkcore/threejs/Loader.js:210`) qui appelle `bkcore.Audio.addSound()` et expose un petit objet `{play, stop, volume}` dans `loader.data.sounds[name]`.
   - `onProgress` met à jour la largeur de `#progressbar`.
9. `onLoad` → `hexGL.init()` construit le HUD, les matériaux et les scènes via `track.buildMaterials()` / `track.buildScenes()`, puis le compositeur de post-processing ; bascule vers `#step-4` ; appelle `hexGL.start()`.
10. `HexGL.start()` (`bkcore/hexgl/HexGL.js:92`) : `this.manager.setCurrent("game")`, lance la boucle `requestAnimationFrame` (`raf()` → `this.update()`), puis `initGameplay()` qui crée le `Gameplay` (mode `timeattack`), démarre la musique `bg` et le son `wind`.
11. À chaque frame, `HexGL.update()` appelle `gameplay.update()` puis `manager.renderCurrent()`.
    - `Gameplay.update()` (`bkcore/hexgl/Gameplay.js:175`) déroule une machine à états `step` : compte à rebours (`3`, `2`, `1`, `Go`), puis `step == 4` appelle `this.modes[this.mode].call(this)` (`Gameplay.js:211`). Le mode `timeattack` fait avancer le timer, met à jour le HUD et appelle `raceData.tick()`.
    - `RenderManager.renderCurrent()` (`bkcore/threejs/RenderManager.js:110`) calcule un `delta` via `window.perfNow()` et exécute la fonction de rendu enregistrée par `Cityscape.buildScenes` — laquelle pilote `ShipControls`, `ShipEffects`, `CameraChase`, l'`EffectComposer` et le HUD.
12. Progression de course : `Gameplay.checkPoint()` (`bkcore/hexgl/Gameplay.js:219`) lit un pixel de l'analyseur de collision aux coordonnées du vaisseau ; si `r == 255 && g == 255 && b < 250`, la composante bleue donne l'index du checkpoint. `maxLaps` vaut `3`.
13. Fin de course — arrivée ou destruction : `Gameplay.end(result)` (`Gameplay.js:158`) fige le score, passe `step = 100` et affiche « Finish » ou « Destroyed ». Après 2 000 ms, `Gameplay.update()` appelle `this.onFinish()`, câblé sur `HexGL.js:170` → `self.displayScore(this.finishTime, this.lapTimes)`.
14. **`displayScore()` (`bkcore/hexgl/HexGL.js:180`)** : `this.gameover` valant `$('step-5')` (jamais `null` dans le flux de `launch.js`), la fonction entre dans la branche `if(this.gameover !== null)` et **retourne immédiatement** après avoir affiché `#step-5` et écrit le temps final dans `this.gameover.children[0]` (la `<div id="time">`). Tout le reste de la fonction (lignes 201 à 279) n'est donc jamais exécuté par le chemin de lancement fourni.
15. Touche **Échap** → `HexGL.reset()` (`HexGL.js:83` déclencheur, `HexGL.js:111` implémentation) : réinitialise `lowFPS`, relance `gameplay.start()`, redémarre les sons `bg` et `wind` — **sans recharger les assets**.
16. Clic sur `#step-5` → `window.location.reload()`. Clic sur `#s-credits` → bascule vers l'overlay `#credits`.

## 3. Principaux modules, fichiers et assets

### 3.1 Moteur de jeu — `bkcore/`

| Fichier | Lignes | Rôle |
|---|---:|---|
| `hexgl/HexGL.js` | 446 | Orchestrateur : init du renderer WebGL, boucle de jeu, `tweakShipControls` selon qualité/difficulté, `displayScore`, `reset`, `restart`. |
| `hexgl/Gameplay.js` | 230 | Machine à états de la course : compte à rebours, tours (3 max), checkpoints, modes `timeattack` / `replay`, énumération `results`. |
| `hexgl/ShipControls.js` | 806 | Cœur physique et fichier le plus volumineux : lecture des entrées (clavier/tactile/gyro/manette/Leap), intégration du mouvement, détection de collision et de hauteur par lecture de pixels sur les analyseurs, gestion bouclier / boost / destruction. |
| `hexgl/ShipEffects.js` | 186 | Effets visuels du vaisseau (booster, particules d'étincelles et de nuages). |
| `hexgl/CameraChase.js` | 72 | Caméra suiveuse (mode chase) ou orbitale (mode replay). |
| `hexgl/HUD.js` | 269 | HUD dessiné sur un `<canvas>` 2D superposé (vitesse, bouclier, temps, tours, messages). |
| `hexgl/RaceData.js` | 98 | Enregistrement et rejeu de trajectoire (position + quaternion horodatés), sérialisation JSON. |
| `hexgl/Ladder.js` | 51 | Classement en ligne (chargement d'un JSON distant, affichage des meilleurs scores) — **jamais chargé par `index.html`**. |
| `hexgl/tracks/Cityscape.js` | 521 | **Seule piste implémentée** : déclare les assets des deux profils de qualité, construit les matériaux (shaders normal-mapping maison en haute qualité) et les scènes (skybox, décor, spawn du vaisseau), enregistre la fonction de rendu par frame. |
| `threejs/RenderManager.js` | 131 | Registre de plusieurs « render setups » (`scene` + `camera` + `render` + `objects`), bascule entre eux (`sky`, `game`). Expose `add`, `get`, `remove`, `setCurrent`, `renderCurrent`. Résout `window.perfNow` depuis `performance.now` et ses variantes préfixées. |
| `threejs/Loader.js` | 259 | Chargeur multi-ressources (textures, cubemaps, géométries JSON, analyseurs, images, sons) avec compteur de progression global. |
| `threejs/Particles.js` | 190 | Système de particules maison (sprites). |
| `threejs/Shaders.js` | 949 | Bibliothèque de shaders GLSL custom (`hexvignette`, `normal`, `normalV`…). |
| `threejs/Preloader.js` | 150 | Scène 3D de préchargement — **jamais référencé par `index.html`**. |
| `Audio.js` | 141 | Wrapper audio : `addSound`, `play`, `stop`, `volume`, avec repli `<audio>` si `AudioContext` est absent. |

### 3.2 Legacy CoffeeScript — `bkcore.coffee/`

Chaque module est un couple `.coffee` source + `.js` compilé, tous deux committés :

- `Utils.coffee` / `Utils.js` (250 lignes) — helpers transverses : matériaux normal-map, paramètres d'URL, requêtes XHR maison avec repli `ActiveXObject`, détection tactile, manipulation de classes CSS, calcul d'offset DOM.
- `Timer.coffee` / `Timer.js` (159 lignes) — chronomètre de course et formatage `ms → {h, m, s, ms}`.
- `ImageData.coffee` / `ImageData.js` (156 lignes) — chargement d'image et lecture de pixels avec interpolation bilinéaire ; sert d'« analyseur » pour les cartes de collision et de hauteur.
- `controllers/TouchController.js` (188 lignes) — joystick et boutons tactiles.
- `controllers/OrientationController.js` (130 lignes) — gyroscope.
- `controllers/GamepadController.js` (73 lignes) — manette.
- `threejs/Particles.coffee` / `.js` (210 lignes) — **doublon** : un second système de particules, différent de `bkcore/threejs/Particles.js` (190 lignes), et jamais chargé par `index.html`.
- `tests.html` — page de test **visuel** uniquement : elle charge `Timer.js`, `ImageData.js` et `../libs/Three.r53.js`, sans aucune assertion.

Tous ces modules se terminent par le motif `exports = exports != null ? exports : this; exports.bkcore || (exports.bkcore = {})`, ce qui les rend chargeables tels quels sous Node en plus du navigateur.

### 3.3 Assets et ressources

| Dossier | Taille | Contenu |
|---|---:|---|
| `geometries/` | 1,4 Mo | Modèles JSON Three.js : vaisseau `feisar`, piste `cityscape` (track, scrapers1/2, start, startbanner, bonus/speed), `booster`, `bonus/base`, et `tracks/edge/track.js` (piste sans implémentation associée). |
| `textures/` | 4,3 Mo | Jeu de textures basse résolution. |
| `textures.full/` | 5,3 Mo | Jeu de textures haute résolution. Le `README.md` indique qu'on peut permuter manuellement les deux dossiers. |
| `audio/` | 2,1 Mo | Sons `.ogg` (`bg`, `crash`, `destroyed`, `boost`, `wind`) et musique, avec une licence dédiée dans `audio/LICENSE`. |
| `css/` | 1,7 Mo | Polices `BebasNeue`, sprites d'aide tactile (`help-0..3.png`), `logo-acme.png` (logo de marque actif, voir §3.5), `bg.jpg` et `title.png` (**déréférencés** depuis le rebranding, conservés sur disque), `mobile*.jpg`, `multi.css`, `fonts.css`, `touchcontroller.css`. |
| `libs/` | 1,6 Mo | Dépendances vendorisées : Three.js ×2, extensions de post-processing (EffectComposer, RenderPass, BloomPass, ShaderPass, MaskPass), ShaderExtras, Detector, Stats, DAT.GUI, Leap.js, plus `Editor.html` et `Editor_files/` (éditeur Three.js vendoré, sans lien apparent avec le jeu). |
| `replays/` | 612 Ko | `replays/cityscape-casual/bkcore.replay.json`, donnée de replay statique référencée nulle part dans le code. |
| `bkcore/` | 168 Ko | Moteur de jeu. |
| `bkcore.coffee/` | 96 Ko | Utilitaires CoffeeScript. |
| `test/` | 48 Ko | Six fichiers `node:test` couvrant les modules purs (`timer`, `image-data`, `utils`, `touch-controller`, `orientation-controller`, `gamepad-controller`), lancés par `npm test`. |
| `tools/` | 8 Ko | `verify-branding.js` : contrôles de sources de l'habillage ACME (`npm run verify:branding`, voir §3.5). |

### 3.4 Structure de l'UI dans `index.html`

`index.html` porte tout le DOM applicatif :

- `#step-1` — écran-titre : `#global` (fond sombre), `#title` (bande portant la surface claire et le logo ACME), `#welcome` (message d'accueil, id neuf), `#menucontainer > #menu` avec les items de réglages francisés (voir §3.5).
- `#step-2` — écran d'aide « Click/Touch to continue », fond `css/help-<n>.png`.
- `#step-3` — `#progressbar`.
- `#step-4` — `#overlay` et `#main` (conteneur du canvas WebGL).
- `#step-5` — écran de fin : `#time` et `#ctrl-help`.
- `#credits` — overlay de crédits, basculé par `#s-credits`.
- `#leapinfo` — zone d'information Leap Motion.

Le positionnement est entièrement absolu. Les deux animations d'origine (`anim` sur `#title`, `animbg` sur `#global`) et leurs `@keyframes` ont été retirées par le rebranding : `css/multi.css` ne contient plus aucun `@keyframes`. Il contient en revanche un bloc `@media (max-width: 760px), (orientation: portrait)` (`css/multi.css:299`), son **seul** bloc adaptatif.

### 3.5 Habillage visuel de `#step-1` (identité ACME)

Le rebranding événementiel (ticket `formation/tickets/company-event.md`) couvre **`#step-1` et le `<head>` uniquement** : `#step-2` à `#step-5`, `#credits` et `#leapinfo` sont inchangés — l'overlay de crédits affiche toujours l'identité d'origine et l'écran d'aide est toujours en anglais.

- **Un point de configuration par technologie.** Le branding visuel vit dans le bloc `:root` en tête de `css/multi.css` (`css/multi.css:6-23`) : les six couleurs de la palette (`--acme-bg`, `--acme-violet`, `--acme-blue`, `--acme-cyan`, `--acme-white`, `--acme-gray`), le dégradé événementiel (`--acme-gradient`) et la géométrie du logo (`--acme-logo`, `--acme-logo-max-height`, `--acme-logo-radius`, `--acme-logo-padding`) ; le reste de `#step-1` les consomme par `var(--acme-*)`. Les textes de marque sont des littéraux dans `index.html` (`#welcome`, `#start`) et les libellés du menu viennent de l'objet `labels` de `launch.js`. Trois jetons n'ont aucun consommateur (`--acme-blue`, `--acme-cyan`, `--acme-gradient`) et `--acme-logo` ne peut pas alimenter le `<img>` d'`index.html:47` : ne pas les supprimer pour autant — la palette complète est la donnée de référence de la charte, et `verify-branding` exige la présence des six valeurs dans `css/multi.css`.
- **Le logo est une `<img>`, pas une `background-image`** (`index.html:46-48`). `#title` est une bande de hauteur fixe portant un bloc blanc arrondi (`.logo-card`), et les deux dimensions de l'image restent `auto` : seules leurs bornes sont contraintes (`css/multi.css:98-104`), si bien que le rapport d'aspect d'origine (3:1 — le fichier fait 2172×724) est préservé par construction, y compris en fenêtre étroite. `css/logo-acme.png` est une copie **bit à bit** de `formation/identite/logo.png`, non retouchée : ni recoloration, ni ombre, ni contour.
- **La surface blanche est nécessaire au contraste.** Le lettrage du fichier fourni est en bleu nuit très sombre (`#0A182C`) : 17,8:1 sur blanc, contre 1,12:1 sur `#08090D`. La carte blanche à coins arrondis (`.logo-card`, `css/multi.css:84-92`) est ce qui rend le logo lisible ; son rembourrage (`--acme-logo-padding`) fournit la zone de respiration. La retirer casserait la lisibilité.
- **Fond sombre et formes décoratives.** `#global` est un aplat `var(--acme-bg)` (`#08090D`) surmonté de trois `radial-gradient` décoratifs (`css/multi.css:50-53`), volontairement dans des teintes quasi noires (luminance ≤ 0,012, contre 0,216 pour un gris moyen) : ils ne créent ni zone claire ni gris moyen dominant. L'écran d'accueil n'emploie aucune ombre ni contour.
- **Assets déréférencés, non supprimés.** `css/bg.jpg` (photographie de fond) et `css/title.png` (titre HexGL d'origine) ne sont plus référencés par le CSS mais restent sur disque : c'est ce qui rend un retour arrière possible sans chasse aux assets.
- **En-tête de page.** `lang="fr"` (`index.html:2`), titre, description, `og:title` et `og:site_name` alignés sur l'événement, favicon local (`favicon.png`, `index.html:10-11`) ; `og:url`, `og:image` et `fb:admins` ont été retirés, et plus aucune mention de l'identité d'origine ne subsiste dans le `<head>`. Le bandeau Google Analytics (`UA-26274524-4`) est **inchangé** et reste le seul script tiers chargé.
- **Aucun identifiant lu par le JavaScript n'a changé** (`#step-1`, `#title`, `#menu`, `#start`, `#s-controlType`, `#s-quality`, `#s-hud`, `#s-godmode`, `#s-credits`) : le changement est HTML/CSS, plus des chaînes et une garde d'affichage dans `launch.js`/`launch.coffee` (§2, §4).
- **Vérification automatisée** : `npm run verify:branding` (`tools/verify-branding.js`) contrôle ce qui se lit dans les sources — palette présente, anciennes couleurs absentes, métadonnées du `<head>`, textes imposés, libellés français. Il est délibérément **séparé de `npm test`**, pour qu'un retour arrière de l'habillage ne casse pas la suite de non-régression. Aucun test automatisé ne couvre le rendu.

## 4. Dépendances et zones legacy à risque

- **Deux versions de Three.js committées** : `libs/Three.dev.js` (la version réellement chargée) et `libs/Three.r53.js` (utilisée uniquement par `bkcore.coffee/tests.html`). L'API employée est ancienne et non compatible avec les versions modernes de Three.js (`addSelf`, `subSelf`, `multiplySelf`, `translateX`, `translateZ`, `rotateAxis`).
- **Sources CoffeeScript et `.js` compilé committés en parallèle, sans pipeline de build** : rien ne garantit que le `.js` chargé corresponde au `.coffee` voisin. Les en-têtes « Generated by CoffeeScript » montrent des versions de compilateur différentes selon les fichiers — `ImageData.js` et `Timer.js` en 1.4.0, `GamepadController.js` en 1.6.3, `Utils.js`, `TouchController.js` et `launch.js` en 1.7.1 — preuve que les fichiers ont été recompilés à des moments distincts avec des outils distincts.
- **`cache.appcache` est incohérent avec les chemins réels** : il référence `bkcore/Timer.js`, `bkcore/ImageData.js` et `bkcore/Utils.js`, alors que ces fichiers vivent sous `bkcore.coffee/`. Il ne liste ni `GamepadController.js`, ni `Ladder.js`, ni `Preloader.js`. AppCache est par ailleurs une API retirée des navigateurs modernes.
- **Manifeste Firefox OS pointant vers un fichier absent** : `manifest.webapp` déclare `"launch_path": "/index-mobile.html"`, or `index-mobile.html` n'existe pas dans le dépôt. `package.webapp` référence `package.zip`, qui est présent.
- **Code et assets présents mais non branchés** aucun chemin de code actif ne les référence :
  - `bkcore/hexgl/Ladder.js` et `bkcore/threejs/Preloader.js` — aucun `<script>` de `index.html`.
  - `bkcore.coffee/threejs/Particles.js` — doublon non chargé de `bkcore/threejs/Particles.js`.
  - `replays/cityscape-casual/bkcore.replay.json` — aucune référence.
  - `geometries/tracks/edge/track.js` — géométrie d'une piste « edge » sans fichier de piste dans `bkcore/hexgl/tracks/` (qui ne contient que `Cityscape.js`) et sans dossier `textures/tracks/edge/`.
  - `libs/Editor.html` et `libs/Editor_files/` — éditeur Three.js vendoré.
- **Couplage fort au navigateur** : `HexGL`, `ShipControls`, `Gameplay`, `HUD`, `Audio`, `Cityscape` accèdent directement à `document`, `window`, `THREE`, `localStorage` et `AudioContext`. `RenderManager` dépend de `window.perfNow`. Aucune injection de dépendance : l'analyse statique seule permet d'isoler ce qui est testable.
- **Gestion d'erreurs très limitée** : six `try/catch` seulement dans tout le code applicatif — `HexGL.js:125` (restart), `Gameplay.js:133` (lecture du replay), `Ladder.js:19` (XHR), `Utils.js:183` (XHR), `launch.js:139` et `launch.js:143` (détection WebGL). Le reste du moteur ne protège rien : les accès DOM de `displayScore` par exemple ne sont pas sécurisés.
- **Paramètres d'URL renvoyés sous forme de chaînes** : `Utils.getURLParameter` (`bkcore.coffee/Utils.js`) capture les valeurs via une expression régulière et retourne donc des chaînes. `launch.js` s'en sert directement comme index dans les tableaux de libellés ; le rebranding a ajouté une garde d'**affichage** (`launch.js:93-105`) qui remplace l'ancien `"Controls: undefined"` par un libellé de repli, sans jamais réécrire la valeur transmise au jeu. La valeur reste donc une chaîne, et la comparaison qui l'accepte (`ShipControls.js:143`, `==` non strict) doit le rester : un `===` casserait `?controlType=4`.
- **Analytics et liens externes codés en dur** : compte Google Analytics `UA-26274524-4` dans `index.html`, et liens de partage Twitter/Facebook pointant vers `hexgl.bkcore.com` dans `HexGL.js:268`.
- **Licences hétérogènes** : `README.md` annonce une licence MIT, mais l'en-tête de la plupart des fichiers de `bkcore/` déclare une licence *Creative Commons BY-NC 3.0* (non commerciale) ; `audio/LICENSE` est une licence distincte. `bkcore/threejs/RenderManager.js` porte explicitement `@license MIT`.
- **Outillage de projet minimal** : pas de linter, pas de bundler, pas de CI ; un `package.json` sans dépendance n'expose que `npm test` (`node --test`) et `npm run verify:branding` (§1), et les tests ne couvrent ni le HTML, ni le CSS, ni `launch.js`. Toute modification d'un `.coffee` exige un compilateur CoffeeScript externe, non fourni dans le dépôt — les deux fichiers doivent être synchronisés à la main.
- **Branding en variables CSS personnalisées** (`css/multi.css`, bloc `:root`, voir §3.5) : les *custom properties* ne sont pas supportées par IE ≤ 11. L'hypothèse d'un navigateur moderne est assumée, sans polyfill.
- **Le rebranding a été reporté à la main dans `launch.js` et `launch.coffee`** (objet `labels`, garde d'affichage, message de repli WebGL) : aucun compilateur CoffeeScript n'a été utilisé, et rien ne vérifie automatiquement que les deux fichiers restent cohérents. `charset="utf-8"` a en outre été ajouté sur la balise `<script src="launch.js">` (`index.html:130`) pour fixer l'encodage des libellés accentués.

## 5. Fonctions et modules testables avec Node, sans navigateur

Le motif d'export CommonJS (`exports.bkcore || (exports.bkcore = {})`) permet de `require()` plusieurs modules de `bkcore.coffee/` directement sous Node. Six d'entre eux sont effectivement couverts par des tests dans `test/`, lancés par `npm test` (`node --test`) : `timer`, `image-data`, `utils`, `touch-controller`, `orientation-controller`, `gamepad-controller`. Aucun test ne couvre le HTML, le CSS, `launch.js` ni le moteur (`bkcore/hexgl/*`).

**Testables sans navigateur :**

- **`bkcore.Timer`** (`bkcore.coffee/Timer.js`) — entièrement pur, à l'exception de `start()` et `update()` qui appellent `new Date().getTime()`. Les fonctions statiques `Timer.msToTime(t)`, `Timer.msToTimeString(t)` et `Timer.zfill(num, size)` sont des fonctions pures.
- **`bkcore.ImageData`** (`bkcore.coffee/ImageData.js`) — le constructeur dépend de `Image` et de `document.createElement('canvas')`, mais `getPixel`, `getPixelBilinear`, `getPixelF` et `getPixelFBilinear` opèrent uniquement sur `this.pixels.data` (tableau plat RGBA). Elles sont exerçables en construisant un objet factice `{pixels: {width, height, data}}`, sans passer par le constructeur.
- **`bkcore.Utils`** (`bkcore.coffee/Utils.js`) — `isTouchDevice()` est la seule méthode quasi pure : elle lit `window` et `navigator`, tous deux redéfinissables sous Node. À l'inverse, `createNormalMaterial` (dépend de `THREE`), `getURLParameter` et `getOffsetTop` (dépendent de `window.location` / du DOM), `request` (XHR) et `updateClass` / `scrollTo` (DOM) ne sont pas testables sans mock.
- **Getters de `ShipControls`** (`bkcore/hexgl/ShipControls.js:759-806`) — `getRealSpeed`, `getRealSpeedRatio`, `getSpeedRatio`, `getBoostRatio`, `getShieldRatio`, `getShield`, `getPosition` et `getQuaternion` sont de simples calculs arithmétiques sur des champs numériques (`speed`, `boost`, `maxSpeed`, `shield`, `maxShield`). Le prototype peut être exercé sans navigateur, mais le constructeur complet réclame `THREE.Vector3`, `THREE.Quaternion` et `THREE.Object3D`.
- **`bkcore.hexgl.RaceData`** (`bkcore/hexgl/RaceData.js`) — `tick`, `export`, `import` et `reset` manipulent des tableaux et du JSON. `applyInterpolated` appelle `this.shipControls.teleport(...)`, donc il est exerçable en injectant un `shipControls` factice. Les champs internes dépendent de `THREE.Vector3` et `THREE.Quaternion`.
- **`HUD.updateTime`** (`bkcore/hexgl/HUD.js:112`) — simple concaténation de chaînes à partir d'un objet `{m, s, ms}` déjà calculé par `Timer` et du tableau `timeSeparators` (`HUD.js:70`). La logique de formatage est isolable ; le reste de `HUD` ne l'est pas (canvas 2D).

**Non testables sans navigateur ou mock lourd :**

- `bkcore.hexgl.HexGL` — construit un `THREE.WebGLRenderer` et un `AudioContext` dès le constructeur (`HexGL.js:79`).
- `bkcore.hexgl.Gameplay` — dépend du HUD, du timer et des analyseurs d'image.
- `bkcore.hexgl.HUD` — canvas 2D et `requestAnimationFrame`.
- `bkcore.Audio` — Web Audio API ou balise `<audio>`.
- `bkcore.threejs.RenderManager` — dépend de `window.perfNow` et d'un renderer Three.js.
- `bkcore.threejs.Loader` — XHR, chargements d'images et `THREE.JSONLoader`.
- `bkcore.threejs.Shaders` / `Particles` / `Preloader` — dépendent de `THREE`.
- Les trois contrôleurs (`TouchController`, `OrientationController`, `GamepadController`) — dépendent de `window`, `navigator` et d'événements DOM.
- `bkcore.hexgl.tracks.Cityscape` — assemble tous les autres modules.

## 6. Bugs, dettes et anomalies remarquables

1. **`HexGL.js:228` — `JSON.Stringify` n'existe pas.** La ligne `localStorage['race-'+t+'-replay'] = JSON.Stringify(this.gameplay.raceData.export());` utilise une casse incorrecte ; la méthode standard est `JSON.stringify`. Elle lève une `TypeError` non interceptée. Cette ligne se situe dans le bloc « nouveau record local » de `displayScore`, lui-même inatteignable par le flux de `launch.js` (voir point 15) — elle ne se déclenche donc pas dans le jeu fourni, mais rend l'export de replay inopérant si ce bloc était atteint. À noter que la relecture correspondante existe bien : `Gameplay.js:134` fait `JSON.parse(localStorage['race-'+this.track.name+'-replay'])` pour le mode `replay`.
2. **`ShipControls.js:158-170` — accolades manquantes dans le callback du `GamepadController`.** Le `else` ne porte que sur la première instruction :
   ```js
   if (controller.select)
     ctx.restart();
   else
     self.key.forward = controller.acceleration > 0;
     self.key.ltrigger = controller.ltrigger > 0;   // s'exécute toujours
     self.key.rtrigger = controller.rtrigger > 0;   // s'exécute toujours
     self.key.left = controller.lstickx < -0.1;     // s'exécute toujours
     self.key.right = controller.lstickx > 0.1;     // s'exécute toujours
   ```
   Seul `self.key.forward` est réellement conditionné par le `else` ; les quatre lignes suivantes s'exécutent à chaque frame, y compris pendant un `restart()` déclenché par `controller.select`.
3. **`Gameplay.js:101` — `self.end(self.result.REPLAY)` au lieu de `self.results.REPLAY`.** `self.result` est la valeur courante du résultat (`this.results.NONE`, soit `-1`, à l'initialisation — `Gameplay.js:44`), et non l'énumération. L'expression vaut donc `undefined`, valeur qui ne correspond à aucune branche de `Gameplay.end()` (qui teste `results.FINISH` et `results.DESTROYED`) : l'écran de fin du mode replay ne s'affiche jamais. Les deux autres appels de `Gameplay.js` (`:72` et `:91`) utilisent bien `self.results.*`.
4. **`RaceData.js:30-51` — le sous-échantillonnage de `tick()` n'a aucun effet.** `rateState` est initialisé à `1` (`:22`) et n'est jamais remis à `1` : la branche `if(this.rateState == 1)` est donc vraie à chaque appel et enregistre une donnée à **chaque** tick. La branche `else if(this.rateState == this.rate)` (qui affecte `rateState = 0`) n'est jamais atteinte, et `this.rate++` en fin de méthode croît sans borne sans jamais servir. Le `rate = 2` (« 1 / rate ») déclaré à l'initialisation reste sans effet.
5. **`Ladder.js` — incohérence de namespace.** Le fichier déclare `bkcore.hexgl.Ladder` (`:11-12`) mais `load()` écrit dans `bkcore.Ladder.global` (`:20`), et `displayLadder()` lit `bkcore.Ladder.global` (`:36` et `:42`), sans le segment `.hexgl`. Combiné au fait que le fichier n'est jamais chargé, le classement en ligne est inopérant.
6. **`Ladder.js:36` — erreur de précédence d'opérateurs.** La condition `!bkcore.Ladder.global[track][mode] == undefined` applique le `!` avant la comparaison : elle évalue `(!x) == undefined`, soit toujours `false`. Ce n'est pas le test « si non défini » qui était vraisemblablement visé.
7. **`HexGL.js:236` et `HexGL.js:273` — référence à un objet jamais défini.** `bkcore.hexgl.Ladder.global[t][d]` et `bkcore.hexgl.Ladder.displayLadder(...)` supposent `Ladder.js` chargé. Comme aucun `<script>` de `index.html` ne le charge, `bkcore.hexgl.Ladder` est `undefined` et l'accès `.global` lèverait une `TypeError`. Ce code se trouve toutefois après le `return` de la branche `gameover !== null` (point 15), donc inatteignable par le flux fourni.
8. **`CameraChase.js:30` — faute de frappe sur la clé d'option.** `this.yoffset = opts.yoffest == undefined ? 8.0 : opts.yoffest;` lit `yoffest` au lieu de `yoffset`, alors que l'appelant `Cityscape.js:473` passe bien `yoffset: 8.0`. La valeur passée est donc silencieusement ignorée au profit du défaut — qui vaut ici la même valeur (`8.0`), ce qui masque le défaut. Le mécanisme de configuration reste cassé.
9. **`ShipControls.js:298` — faute de frappe sur une propriété Three.js.** `this.mesh.martixAutoUpdate = false;` écrit `martixAutoUpdate` au lieu de `matrixAutoUpdate` : la propriété réelle du `Mesh` n'est jamais désactivée et la ligne n'a aucun effet.
10. **`Utils.coffee:184` — propriété `navigator` mal capitalisée.** `isTouchDevice()` teste `navigator.MaxTouchPoints`, alors que la propriété standard est `navigator.maxTouchPoints` (minuscule). Cette branche est donc morte. La détection de secours `navigator.msMaxTouchPoints` (`:185`, préfixe IE/Edge) et `'ontouchstart' of window` restent, elles, fonctionnelles.
11. **`Utils.coffee:144` — borne de boucle inclusive erronée.** `for i in [0..XMLHttpFactories.length]` génère un indice de trop (le range CoffeeScript est inclusif) : `XMLHttpFactories[length]` vaut `undefined` et son appel lève une exception, interceptée par le `try/catch` de `request()`. Sans conséquence fonctionnelle, mais l'itération finale est toujours perdue en exception.
12. **`Gameplay.js` — le mode `survival` est déclaré mais jamais implémenté.** `this.modes` initialise `'timeattack': null` et `'survival': null` (`:20-21`), puis seuls `timeattack` (`:56`) et `replay` (`:95`) reçoivent une fonction. `Gameplay.js:211` appelant `this.modes[this.mode].call(this)`, un mode `survival` lèverait une `TypeError` (`null` n'est pas appelable). La chaîne de valeur est la suivante : `HexGL.js:32` fait `this.mode = opts.mode == undefined ? 'timeattack' : opts.mode`, `HexGL.js:161` transmet `mode: this.mode` à `Gameplay`, et `Gameplay.js:25` ne rejette que les clés absentes de `this.modes` — or `'survival'` **est** une clé (de valeur `null`), donc elle passerait la validation. `launch.js` / `launch.coffee` ne passent aucun `mode` : le mode vaut donc toujours `'timeattack'` par le chemin d'entrée fourni, et `survival` n'est atteignable qu'en construisant `HexGL` directement avec `mode: 'survival'`.
13. **Le résultat `WRONGWAY` n'est jamais produit.** `results.WRONGWAY = 3` est déclaré (`Gameplay.js:40`) mais aucune occurrence n'existe ailleurs dans le code : aucune détection de sens de course inversé n'est implémentée, et `Gameplay.end()` ne traite pas cette valeur.
14. **`OrientationController` n'est pas atteignable depuis le menu.** Le tableau de `launch.js` ne propose que quatre valeurs de `controlType` (indices 0 à 3 : clavier, tactile, Leap Motion, manette), alors que `ShipControls.js:143` gère le cas `controlType == 4` (gyroscope) : ce contrôleur n'est accessible que par paramètre d'URL. Depuis le rebranding, une valeur hors liste reçoit un libellé de repli (`labels.controlType.extra`, `launch.js:24-27` — « Contrôles : Gyroscope » pour `?controlType=4`) au lieu de l'ancien `"Controls: undefined"` ; `css/help-4.png` n'existant pas, l'écran d'aide reste sans image pour cette valeur (antérieur au rebranding).
15. **`HexGL.displayScore()` — une grande partie de la fonction est inatteignable, et le code mort n'est pas sûr.** `launch.js` passant toujours `gameover: $('step-5')`, la garde `if(this.gameover !== null)` (`HexGL.js:192`) est vraie et la fonction `return` après avoir affiché l'écran de fin. Les lignes 201 à 279 ne s'exécutent jamais ; elles accèdent pourtant à treize éléments DOM (`finish`, `finish-state`, `finish-hallmsg`, `finish-msg`, `finish-result`, `finish-lap1/2/3`, `finish-diff`, `finish-twitter`, `finish-fb`, `lowfps-msg`, `finish-ladder`) dont **aucun n'existe dans `index.html`**. La plupart des écritures sont gardées par des tests `!= undefined`, mais `dc.style.display = 'block';` (`HexGL.js:280`) ne l'est pas — `dc` vient de `getElementById("finish")`, inexistant. Ce code ne produit pas d'erreur uniquement parce que la garde sur `gameover` le rend inatteignable.
16. **`#finish` — un élément absent du DOM, accédé à deux endroits.** `restart()` (`HexGL.js:125`) fait `this.document.getElementById('finish').style.display = 'none'` en l'encadrant d'un `try/catch`, ce qui indique que l'absence de l'élément est connue de l'auteur. `displayScore()` (`HexGL.js:201`) effectue le même accès **sans aucune protection**. `#finish` n'existe dans aucun `<div>` de `index.html`.
17. **Incohérence de licence.** `README.md` annonce une licence MIT pour l'ensemble du projet, tandis que l'en-tête de la majorité des fichiers de `bkcore/` déclare *Creative Commons BY-NC 3.0* (usage non commercial), et `audio/LICENSE` est une licence distincte. L'ambiguïté porte sur la licence réellement applicable.
18. **Configuration mobile obsolète et cassée.** `manifest.webapp` pointe vers `index-mobile.html`, absent du dépôt, et `cache.appcache` référence des chemins de modules erronés (voir §4). `package.zip` (3,1 Mo) est présent mais correspond à un état figé du jeu.
19. **`#welcome` et le menu se chevauchent en fenêtre courte.** `#welcome` est positionné depuis le haut (`top: 42%`, `css/multi.css:111-118`) et `#menucontainer` depuis le bas (`bottom: 10%`, `css/multi.css:138-145`), et le seul bloc `@media` ne se déclenche qu'à `max-width: 760px` ou en portrait : aucune règle ne tient compte de la **hauteur** de la fenêtre. En paysage peu haut, les deux se recouvrent et `#menucontainer` (`z-index: 2`) passe devant `#welcome` (`z-index: 1`), qui devient partiellement illisible. Constaté au navigateur : plus aucune marge dès que la hauteur descend sous ~750 px (en 900×700 le haut du menu est ~18 px au-dessus du bas du message, ~66 px en 1000×600, ~140 px en 800×450) ; en 1280×800 la marge tombe à ~30 px. Les deux cas prévus par la spécification sont hors de cause : en 760×500 et en 500×800 (portrait) le bloc `@media` s'applique et l'écart reste positif (36 px et 164 px). L'ordre de grandeur dépend de la police effectivement rendue.
