# Architecture de HexGL (état actuel)

> Document d'exploration généré à partir du code présent dans le dépôt.
> Il décrit uniquement ce qui existe aujourd'hui — aucune recommandation, aucun refactor.

## 1. Stack et points d'entrée

- **Nature du projet** : jeu de course futuriste en HTML5/WebGL, propulsé par **Three.js** (bundlé en `libs/`, pas de gestionnaire de paquets). Aucun bundler ni framework. Un `package.json` minimal expose `npm test` (`node --test`) pour les tests de non-régression sur les modules purs (voir §5) ; toujours aucun outil de build.
- **Langages** :
  - JavaScript ES5 « classique » (namespacing manuel via l'objet global `bkcore`) pour la majorité du moteur de jeu (`bkcore/`).
  - **CoffeeScript** pour une partie plus ancienne/utilitaire (`bkcore.coffee/`), avec son `.js` compilé committé à côté du `.coffee` source (pas de pipeline de build — les deux fichiers sont statiques et doivent être synchronisés à la main).
  - HTML/CSS classiques pour l'UI (menus, HUD overlay DOM, écrans de fin).
- **Rendu** : WebGL via Three.js (version vendoree `libs/Three.dev.js`, chargée par `index.html`; une seconde version `libs/Three.r53.js` est présente mais n'est utilisée que par `bkcore.coffee/tests.html`).
- **Audio** : Web Audio API avec repli sur balise `<audio>` (`bkcore/Audio.js`).
- **Contrôles** : clavier, tactile, gyroscope (`OrientationController`), manette (`GamepadController`), et Leap Motion (librairie `libs/leap-0.4.1.min.js`).
- **Point d'entrée HTML** : `index.html` — charge séquentiellement toutes les libs puis tous les modules `bkcore.*` dans un ordre de dépendance manuel (aucun système de modules), et enfin `launch.js`.
- **Point d'entrée logique** : `launch.coffee` (compilé en `launch.js`, chargé en dernier) — gère l'écran-titre (menu de réglages), instancie `bkcore.hexgl.HexGL` et démarre le chargement des assets.
- **Métadonnées d'empaquetage legacy** : `manifest.webapp` / `package.webapp` / `package.zip` / `cache.appcache` — vestiges d'un packaging Firefox OS / AppCache (voir §4, zones à risque).

## 2. Flux principal de lancement

1. `index.html` affiche `#step-1` (menu : Start / type de contrôle / qualité / HUD / godmode / crédits), sous habillage visuel ACME depuis le rebranding événementiel (logo, palette, message d'accueil ; voir §3.3) — la logique du menu et les ids lus par `launch.js` sont inchangés.
2. `launch.coffee` (`launch.js`) lit les paramètres d'URL (`bkcore.Utils.getURLParameter`) pour pré-remplir les réglages, et attache les handlers de clic du menu.
3. Clic sur **Start** → vérifie le support WebGL (`hasWebGL()`, test manuel de contexte `webgl`/`experimental-webgl`) → affiche `#step-2` (écran d'aide selon le type de contrôle).
4. Clic sur `#step-2` → affiche `#step-3` (barre de progression) → appelle `init(controlType, quality, hud, godmode)`.
5. `init()` :
   - instancie `new bkcore.hexgl.HexGL({...})` avec la piste fixée en dur à `'Cityscape'` et `difficulty: 0` ;
   - appelle `hexGL.load({onLoad, onError, onProgress})`, qui délègue à `track.load()` → `bkcore.threejs.Loader` télécharge textures/géométries/cubemaps/analyseurs (images de collision/hauteur)/sons, en choisissant le jeu de textures `textures/` (basse qualité) ou `textures.full/` (haute qualité) selon le réglage.
   - `onProgress` met à jour la largeur de la barre de progression.
   - `onLoad` : appelle `hexGL.init()` (construit HUD, matériaux, scènes via `track.buildMaterials`/`track.buildScenes`, puis le compositeur de post-processing), bascule vers `#step-4` (canvas de jeu) et appelle `hexGL.start()`.
6. `HexGL.start()` : active le rendu (`manager.setCurrent("game")`), démarre la boucle `requestAnimationFrame` (`raf()` appelant `this.update()`), puis `initGameplay()` qui crée le `Gameplay` (mode `timeattack` par défaut), démarre la musique de fond et le vent.
7. Chaque frame, `HexGL.update()` appelle `gameplay.update()` (compte à rebours, avancement de course, détection de tour/checkpoint via lecture de pixel sur l'image de collision) puis `manager.renderCurrent()` qui exécute la fonction de rendu enregistrée par `Cityscape.buildScenes` (met à jour `ShipControls`, `ShipEffects`, `CameraChase`, rend via `EffectComposer`, met à jour le HUD).
8. Fin de course (arrivée après 3 tours ou destruction du vaisseau) → `Gameplay.end()` → après un délai, `HexGL.displayScore()` affiche l'écran de résultat, gère le record local (`localStorage`) et les liens de partage Twitter/Facebook.
9. Touche **Echap** → `HexGL.reset()` relance la course (sans recharger les assets).

## 3. Principaux modules, fichiers et assets

### 3.1 Moteur de jeu — `bkcore/`
| Fichier | Rôle |
|---|---|
| `bkcore/hexgl/HexGL.js` | Orchestrateur principal : init du renderer WebGL, boucle de jeu, gestion des réglages qualité/difficulté (`tweakShipControls`), écran de score. |
| `bkcore/hexgl/Gameplay.js` | Machine à états de la course (compte à rebours, tours, checkpoints, modes `timeattack`/`survival`(non implémenté)/`replay`). |
| `bkcore/hexgl/ShipControls.js` (806 lignes) | Cœur physique : lecture des entrées (clavier/tactile/gyro/manette/Leap), intégration mouvement, détection de collision/hauteur par lecture de pixels sur des textures dédiées, gestion bouclier/boost/destruction. Le fichier le plus volumineux et le plus critique. |
| `bkcore/hexgl/ShipEffects.js` | Effets visuels du vaisseau (booster, particules d'étincelles/nuages lors des collisions). |
| `bkcore/hexgl/CameraChase.js` | Caméra suiveuse (mode chase) ou orbitale (mode replay). |
| `bkcore/hexgl/HUD.js` | HUD dessiné sur un `<canvas>` 2D superposé (vitesse, bouclier, temps, tours, messages). |
| `bkcore/hexgl/RaceData.js` | Enregistrement/rejeu de la trajectoire (position+quaternion horodatés) pour le mode replay et l'export `localStorage`. |
| `bkcore/hexgl/Ladder.js` | Classement en ligne (chargement JSON distant, affichage top scores) — **non chargé par `index.html`, donc mort en l'état**. |
| `bkcore/hexgl/tracks/Cityscape.js` | Seule piste implémentée : déclare les assets à charger (2 profils de qualité), construit les matériaux (shaders normal-mapping fait-maison en haute qualité) et les scènes (skybox, décor, spawn du vaisseau, enregistrement de la fonction de rendu par frame). |
| `bkcore/threejs/RenderManager.js` | Registre de plusieurs couples scène/caméra/fonction de rendu ("render setups"), bascule entre eux (`sky`, `game`). |
| `bkcore/threejs/Loader.js` | Chargeur générique multi-ressources (textures, cubemaps, géométries JSON, images, sons, "analysers") avec callbacks de progression. |
| `bkcore/threejs/Particles.js` | Système de particules maison (sprites). |
| `bkcore/threejs/Shaders.js` (949 lignes) | Bibliothèque de shaders GLSL custom (dont `hexvignette`, `normal`/`normalV`). |
| `bkcore/threejs/Preloader.js` | Scène 3D de préchargement — **non référencée dans `index.html`, donc mort en l'état**. |
| `bkcore/Audio.js` | Wrapper Web Audio API (Gain/Panner nodes) avec repli `<audio>` pour les navigateurs sans `AudioContext`. |

### 3.2 Legacy CoffeeScript — `bkcore.coffee/`
Contient les utilitaires transverses, **chacun avec son `.coffee` source et son `.js` déjà compilé committé côte à côte** :
- `Utils.coffee/js` : helpers génériques (matériaux normal-map, paramètres d'URL, requêtes XHR maison avec repli `ActiveXObject`, détection tactile, manipulation de classes CSS).
- `Timer.coffee/js` : chronomètre de course, formatage `ms → h/m/s/ms`.
- `ImageData.coffee/js` : chargement d'image et lecture de pixels (avec interpolation bilinéaire) — utilisé comme "analyseur" pour les cartes de collision/hauteur/checkpoints.
- `controllers/` : `TouchController`, `OrientationController`, `GamepadController` — un fichier par périphérique d'entrée, chacun avec test de compatibilité statique (`isCompatible()`).
- `threejs/Particles.coffee` + son `.js` — **doublon** : un système de particules distinct de `bkcore/threejs/Particles.js` (voir §4).
- `tests.html` : ne contient aucune assertion, seulement un chargement manuel de scripts dans un navigateur pour test visuel.

Tous ces modules coffee exportent via le pattern `exports = exports ? @ ; exports.bkcore ||= {}`, ce qui les rend **chargeables tels quels sous Node** (`require()`), en plus du navigateur.

### 3.3 Assets
- `geometries/` (~1,3 Mo) : modèles JSON Three.js (vaisseau `feisar`, piste `cityscape`, bonus, booster).
- `textures/` (~4,2 Mo) et `textures.full/` (~5,3 Mo) : deux jeux de textures (basse/haute résolution), sélectionnés par `Cityscape.load()` selon la qualité choisie. Le `README.md` mentionne qu'on peut les permuter manuellement pour changer la qualité par défaut.
- `audio/` (~2,1 Mo) : effets sonores et musique (`.ogg`), licence dédiée dans `audio/LICENSE`.
- `css/` : polices web (`BebasNeue`), sprites d'aide tactile, styles (`multi.css`, `touchcontroller.css`).
- `replays/cityscape-casual` : donnée de replay statique (référencée nulle part dans le code lu — à confirmer si consommée ailleurs).
- `libs/` : dépendances vendorisées (Three.js x2 versions, DAT.GUI, Leap.js, Stats.js, extensions de post-processing Three.js), y compris `libs/Editor.html` et `libs/Editor_files/` (éditeur Three.js vendoré, sans lien apparent avec le jeu lui-même).

### 3.4 Habillage visuel de `#step-1` (branding ACME)
- Point de configuration unique en tête de `css/multi.css` : un bloc `:root { --acme-* }` (`--acme-bg`, `--acme-violet`, `--acme-blue`, `--acme-cyan`, `--acme-white`, `--acme-gray-light`, `--acme-gradient-cta`, `--acme-logo-url`). Toute évolution de la palette ou du logo se fait exclusivement via ces variables ; le reste de `#step-1` les consomme par `var(--acme-*)`.
- `css/logo-acme.png` est l'asset de logo actif (posé sur une carte claire pour le contraste sur fond sombre). `css/bg.jpg` et `css/title.png` restent présents sur disque mais ne sont plus référencés par le CSS (déréférencés, pas supprimés — réversibilité).
- Le message d'accueil (`#welcome`, id neuf) est un littéral HTML dans `index.html`, volontairement non couvert par les variables `--acme-*`.
- Seul bloc `@media` de tout `css/multi.css` (petits écrans/portrait), ciblant `#title`, `#welcome`, `#menucontainer`/`#menu`.
- Aucun id lu par `launch.coffee`/`launch.js` n'a été modifié par ce changement (`#step-1`, `start`, `s-controlType`, `s-quality`, `s-hud`, `s-godmode`, `s-credits`) : changement strictement HTML/CSS.

## 4. Dépendances et zones legacy à risque

- **Deux versions de Three.js committées** (`Three.dev.js` utilisé, `Three.r53.js` inutilisé sauf par `tests.html`) : source de confusion sur la version réellement active ; API Three.js très ancienne (`translateX`/`translateZ`, `rotateAxis`, `addSelf`/`subSelf`/`multiplySelf` — méthodes mutantes dépréciées depuis longtemps dans Three.js moderne).
- **Sources CoffeeScript + JS compilé committés en parallèle, sans pipeline de build** : rien ne garantit que le `.js` chargé par `index.html` correspond au `.coffee` à côté (observé : en-têtes `// Generated by CoffeeScript` avec des numéros de version différents selon les fichiers — 1.4.0 pour `Timer.js`, 1.6.3 pour `GamepadController.js`, 1.7.1 pour `TouchController.js` —, preuve que les fichiers ont été recompilés à des moments différents avec des compilateurs différents).
- **Manifeste `cache.appcache` cassé** : référence `bkcore/Timer.js`, `bkcore/ImageData.js`, `bkcore/Utils.js` alors que ces fichiers vivent réellement sous `bkcore.coffee/` ; référence aussi `index-mobile.html` (comme `manifest.webapp`), fichier absent du dépôt. AppCache est de toute façon une API web obsolète/retirée des navigateurs modernes.
- **Modules chargés mais jamais utilisés dans le flux réel** : `bkcore/hexgl/Ladder.js` (classement en ligne) et `bkcore/threejs/Preloader.js` ne sont référencés par aucun `<script>` de `index.html` — code mort maintenu sans être exécuté.
- **Doublon de système de particules** : `bkcore/threejs/Particles.js` (chargé par `index.html`) et `bkcore.coffee/threejs/Particles.coffee`/`.js` (non chargé) coexistent avec un contenu différent — ambiguïté sur laquelle est la version de référence.
- **Fichier `bkcore.coffee/ImageData.coffee` vs `bkcore.coffee/Timer.coffee`** : ces deux fichiers sont en réalité chargés par leur `.js` compilé sous le chemin `bkcore.coffee/*.js` dans `index.html` (`bkcore.coffee/Timer.js`, `bkcore.coffee/ImageData.js`, `bkcore.coffee/Utils.js`), ce qui diffère du chemin `bkcore/*.js` supposé par `cache.appcache` (cf. point ci-dessus).
- **Couplage fort au DOM/navigateur** : la quasi-totalité du moteur (`HexGL`, `ShipControls`, `Gameplay`, `HUD`, `Audio`) dépend directement de `document`, `window`, `THREE.*`, `localStorage`, `AudioContext`, rendant le test unitaire impossible sans mocks lourds.
- **Gestion d'erreurs quasi absente** : peu de `try/catch` (présents seulement autour du JSON de replay et du chargement de la ladder) ; la plupart des accès DOM (`document.getElementById(...)`) dans `HexGL.displayScore` supposent l'existence d'éléments qui ne sont pas dans `index.html` fourni (`finish`, `finish-state`, `finish-lap1`, etc. — absents du DOM actuel), ce qui provoquerait des erreurs silencieuses (`!= undefined` guards) ou une exception sur `dc.style.display` (`dc` = `getElementById("finish")`, non gardé par un test d'existence).
- **Outillage de projet minimal** : pas de linter ni de bundler ; un `package.json`/`npm test` (`node --test`) couvre uniquement quelques modules purs (§5), sans test DOM/CSS. Toute modification du CoffeeScript nécessite un compilateur externe non fourni dans le dépôt.
- **CSS Custom Properties utilisées pour le branding** (`css/multi.css`, bloc `:root`, voir §3.4) : non supporté sur IE ≤ 11, hypothèse d'un navigateur moderne assumée sans polyfill.
- **Assets orphelins** : `css/bg.jpg` et `css/title.png` ne sont plus référencés par le CSS depuis le rebranding ACME de l'écran d'accueil (§3.4), mais restent sur disque.
- **Analytics Google codé en dur** dans `index.html` (compte `UA-26274524-4`) et liens de partage Twitter/Facebook pointant vers `hexgl.bkcore.com` en dur dans `HexGL.js`.
- **Licences hétérogènes** : `LICENSE` racine (MIT selon `README.md`), mais l'en-tête de chaque fichier `bkcore/*` mentionne une licence *Creative Commons BY-NC 3.0*, et `audio/LICENSE` est distincte — incohérence de licence entre le `README.md` et les en-têtes de code.

## 5. Fonctions/modules testables avec Node, sans navigateur

Grâce au pattern d'export CommonJS-compatible (`exports.bkcore ||= {}`), les modules suivants sont chargeables directement sous Node (`require(...)`). Ils sont effectivement couverts par des tests dans `test/` (6 fichiers), exécutés via `npm test` (`node --test`) : `timer`, `image-data`, `utils`, `touch-controller`, `orientation-controller`, `gamepad-controller`. Aucun test ne couvre le DOM/CSS/HTML.

- **`bkcore.Timer`** (`bkcore.coffee/Timer.js`) : entièrement pur à l'exception de `start()`/`update()` qui appellent `new Date().getTime()`. Les fonctions statiques `Timer.msToTime(t)`, `Timer.msToTimeString(t)` et `Timer.zfill(num, size)` sont des fonctions pures testables telles quelles.
- **`bkcore.ImageData`** (`bkcore.coffee/ImageData.js`) : le constructeur dépend de `Image`/`document.createElement('canvas')` (navigateur), mais les méthodes `getPixel`, `getPixelBilinear`, `getPixelF`, `getPixelFBilinear` sont des fonctions pures opérant sur `this.pixels.data` (un tableau plat RGBA) — testables en construisant un faux objet `{pixels: {width, height, data}}` sans passer par le constructeur ni par un navigateur.
- **`bkcore.Utils`** (`bkcore.coffee/Utils.js`) : `Utils.zfill`-like helpers non présents ici, mais noter que la plupart des méthodes (`createNormalMaterial`, `projectOnScreen`, `getURLParameter`, `getOffsetTop`, `scrollTo`, `updateClass`, `request`) dépendent de `THREE`, `window` ou `document` et **ne sont pas testables sans mock**. Seule `Utils.isTouchDevice` est quasi pure (dépend de `window`/`navigator` mockables simplement).
- **`bkcore.hexgl.Timer`/formatters de `HUD`** : la logique de formatage dans `HUD.updateTime` dépend d'objets `{m,s,ms}` déjà calculés par `Timer` — combinable en test pur si on extrait juste la concaténation de chaînes.
- **Calculs physiques isolables dans `ShipControls`** : les méthodes `getRealSpeed`, `getRealSpeedRatio`, `getSpeedRatio`, `getBoostRatio`, `getShieldRatio`, `getShield` sont de simples calculs arithmétiques sur des champs numériques (`speed`, `boost`, `maxSpeed`, `shield`, `maxShield`) — testables en instanciant l'objet et en fixant ces champs directement, sans navigateur ni Three.js réel (le constructeur complet nécessite cependant `THREE.Vector3`/`THREE.Quaternion`/`THREE.Object3D`, donc `THREE` doit être chargé en mémoire, mais sans DOM).
- **`bkcore.hexgl.RaceData`** : `tick`, `export`, `import`, `reset` manipulent des tableaux/JSON simples ; `applyInterpolated` appelle `this.shipControls.teleport(...)`, donc testable en injectant un `shipControls` factice (`{teleport: fn, getPosition, getQuaternion}`). Dépend aussi de `THREE.Vector3`/`THREE.Quaternion` pour les champs internes.
- **Non testables sans navigateur/mock lourd** : `HexGL`, `Gameplay`, `HUD` (canvas 2D), `Audio` (Web Audio/`<audio>`), `RenderManager` (`window.performance`), `Loader` (XHR/Image/THREE loaders), les contrôleurs (`TouchController`, `OrientationController`, `GamepadController` — dépendent tous de `window`/`navigator`/événements DOM), et `Cityscape.js` (assemble tout le reste).

## 6. Bugs, dettes ou anomalies remarquables

1. **`HexGL.js` (`displayScore`)** : `localStorage['race-'+t+'-replay'] = JSON.Stringify(...)` — `JSON.Stringify` n'existe pas (la méthode standard est `JSON.stringify`, casse différente). Cette ligne lève une `TypeError` non interceptée dès qu'un joueur bat son record local, dans le bloc où le nouveau record est censé être sauvegardé.
2. **`ShipControls.js`, callback du `GamepadController`** (lignes ~161-170) : absence d'accolades sur le `if/else` —
   ```js
   if (controller.select) ctx.restart();
   else self.key.forward = controller.acceleration > 0;
       self.key.ltrigger = controller.ltrigger > 0;
       self.key.rtrigger = controller.rtrigger > 0;
       self.key.left = controller.lstickx < -0.1;
       self.key.right = controller.lstickx > 0.1;
   ```
   Seule l'affectation de `self.key.forward` est réellement conditionnée par `else` ; les quatre lignes suivantes s'exécutent à chaque frame quel que soit `controller.select`, y compris pendant un `restart()`.
3. **`Gameplay.js`, mode `replay`** : `self.end(self.result.REPLAY)` — devrait être `self.results.REPLAY` (avec un `s`). `self.result` est la valeur courante du résultat (initialement `-1`/`NONE`), pas l'objet énumération ; `self.result.REPLAY` vaut donc `undefined`, et `end(undefined)` ne correspond à aucune branche de `Gameplay.end`, donc l'écran de fin de replay ne s'affiche jamais correctement (le mode `replay` n'est de toute façon déclenché nulle part dans le flux normal du jeu, `mode` étant fixé à `'timeattack'` dans `launch.coffee`).
4. **`RaceData.tick`** : la logique de sous-échantillonnage (`rate`/`rateState`) est cassée — `rateState` vaut `1` à l'initialisation et n'est jamais réinitialisé à `1` après être passé à `0`, donc la branche `if(this.rateState == 1)` reste vraie indéfiniment dès le premier appel et enregistre une donnée à **chaque** tick, tandis que la branche `else if` (censée réinitialiser l'état tous les `rate` ticks) et l'incrémentation de `rate` deviennent des effets sans but (le `this.rate` croît sans borne, `rateState` ne revient jamais à `1` par ce chemin mais reste bloqué à `1` de toute façon). Le throttling visé (n'enregistrer qu'un tick sur `rate`) n'a donc aucun effet.
5. **`Ladder.js`** : incohérence de namespace — le fichier déclare `bkcore.hexgl.Ladder` mais `load()` écrit dans `bkcore.Ladder.global` (sans `.hexgl`), et `displayLadder()` lit `bkcore.Ladder.global[...]` également sans `.hexgl`. Combiné au fait que ce module n'est pas chargé par `index.html` (§4), le classement en ligne est totalement non fonctionnel en l'état.
6. **`Ladder.displayLadder`** : condition `!bkcore.Ladder.global[track][mode] == undefined` — erreur de précédence d'opérateurs (`!` s'applique avant `==`), rendant le test toujours vrai ou toujours faux selon la valeur, jamais le contrôle attendu (« si non défini »).
7. **`CameraChase.js`** : `this.yoffset = opts.yoffest == undefined ? 8.0 : opts.yoffest;` — faute de frappe (`yoffest` au lieu de `yoffset`) sur la clé lue, alors que l'appelant (`Cityscape.js`) passe bien `yoffset: 8.0`. La valeur personnalisée est donc silencieusement ignorée au profit de la valeur par défaut (qui vaut coïncidemment la même chose ici, mais le mécanisme de configuration est cassé).
8. **`ShipControls.js`, `control()`** : `this.mesh.martixAutoUpdate = false;` — faute de frappe (`martix` au lieu de `matrix`), donc `matrixAutoUpdate` de l'objet Three.js n'est jamais réellement désactivé ; cette ligne n'a aucun effet.
9. **`Utils.coffee`, `isTouchDevice`** : teste `navigator.MaxTouchPoints` (majuscule `M`) — la propriété standard est `navigator.maxTouchPoints` (minuscule). Cette branche de détection est donc morte (toujours `undefined`), et seule `'ontouchstart' of window` reste opérationnelle.
10. **`Utils.coffee`, `request`** : `for i in [0..XMLHttpFactories.length]` (borne supérieure inclusive) itère un indice de trop (`XMLHttpFactories[length]` est `undefined`), provoquant systématiquement une exception interceptée par le `try/catch` interne à la dernière itération — sans conséquence fonctionnelle grâce au `catch`, mais source de bruit/`try` inutile.
11. **Incohérence de licence** : `README.md` annonce une licence MIT globale, mais l'en-tête de la majorité des fichiers sous `bkcore/` déclare *Creative Commons BY-NC 3.0* (non commerciale) — ambiguïté juridique sur la licence réellement applicable au code.
12. **Fichiers de configuration mobile obsolètes/cassés** : `manifest.webapp` et `cache.appcache` pointent vers `index-mobile.html`, absent du dépôt ; `cache.appcache` référence en plus des chemins de fichiers incorrects pour `Timer.js`/`ImageData.js`/`Utils.js` (voir §4).
13. **Assets et code référencés mais non branchés** : `bkcore/hexgl/Ladder.js`, `bkcore/threejs/Preloader.js`, `bkcore.coffee/threejs/Particles.coffee`/`.js` (doublon), et le dossier `replays/cityscape-casual` ne sont exploités par aucun chemin de code actif identifié dans `index.html`/`launch.coffee`.
14. **`Gameplay.modes.timeattack`** : le mode `'survival'` est déclaré dans `this.modes` mais sa valeur reste `null` — s'il était sélectionné (aucun point d'entrée actuel ne le permet), `this.modes[this.mode].call(this)` lèverait une `TypeError` (`null` n'est pas une fonction).
15. **`HexGL.displayScore`** : accède à de nombreux éléments DOM (`finish`, `finish-state`, `finish-lap1`, `finish-twitter`, `lowfps-msg`, etc.) qui ne sont présents dans aucun des `<div>` de `index.html` fourni ; le code est protégé par des tests `!= undefined` pour la plupart des écritures, mais `dc.style.display = 'block';` en fin de fonction est appelé sans garde sur `dc` (`= getElementById("finish")`), ce qui lèverait une exception si `this.gameover` est `null` (cas où `opts.gameover` n'est pas fourni) — dans le flux actuel `opts.gameover` vaut `$('step-5')` donc la branche `if(this.gameover !== null)` court-circuite avant d'atteindre ce code, mais la fonction resterait fragile si appelée avec `gameover: null`.
