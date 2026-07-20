# Rapport de PR — PR23 — Supprimer les dossiers legacy vides

## Modifications apportées
1. Vérification que les packages `api/`, `data-access/`, `ui/` ne contiennent plus que ce qui est légitimement partagé à l'intérieur de chaque domaine (`expenses`, `members`, `shop`, `accounting`).
2. Conservation du schéma Drizzle interne centralisé dans `data-access/src/schema.ts` (car partagé par plusieurs repositories du domaine).
3. Documentation explicite de ce choix d'architecture dans [06-hexagonal.md](file:///Users/david/Lab/nozay-bad/docs/architecture/06-hexagonal.md).
4. Suppression de tous les répertoires legacy vides ou redondants.

## Sortie des Tests Exécutés

```
 RUN  v4.1.10 /Users/david/Lab/nozay-bad

 ✓  features-accounting-api  src/helpers.test.ts (3 tests) 2ms
 ✓  features-accounting-api  src/routes.test.ts (51 tests) 275ms

 Test Files  2 passed (2)
      Tests  54 passed (54)
```
