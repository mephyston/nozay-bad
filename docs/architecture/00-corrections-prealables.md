# Corrections préalables (PR0, avant toute restructuration)

Ces 3 corrections sont indépendantes du découpage en tranches et doivent être
livrées en premier, sans changement de structure de dossiers.

## PR0.1 — Supprimer la 3e définition de `seasonsTable`

- Supprimer `seasonsTable` (redéfinition locale) de `libs/shared/db/src/helpers.ts`.
- Confirmer le domaine propriétaire de `seasons` (semble être `members`,
  d'après `libs/features/members/data-access/src/schema.ts`).
- Déplacer `isSeasonClosed(db, seasonId)` dans ce domaine, l'exporter depuis
  son `index.ts`.
- Mettre à jour les imports dans `accounting`, `expenses`, `shop` pour
  utiliser cette fonction exportée au lieu de celle de `shared/db`.
- Supprimer l'export de `isSeasonClosed` depuis `libs/shared/db/src/index.ts`.

## PR0.2 — Sortir `normalizeCategory` de `shared/db`

- Déplacer `normalizeCategory()` (et sa map de catégories comptables) de
  `libs/shared/db/src/helpers.ts` vers `libs/features/accounting` (règle
  métier du domaine accounting).
- Mettre à jour les imports.

## PR0.3 — Supprimer l'écriture cross-domaine dans `membersTable`

- Dans `libs/features/members`, créer et exporter une fonction publique
  `applyPaymentToMember(db, memberId, amountCents)` qui porte la logique
  actuellement inline dans `reconcileBankTxInternal`
  (`libs/features/accounting/api/src/helpers.ts`) : calcul de
  `amountReceived`, `amountRemaining`, `paid`.
- Remplacer l'écriture directe dans `accounting/api/src/helpers.ts` par un
  appel à cette fonction.
- Supprimer l'import de `membersTable` dans `accounting`.

Chacune de ces 3 corrections est un changement de comportement nul
(refactor pur) — à vérifier par les tests existants, qui doivent rester verts
sans modification.
