# Vertical Slice Architecture (VSA) Standards

Standards et bonnes pratiques pour organiser le code par tranches verticales (cohérence fonctionnelle) plutôt que par couches techniques (contrôleurs, services, dépôts).

## Rules

* Regrouper le code par fonctionnalité (Feature Slice) : placer les modèles de base de données, les schémas de validation, les routes Hono, et les composants UI associés au même endroit ou sous le même domaine fonctionnel.
* Maintenir un couplage faible entre les domaines : un domaine (ex : `search`) ne doit pas accéder directement aux tables de base de données ou au stockage d'un autre domaine (ex : `catalog`). Utiliser des interfaces d'API publiques ou des événements pour communiquer.
* Masquer l'implémentation interne : exposer uniquement les types et les fonctions nécessaires via un fichier d'index public (barrel file `index.ts`) au niveau de la racine de la bibliothèque ou du module.
* Préférer l'injection de dépendances par constructeur (Constructor Injection) et l'utilisation de Factory Functions pour instancier les routes et injecter les liaisons de bases de données ou de services.
* Rédiger des règles fonctionnelles (RF) claires sous `docs/domain/[domaine]/rules/` en parallèle de l'écriture du code de la tranche verticale.
