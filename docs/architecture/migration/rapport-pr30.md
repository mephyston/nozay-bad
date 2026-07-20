# Rapport de PR — PR30 — Corriger l'interface de repository non utilisée

## Périmètre traité
Ce correctif élimine les interfaces de repository mortes et non utilisées du projet afin de simplifier l'architecture et éviter toute fausse impression de conformité.

1. **Suppression des interfaces inutilisées** :
   - `InvoiceRepositoryInterface` (`libs/domains/accounting/shared/repository.ts` supprimé)
   - `CreateExpenseRepositoryInterface`, `ListExpensesRepositoryInterface`, `UpdateExpenseRepositoryInterface` (`libs/domains/expenses/shared/repository.ts` supprimé)
   - `ImportMembersRepositoryInterface`, `ListMembersRepositoryInterface`, `GetMemberRepositoryInterface`, `MemberCseDataRepositoryInterface`, `ApplyPaymentRepositoryInterface` (`libs/domains/members/shared/repository.ts` supprimé)
   - `ListProductsRepositoryInterface`, `CreateProductRepositoryInterface`, `UpdateProductRepositoryInterface`, `ListOrdersRepositoryInterface`, `CreateOrderRepositoryInterface`, `ApproveOrderRepositoryInterface`, `RejectOrderRepositoryInterface` (`libs/domains/shop/shared/repository.ts` supprimé)
2. **Nettoyage des classes concrètes** : Retrait des clauses `implements *Interface` et des imports associés de tous les repositories de tranches des domaines `expenses`, `members` et `shop`.
3. **Mise à jour de la documentation** : Ajout d'une section explicative dans `docs/architecture/06-hexagonal.md` actant ce choix de conception.

## Hors Scope
- La logique métier des cas d'usage.
- Les autres fichiers de l'architecture.

## Preuve de conformité

### Sortie de la suite complète de tests (100% au vert)
```
 RUN  v4.1.10 /Users/david/Lab/nozay-bad

 Test Files  79 passed (79)
      Tests  283 passed (283)
   Start at  00:49:01
   Duration  35.02s (transform 238.87s, setup 0ms, import 308.90s, tests 3.38s, environment 8.74s)
```
*(Tous les 283 tests unitaires et d'intégration ont réussi avec succès et sans régression)*
