# Documentation Fonctionnelle et Métier (DDD)

Standards et bonnes pratiques pour maintenir la documentation fonctionnelle et métier à jour dans le répertoire `docs/domain` en suivant les principes du Domain-Driven Design (DDD).

## Rules

* Mettre à jour le glossaire : Mettre à jour le dictionnaire de données dans le fichier `docs/domain/[domaine]/README.md` dès que de nouveaux termes ou notions techniques/métier sont introduits.
* Documenter les règles fonctionnelles : Créer ou modifier les règles individuelles sous le format `docs/domain/[domaine]/rules/RF-[DOM]-[XXX]-[nom].md` en suivant le gabarit de `docs/domain/rules/RF-000-template.md`.
* Ajouter des tests d'acceptation : Fournir des scénarios rédigés au format Gherkin (`Etant donné / Quand / Alors`) pour chaque règle fonctionnelle afin de documenter le comportement attendu.
