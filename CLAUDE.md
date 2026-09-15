# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce qu'est ce dépôt

TP de formation : personnaliser l'écran d'accueil du jeu legacy **HexGL** aux couleurs d'ACME, sans toucher au gameplay.

- La **racine git** est `hex-gl-tp/`, mais l'application vit dans `HexGL/` : c'est là que se font tous les travaux (code, tests, docs).
- `HexGL/formation/` — les **entrées du besoin** : `tickets/company-event.md` (besoin métier), `identite/` (charte graphique PDF + `logo.png`). Ce sont des données, pas du code.
- `etapes/` — les **livrables de référence** du TP, un dossier par chapitre (architecture, tests, spec, design, captures, doc finale, automatisation Git). Ce sont des *exemples de résultat attendu*, pas l'état du dépôt.
  - Attention : `etapes/11-.../docs/architecture.md` et `etapes/7-8-.../design.md` décrivent l'état **après** le rebranding ACME (variables `--acme-*`, `css/logo-acme.png`, `package.json` et `test/` existants). Rien de tout cela n'existe encore dans `HexGL/` — ne pas les confondre avec l'état réel.
  - `etapes/notes.md` contient les prompts du TP, chapitre par chapitre.

Artefacts produits par le TP dans `HexGL/` : `docs/architecture.md` (étape 3), `package.json` + `test/` (étape 4), `work/company-event/{spec,design}.md` (étapes 5 à 8, temporaires — supprimés à l'étape 11).

## Commandes

Aucun build, aucun bundler, aucune installation de dépendances : c'est un site statique.

```bash
cd HexGL && python3 -m http.server 8000    # puis ouvrir http://localhost:8000/
```

Le `README.md` d'HexGL indique `python -m SimpleHTTPServer` — syntaxe Python 2, obsolète. Utiliser `python3 -m http.server`.

Tests (Node ≥ 20 ; `package.json` et `test/` sont créés à l'étape 4 du TP) :

```bash
cd HexGL
npm test                                        # node --test → tous les test/*.test.js
node --test test/timer.test.js                  # un seul fichier
node --test --test-name-pattern="msToTime"      # un seul test
```

**CoffeeScript** : il n'existe aucun pipeline de build. Les sources `.coffee` et leur `.js` compilé committé cohabitent dans `bkcore.coffee/`, et c'est le `.js` que charge `index.html`. Les deux doivent être modifiés ensemble — ou pas du tout. Recompiler un `.coffee` exige un compilateur CoffeeScript externe, non fourni dans le dépôt.

**CI/CD** (`.github/workflows/`, ajoutés à l'étape 13) : `ci.yml` lance `npm test` avec `working-directory: HexGL` à chaque push/PR ; `cd.yml` publie `HexGL/` sur GitHub Pages, uniquement depuis `main`.

## Architecture

### L'ordre de chargement est manuel et critique

`index.html` charge dans l'ordre : les libs vendorisées (`libs/Three.dev.js`, post-processing, Leap, DAT.GUI, Stats), puis **chaque** module `bkcore.*` dans un ordre de dépendance explicite, puis `launch.js`. Aucun système de modules : tout s'accroche à un unique namespace global `bkcore`. Un `<script>` mal placé casse le jeu. Ajouter un fichier JS implique de l'insérer au bon endroit dans cette liste.

`index.html` porte aussi toute l'UI DOM : les écrans `#step-1` … `#step-5` (masqués via `display:none`, basculés par le JS), l'overlay `#credits`, et les items de menu `#start`, `#s-controlType`, `#s-quality`, `#s-hud`, `#s-godmode`, `#s-credits`.

### Deux arborescences de sources parallèles

- `bkcore/` — ES5 écrit à la main, le moteur de jeu.
- `bkcore.coffee/` — utilitaires CoffeeScript plus anciens, chacun avec son `.js` compilé à côté.

### Flux de lancement

`launch.js` (= `launch.coffee` compilé) est le contrôleur d'UI et le point d'entrée logique : il lit les paramètres d'URL via `bkcore.Utils.getURLParameter` pour pré-remplir le menu, câble les clics, teste le support WebGL, puis au clic sur Start → `#step-2` (écran d'aide) → `#step-3` (barre de progression) → `init()`, qui construit `bkcore.hexgl.HexGL` (piste codée en dur à `'Cityscape'`, `difficulty: 0`) et appelle `hexGL.load({onLoad, onError, onProgress})`.

`HexGL.load()` délègue à `track.load()` → `bkcore.threejs.Loader`, qui charge textures, géométries JSON, cubemaps, images d'analyse et sons. `Cityscape.load(opts, quality)` choisit le jeu de textures : `textures/` si `quality < 2`, sinon `textures.full/` (le `README.md` signale qu'on peut permuter les deux dossiers). `onLoad` → `hexGL.init()` (HUD, matériaux, scènes via `Cityscape.buildMaterials`/`buildScenes`, compositeur de post-processing) → `hexGL.start()`, qui démarre la boucle `requestAnimationFrame` et `initGameplay()`.

À chaque frame, `HexGL.update()` appelle `gameplay.update()` (compte à rebours, tours, checkpoints par lecture de pixels sur des images de collision), puis `manager.renderCurrent()` — la fonction de rendu par frame enregistrée par `Cityscape.buildScenes`, qui pilote `ShipControls`, `ShipEffects`, `CameraChase`, l'`EffectComposer` et le HUD.

`Échap` → `HexGL.reset()` (`bkcore/hexgl/HexGL.js:83`) : relance la course et l'audio **sans** recharger les assets.

### Modules du moteur (`bkcore/`)

| Fichier | Rôle |
|---|---|
| `hexgl/HexGL.js` | Orchestrateur : renderer WebGL, boucle de jeu, réglages qualité/difficulté, écran de score. |
| `hexgl/Gameplay.js` | Machine à états de la course (compte à rebours, tours, checkpoints, modes `timeattack`/`survival`/`replay`). |
| `hexgl/ShipControls.js` | Cœur physique (~800 lignes, le plus gros et le plus critique) : entrées, intégration du mouvement, collisions/hauteur par lecture de pixels, bouclier/boost/destruction. |
| `hexgl/ShipEffects.js`, `hexgl/CameraChase.js` | Effets du vaisseau ; caméra suiveuse. |
| `hexgl/HUD.js` | HUD dessiné sur un `<canvas>` 2D superposé. |
| `hexgl/RaceData.js` | Enregistrement/rejeu de trajectoire (`localStorage`). |
| `hexgl/tracks/Cityscape.js` | **Seule piste implémentée** : déclare les assets des deux profils de qualité, construit matériaux et scènes. |
| `threejs/{RenderManager,Loader,Particles,Shaders}.js` | Registre de scènes/caméras, chargeur multi-ressources, particules, bibliothèque de shaders GLSL. |
| `Audio.js` | Wrapper Web Audio API, avec repli `<audio>`. |

## Contraintes de test

Seuls les modules sans DOM sont testables. Les fichiers de `bkcore.coffee/*.js` se terminent par `exports = exports != null ? exports : this; exports.bkcore || (exports.bkcore = {})`, ce qui les rend chargeables tels quels sous Node : les tests font `require(path).bkcore.X`.

Couvert par les tests du TP : `Timer` (statiques purs), `ImageData` (méthodes de pixels purs, sur un faux objet `{pixels:{width,height,data}}`), `Utils` (avec `window`/`navigator` mockés), et les trois contrôleurs.

Non testables sans mocks lourds : `HexGL`, `Gameplay`, `HUD` (canvas 2D), `Audio` (Web Audio), `Loader` (XHR), `Cityscape` (assemble tout) — ils touchent `document`/`window`/`THREE`/`localStorage` directement, et `THREE` n'est chargé que comme global navigateur depuis `libs/`.

Piège Node ≥ 21 : `navigator` est un global natif en lecture seule, `global.navigator = {...}` est silencieusement ignoré — il faut redéfinir la propriété via `Object.defineProperty`.

## Pièges du legacy

- **Dérive `.coffee` / `.js`** : les en-têtes committés mentionnent des versions différentes du compilateur CoffeeScript (1.4.0, 1.6.3, 1.7.1) — rien ne garantit que le `.js` chargé corresponde au `.coffee` voisin.
- **Code mort conservé** : `bkcore/hexgl/Ladder.js` et `bkcore/threejs/Preloader.js` ne sont référencés par aucun `<script>` de `index.html` ; `bkcore.coffee/threejs/Particles.js` duplique `bkcore/threejs/Particles.js` avec un contenu différent ; `replays/cityscape-casual` n'est référencé nulle part.
- **Vestiges de packaging cassés** : `cache.appcache`, `manifest.webapp`, `package.webapp`, `package.zip` pointent vers `index-mobile.html` (absent) et vers de mauvais chemins pour `Timer.js`/`ImageData.js`/`Utils.js`.
- **Deux builds de Three.js vendorisés** : `libs/Three.dev.js` (utilisé) et `libs/Three.r53.js` (seulement par `bkcore.coffee/tests.html`). L'API active est très ancienne (`addSelf`, `translateX`, `rotateAxis`).
- **Licences incohérentes** : `README.md` annonce MIT, mais l'en-tête de la plupart des fichiers `bkcore/` déclare du Creative Commons BY-NC 3.0.
- Analytics Google et liens de partage codés en dur vers `hexgl.bkcore.com`.

## Règles de travail de ce TP

Tirées de `etapes/notes.md` et du ticket — elles s'appliquent à toute intervention :

- **Le gameplay doit rester inchangé.** Seul l'habillage visuel de l'écran d'accueil (`#step-1`) est concerné.
- **Ne pas changer de framework, ne pas moderniser** Three.js ni CoffeeScript. Pas de backend, pas d'upload dynamique.
- **Centraliser le branding en un seul point de configuration** (pas de valeurs éparpillées).
- **Node sert uniquement au tooling et aux tests**, jamais à l'exécution du jeu.
- Préférer de **petits changements réversibles**, et ne pas élargir le périmètre d'une étape.
