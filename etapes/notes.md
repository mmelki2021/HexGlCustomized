# Prompts principaux

## 2 - Créer une branche dédiée

```text
git switch -c refactor/company-event
git branch
```

## 3 - Explorer le legacy

```text
Explore ce projet legacy sans modifier aucun fichier.

Génère directement `docs/architecture.md` avec :

- stack et points d’entrée ;
- flux principal de lancement ;
- principaux modules, fichiers et assets ;
- dépendances et zones legacy à risque ;
- fonctions/modules testables avec Node sans navigateur ;
- bugs, dettes ou anomalies remarquables.

Le document doit décrire uniquement l’état actuel du projet.

Ne propose aucune solution.
Ne refactore rien.
Ne modifie aucun autre fichier.
```

Cf. /3-explorer pour un exemple de architecture.md

## 4 - Figer les comportements à préserver

```text
À partir de ton analyse du projet, identifie les comportements existants
qu’il est pertinent de protéger avant le refactoring.

Crée uniquement les tests utiles et simples à exécuter sans navigateur.

Contraintes :
- utiliser uniquement les outils natifs de Node
  (`node:test`, `node:assert`, `node:fs` si nécessaire)
- privilégier les fonctions pures et les checks simples de non-régression
- ajouter un `package.json` minimal avec une commande `npm test`
- ne pas modifier le code fonctionnel
- ne pas figer le logo, les couleurs, les textes ou autres éléments
  de branding qui seront volontairement modifiés plus tard.

À la fin, exécute `npm test` et explique brièvement ce que chaque test protège.
```

Cf. /4-figer-les-comportements pour un exemple des tests et de captures

## 5 et 6 - Spécification fonctionnelle

Ce prompt utilise le ticket, le logo, et la charte graphique déjà préparées dans le dossier /HexGL/formation/ pour générer la specification fonctionnelle :

```text
Lis :
- @formation/tickets/company-event.md
- @formation/identite/charte_graphique_acme.pdf
- @formation/identite/logo.png
- @docs/architecture.md
- ainsi que le code concerné.

Le ticket exprime le besoin métier.
La charte et le logo sont des contraintes d'identité visuelle à respecter.

Avant de rédiger la spec :
- utilise AskUserQuestion uniquement si une ambiguïté nécessite réellement
  une décision humaine
- ne redemande pas ce qui est déjà explicite dans les documents
- ne propose pas encore de solution technique

Une fois les points nécessaires clarifiés, génère : work/company-event/spec.md avec :
- Contexte et objectif
- Exigences fonctionnelles
- Comportements attendus
- Contraintes
- Cas limites et gestion des erreurs
- Hors périmètre
- Critères d’acceptation

La spécification décrit ce que l’on veut obtenir et pourquoi, sans définir encore la solution technique.

Ne modifie aucun code.
```
Review : 
```text
Relis @work/company-event/spec.md comme reviewer produit.
Signale uniquement :- les ambiguïtés restantes- les exigences non vérifiables- les décisions techniques qui se sont glissées dans la spécification- les exigences inventées par rapport aux sources du besoin- les cas limites ou éléments hors périmètre manquants qui pourraient élargir le travail. Ne modifie rien. Classe les remarques par importance.
```

Cf. /5-6-spec pour une exemple de specification fonctionnelle

## 7 et 8 - Design technique

```text
/plan À partir de @work/company-event/spec.md et de @docs/architecture.md,
propose l’approche technique minimale pour implémenter le changement
dans cette codebase legacy.

Contraintes :
- préserver le gameplay et le fonctionnement actuel ;
- ne pas changer de framework ni moderniser Three.js / CoffeeScript ;
- centraliser le branding dans un seul point de configuration ;
- Node sert uniquement au tooling et aux tests ;
- pas de backend ni d’upload dynamique ;
- préférer de petits changements réversibles.

Structure le plan avec :
- objectif
- état actuel et architecture concernée
- approche technique
- fichiers et modules impactés
- structure des données de branding si nécessaire
- décisions techniques principales
- risques et compatibilité
- stratégie de tests et de vérification
- plan d’implémentation en 3 à 5 petites étapes

Ne code rien.
```

Review :

```text
Le plan est validé.
Enregistre le plan validé dans : work/company-event/design.md
Ne l'enrichis pas et ne commence aucune implémentation.
Ne modifie aucun autre fichier.
```

Cf. /7-8-design-technique pour une exemple de design technique

## 9 - Build

Cf. /9-build pour les captures d'écran de chaque étape

### ETAPE 1 : 

```text
Implémente uniquement l’étape 1 « Fondations + fond sombre »
du plan d’implémentation de @work/company-event/design.md.
Respecte exactement le design validé et les contraintes propres à cette étape.
Règles :
- n’anticipe pas les étapes suivantes
- ne modifie rien hors du périmètre prévu
- ne touche pas au gameplay ni au JavaScript / CoffeeScript sauf si le design l’exige explicitement
- lance `npm test` après les modifications
- si un test échoue, corrige la cause sans supprimer ni affaiblir le test
- arrête-toi après cette étape
- résume les fichiers modifiés, les changements effectués et le résultat des tests
Ne commence pas l’étape suivante.
```

### ETAPE 2 : 

```text
L’étape 1 est validée.

Implémente uniquement l’étape 2 « Logo ACME + carte de contraste »
du plan d’implémentation de @work/company-event/design.md.

Respecte exactement le design validé et les contraintes propres à cette étape.

Règles :
- n’anticipe pas les étapes suivantes
- ne modifie rien hors du périmètre prévu
- ne touche pas au gameplay ni au JavaScript / CoffeeScript sauf si le design l’exige explicitement
- lance `npm test` après les modifications
- si un test échoue, corrige la cause sans supprimer ni affaiblir le test
- arrête-toi après cette étape
- résume les fichiers modifiés, les changements effectués et le résultat des tests

Ne commence pas l’étape suivante.
```

### ETAPE 3 : 

```text
L’étape 2 est validée.

Implémente uniquement l’étape 3 « Message d’accueil »
du plan d’implémentation de @work/company-event/design.md.

Respecte exactement le design validé et les contraintes propres à cette étape.

Règles :
- n’anticipe pas les étapes suivantes
- ne modifie rien hors du périmètre prévu
- ne touche pas au gameplay ni au JavaScript / CoffeeScript sauf si le design l’exige explicitement
- lance `npm test` après les modifications
- si un test échoue, corrige la cause sans supprimer ni affaiblir le test
- arrête-toi après cette étape
- résume les fichiers modifiés, les changements effectués et le résultat des tests

Ne commence pas l’étape suivante.
```

### ETAPE 4 :

```text
L’étape 3 est validée.

Implémente uniquement l’étape 4 « Re-skin menu et bouton Start »
du plan d’implémentation de @work/company-event/design.md.

Respecte exactement le design validé et les contraintes propres à cette étape.

Règles :
- n’anticipe pas les étapes suivantes
- ne modifie rien hors du périmètre prévu
- ne touche pas au gameplay ni au JavaScript / CoffeeScript sauf si le design l’exige explicitement
- lance `npm test` après les modifications
- si un test échoue, corrige la cause sans supprimer ni affaiblir le test
- arrête-toi après cette étape
- résume les fichiers modifiés, les changements effectués et le résultat des tests

Ne commence pas l’étape suivante.
```

### ETAPE 5 : 

```text
L’étape 4 est validée.

Implémente uniquement l’étape 5 « Media query petits écrans / portrait »
du plan d’implémentation de @work/company-event/design.md.

Respecte exactement le design validé et les contraintes propres à cette étape.

Règles :
- ne modifie rien hors du périmètre prévu
- ne touche pas au gameplay ni au JavaScript / CoffeeScript sauf si le design l’exige explicitement
- lance `npm test` après les modifications
- si un test échoue, corrige la cause sans supprimer ni affaiblir le test
- arrête-toi après cette étape
- résume les fichiers modifiés, les changements effectués et le résultat des tests

Ne réalise aucun commit.
```

## 10 - Vérification générale

```text
/simplify Concentre-toi uniquement sur les fichiers modifiés pour ce changement. Simplifie seulement si cela améliore réellement la qualité ou réduit la duplication. Ne change aucun comportement, n'élargis pas le périmètre, ne modernise pas la codebase et ne touche pas au gameplay ni au JavaScript / CoffeeScript. Si aucune simplification utile n'est nécessaire, ne modifie rien.
```

puis :

```text
Vérifie l’implémentation par rapport aux critères d’acceptation de @work/company-event/spec.md.
Pour chaque critère, indique :
- PASS, FAIL ou INCONCLUSIVE
- la preuve observée : test, fichier, diff ou comportement visible 
- si FAIL, la cause probable
Vérifie également qu’aucun changement hors périmètre n’a été introduit.
Ne modifie rien pendant cette vérification.
```

## 11 - Capitaliser et nettoyer


```text
Analyse @work/company-event/spec.md, @work/company-event/design.md et le diff actuel.
Pour ce TP, spec.md et design.md sont des artefacts de travail temporaires qui seront supprimés après capitalisation.
Identifie uniquement les informations qui doivent rester vraies après livraison :
- changement d’architecture
- nouvelles commandes
- contraintes ou pièges importants
- décisions techniques durables
Propose les mises à jour nécessaires de @docs/architecture.md
afin que ces informations survivent à la suppression des artefacts temporaires.
Ne supprime rien et ne modifie rien sans ma validation.
```

puis :

```text
Applique les mises à jour validées à @docs/architecture.md. Puis supprime les artefacts temporaires : @work/company-event/spec.md et @work/company-event/design.md. Supprime ensuite le dossier work/company-event s’il est vide. Supprime également de la doc toute référence devenue invalide vers ces fichiers. Ne touche à aucun autre fichier.
```

Cf. /11-capitaliser-et-nettoyer pour la doc mise à jour.

## 12 - Commit

```text
Analyse le diff actuel avant commit, propose un message adapté puis crée le commit local. Ne push rien. En cas de changement inattendu, arrête-toi avant le commit.
```

## 13 - Commit

Cf. /13-automatisations-git pour les fichiers du chapitre sur Git, GitHub, et CI / CD