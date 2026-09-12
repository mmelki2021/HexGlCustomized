# Spécification — Personnalisation événementielle HexGL pour ACME

> Décrit ce que l'on veut obtenir et pourquoi. Ne définit pas la solution technique
> (fichiers à modifier, architecture, implémentation).
>
> Sources : `formation/tickets/company-event.md` (besoin métier),
> `formation/identite/charte_graphique_acme.pdf` (contraintes d'identité visuelle,
> valeur de vérité graphique pour ce TP), `formation/identite/logo.png` (asset logo),
> `docs/architecture.md` (état actuel du code).

## 1. Contexte et objectif

ACME souhaite utiliser HexGL comme animation lors d'un événement d'entreprise
(« ACME Racing Challenge »). Le jeu lui-même (piste, physique, HUD de course)
n'a pas besoin de changer : ce qui doit changer, c'est la **première impression**
que le joueur a en ouvrant le jeu, afin qu'elle porte l'identité visuelle d'ACME
plutôt que celle de HexGL/BKcore.

Aujourd'hui, l'écran d'accueil (premier écran visible, avant tout clic) affiche
une image de fond et un titre graphique propres à HexGL, un menu de réglages
(type de contrôle, qualité, HUD, godmode) et un bouton de démarrage, le tout
dans une palette bleu/orange sans lien avec ACME (cf. `docs/architecture.md`,
§1-2, et `css/multi.css`).

**Objectif** : que l'écran d'accueil de HexGL affiche le logo ACME, les couleurs
de la charte graphique et le message d'accueil de référence, pour que
l'expérience démarre clairement sous l'identité ACME — sans toucher à ce qui
fait le jeu (course, contrôles, HUD, physique).

## 2. Exigences fonctionnelles

1. Le logo ACME (asset fourni, `formation/identite/logo.png`) est affiché sur
   l'écran d'accueil, intégralement, sans déformation, net et bien contrasté
   par rapport à son environnement immédiat. La solution garantissant ce
   contraste (choix du fond, d'un support, etc.) relève de la conception,
   pas de cette spécification.
2. **Décision produit** : l'identité visuelle HexGL actuellement affichée sur
   l'écran d'accueil (titre/logo HexGL) est remplacée par l'identité ACME —
   elle ne doit plus être affichée sur cet écran. Les écrans de crédits et
   leurs attributions restent inchangés (cf. §6, hors périmètre).
3. **Décision produit** : la présence du nom « ACME » dans le logo et/ou dans
   le message d'accueil suffit ; aucune occurrence séparée du nom n'est
   requise.
4. Le message d'accueil affiché est le texte de référence donné par la charte :
   **« Bienvenue au ACME Racing Challenge »**, repris tel quel (pas reformulé,
   pas traduit différemment).
5. L'habillage visuel de l'écran d'accueil (fond, accents, éléments mis en
   avant) utilise la palette ACME définie par la charte : fond principal sombre
   (noir profond `#08090D`), accents violet (`#7628FF`), bleu électrique
   (`#315BFF`) et cyan (`#00C4E8`), texte en blanc (`#FFFFFF`) ou gris clair
   (`#E6E8EE`) pour les surfaces secondaires ; le dégradé événementiel
   violet → bleu (`#7628FF` → `#315BFF`) est autorisé pour les éléments
   événementiels (ex. bouton d'action).
6. Le gameplay (physique du vaisseau, détection de collision, boucle de
   course), les contrôles (clavier/tactile/manette/gyroscope/Leap) et le HUD
   affiché pendant la course restent strictement inchangés.

## 3. Comportements attendus

- Au lancement de l'application, le tout premier écran vu par le joueur porte
  l'identité ACME (logo + message d'accueil) — pas d'étape intermédiaire
  encore brandée HexGL avant cet écran.
- Toutes les actions déjà disponibles sur l'écran d'accueil aujourd'hui
  (démarrer la partie, changer le type de contrôle, la qualité graphique,
  activer/désactiver le HUD, accéder aux crédits) continuent de déclencher
  exactement le même comportement qu'avant ce changement. Seul l'habillage
  visuel de cet écran évolue, pas sa logique.
- Une fois l'écran d'accueil quitté (clic sur démarrer), le parcours du joueur
  (écran d'aide aux contrôles, barre de chargement, course, écran de fin de
  course/score, crédits) conserve son apparence actuelle : le changement
  d'identité visuelle ne concerne que l'écran d'accueil.
- L'écran rebrandé reste lisible, utilisable et sans chevauchement
  d'éléments lors de la vérification prévue dans le cadre du TP — le
  rebranding ne doit pas dégrader l'utilisabilité actuelle de cet écran.

## 4. Contraintes

Contraintes issues de la charte graphique (source de vérité pour l'identité
visuelle) et du ticket :

- **Logo** : utiliser le fichier fourni sans le déformer (ni étirement, ni
  compression), sans lui ajouter d'ombre ou de contour, sans le recolorer.
  Conserver une zone de respiration autour de lui. Le logo doit rester net,
  lisible et suffisamment contrasté par rapport à son environnement
  immédiat ; le choix de la solution permettant d'assurer ce contraste
  (fond retenu, support éventuel, etc.) relève de la conception, pas de
  cette spécification.
- **Couleurs** : se limiter à la palette de la charte (noir profond, violet,
  bleu électrique, cyan, blanc, gris clair, dégradé violet→bleu). Le fond
  principal doit rester sombre — jamais un gris moyen dominant.
- **Typographie** : ne pas introduire de nouvelle dépendance à une police web
  uniquement pour ce rebranding. Conserver la typographie déjà en place dans
  le jeu si elle reste lisible et cohérente avec l'esprit « titres en
  sans-serif à graisse forte » recommandé par la charte.
- **Sobriété** : la charte demande explicitement d'éviter les effets
  additionnels complexes ; l'intégration visée est sobre et maintenable, pas
  une refonte spectaculaire.
- **Non-régression fonctionnelle** : le ticket est explicite — « le gameplay
  doit rester inchangé ». Cela couvre le gameplay au sens large : contrôles,
  HUD de course, physique, détection de collision, boucle de jeu.
- **Message d'accueil** : le texte « Bienvenue au ACME Racing Challenge » est
  une valeur de référence fournie par la charte, à afficher telle quelle.

## 5. Cas limites et gestion des erreurs

- **Petits écrans / orientation portrait** (mobile, bornes tactiles) : le
  logo et le message d'accueil doivent rester lisibles et ne pas chevaucher
  le menu de réglages existant (type de contrôle, qualité, HUD, godmode),
  dans le cadre de la vérification prévue par le TP.
- **Réglage « Godmode »** : ce réglage est aujourd'hui masqué par défaut dans
  l'interface. Le rebranding ne doit ni le rendre visible ni changer sa
  disponibilité ; si son habillage visuel est malgré tout affecté par la
  nouvelle palette, son comportement fonctionnel doit rester identique.
- **Contraste du logo** : un seul fichier logo est fourni (pas de variante
  dédiée « fond sombre »). Si le fond retenu pour l'écran d'accueil ne
  garantit pas nativement sa lisibilité et son contraste, une solution doit
  être trouvée en conception ; cette spécification fixe uniquement
  l'exigence de résultat (logo net, lisible, contrasté), pas la solution.
- **Longueur du message d'accueil** : le texte de référence doit rester
  entièrement lisible ; un retour à la ligne est acceptable sur un écran
  étroit, une troncature silencieuse ne l'est pas.

## 6. Hors périmètre

- Tout ce qui se passe après le clic sur le bouton de démarrage : écran
  d'aide aux contrôles, barre de chargement, déroulé de la course, HUD de
  course, écran de fin de course/score, partage sur les réseaux sociaux,
  classement.
- Le contenu de l'écran de crédits (attribution des auteurs, technologies,
  licences graphiques) : non modifié par ce ticket.
- Les métadonnées techniques de la page (titre d'onglet du navigateur,
  balises Open Graph, favicon, suivi Google Analytics) : ni le ticket ni la
  charte ne les mentionnent.
- Restent également inchangés et hors périmètre, faute d'être demandés par
  le ticket ou la charte : l'écran de repli affiché si WebGL n'est pas
  supporté, l'animation existante du fond de l'écran d'accueil (le titre/logo
  HexGL étant supprimé de cet écran, cf. §2, il n'y a pas lieu de conserver
  son animation), le sous-texte illustratif de la maquette (« Une expérience
  événementielle aux couleurs de la marque. »), et le mécanisme existant de
  pré-remplissage des réglages via paramètres d'URL.
- La correction des bugs et dettes techniques recensés dans
  `docs/architecture.md` : hors périmètre, sauf si l'un d'eux empêche
  directement de réaliser ce ticket.
- Le libellé fonctionnel des options du menu (type de contrôle, qualité, HUD,
  godmode) : seul leur habillage visuel est concerné, pas leur texte.
- Le libellé du bouton de démarrage (« Start ») : le ticket ne demande
  explicitement que le logo, les couleurs, le nom de l'entreprise et le
  message d'accueil. La maquette de la charte illustre un bouton intitulé
  « DÉMARRER LA COURSE », mais ce libellé n'est pas repris dans la liste des
  éléments à adapter ; le texte du bouton reste inchangé, seul son habillage
  (couleur) suit la palette ACME.
- Toute déclinaison de l'identité ACME au-delà de l'écran d'accueil (piste,
  autres modes de jeu, fichiers de packaging `manifest.webapp`/
  `cache.appcache`).

## 7. Critères d'acceptation

- En ouvrant le jeu, avant toute interaction, le joueur voit le logo ACME
  affiché intégralement, sans déformation ni recoloration, net et bien
  contrasté par rapport à son environnement immédiat, avec un espace de
  respiration visible autour de lui.
- Le message « Bienvenue au ACME Racing Challenge » est visible et lisible
  sur l'écran d'accueil.
- Le fond de l'écran d'accueil est sombre, et les éléments visuels mis en
  avant (titre, bouton de démarrage, éléments de surbrillance) n'utilisent
  que des couleurs de la palette ACME (violet, bleu électrique, cyan, blanc,
  gris clair, noir profond, ou le dégradé violet→bleu).
- L'ancien titre/logo HexGL n'est plus affiché sur l'écran d'accueil :
  l'identité visuelle qui y est visible est celle d'ACME (logo, couleurs,
  message). Les écrans de crédits et leurs attributions restent inchangés.
- Chaque action du menu d'accueil (démarrer, changer le type de contrôle, la
  qualité, le HUD, accéder aux crédits) produit exactement le même effet
  qu'avant le changement.
- Aucune différence n'est constatée dans le déroulé de la course : contrôles,
  physique du vaisseau, HUD de course, fin de course, écran de score.
- Aucune nouvelle police web n'a été ajoutée pour les besoins de cet écran.
- L'écran d'accueil rebrandé reste lisible, utilisable et sans
  chevauchement d'éléments lors de la vérification prévue dans le cadre du
  TP.
