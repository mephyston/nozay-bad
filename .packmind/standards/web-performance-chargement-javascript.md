# Web Performance - Chargement JavaScript

Ce standard définit les stratégies de chargement JavaScript pour optimiser le parsing, l'exécution et réduire le temps de blocage du rendu. Couvre les attributs defer/async, le code splitting, le lazy-loading des modules, l'élimination du JavaScript inutilisé (tree-shaking), et les techniques de progressive enhancement.

## Rules

* Utiliser defer pour les scripts non-critiques afin de ne pas bloquer le parsing HTML
* Utiliser async uniquement pour les scripts indépendants (analytics, publicités) qui n'ont pas de dépendances
* Implémenter le code splitting pour charger uniquement le JavaScript nécessaire à chaque page
* Utiliser type="module" avec import maps pour charger les modules ES6 natifs et réduire le bundle
* Activer le tree-shaking en utilisant des imports nommés et en évitant les imports par défaut de grosses librairies
* Lazy-load les composants non visibles initialement avec Intersection Observer
* Éliminer le JavaScript mort avec des outils d'analyse de coverage (Chrome DevTools Coverage)
* Utiliser requestIdleCallback pour exécuter le JavaScript non-critique pendant les périodes d'inactivité
* Précharger les modules dynamiques avec <link rel="modulepreload"> pour réduire la latence
* Utiliser Web Workers pour déléguer les calculs lourds hors du thread principal
