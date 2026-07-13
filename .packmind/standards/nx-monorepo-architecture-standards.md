# NX Monorepo Architecture Standards

Ce standard définit l'architecture et les pratiques pour organiser un monorepo NX avec isolation des modules, boundaries enforcement, build optimization et structure en apps/libs. Il couvre l'organisation par couches (backend/frontend/shared), le tag system pour les dépendances, le cache distribué, et le principe de Bounded Contexts pour les libs backend. À appliquer sur tous les projets NX pour garantir scalabilité et maintenabilité.

## Rules

* Organiser le monorepo en apps/ (applications déployables) et libs/ (modules réutilisables).
* Structurer libs/ par couche technique : backend/, shared/, frontend/ pour séparation des responsabilités.
* Appliquer le tag system NX pour enforcer les boundaries entre modules.
* Configurer project.json avec tags pour chaque lib/app selon son scope et type.
* Utiliser implicitDependencies pour forcer rebuild si fichier racine modifié.
* Limiter les dépendances cross-layer avec @nx/enforce-module-boundaries dans eslint config.
* Préférer bunx nx run-many -t build pour build parallèle de plusieurs projets.
* Activer le cache NX avec cache: true dans targetDefaults pour optimiser les rebuilds.
* Utiliser nx.json pour définir les targetDefaults globaux applicables à tous les projets.
* Organiser les libs backend en Bounded Contexts (DDD) isolés et autonomes.
* Chaque Bounded Context expose un barrel file (index.ts) strict avec API publique uniquement.
* Configurer paths dans tsconfig.base.json pour import aliases clairs et lisibles.
* Utiliser nx affected en CI/CD pour build uniquement les projets modifiés depuis la branche de base.
* Documenter l'architecture du monorepo dans AGENTS.md ou ARCHITECTURE.md à la racine.
* Éviter les import circulaires en analysant régulièrement avec nx graph pour détecter les cycles.
