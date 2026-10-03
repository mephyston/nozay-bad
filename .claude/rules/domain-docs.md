---
paths:
  - "docs/domain/**"
  - "libs/domains/**/handler.ts"
  - "libs/domains/**/validator.ts"
  - "libs/domains/**/shared/**"
---

# Documentation métier (`docs/domain/`)

Une règle métier écrite dans le code s'écrit aussi dans `docs/domain/`, dans le même commit.

- **Règle fonctionnelle** : `docs/domain/<domaine>/rules/RF-<DOM>-<NNN>-<nom>.md`, d'après le gabarit `docs/domain/rules/RF-000-template.md`. Une modification de comportement met à jour la RF existante plutôt que d'en créer une nouvelle.
- **Scénarios d'acceptation** au format Gherkin (`Étant donné / Quand / Alors`) dans chaque RF ; ils doivent se retrouver dans les tests de la tranche.
- **Glossaire** : tout nouveau terme métier entre dans `docs/domain/<domaine>/README.md`, avec la définition retenue par le club (pas celle d'un dictionnaire).
- Une décision d'architecture durable = un ADR dans `docs/architecture/ADR-NNNN-*.md`.
