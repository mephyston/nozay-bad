# DDD léger

> **Note de lecture.** Ce document a été écrit pendant la migration de juillet 2026. Les chemins `libs/features/**` et les alias `@metacult/*` qu'il cite en **contre-exemples** décrivent le code d'alors ; ils n'existent plus. La structure livrée est décrite dans [02-folder-structure](./02-folder-structure.md), les dépendances effectives dans [03-dependencies](./03-dependencies.md). Le raisonnement, lui, reste la référence.

Pas de value objects systématiques, pas d'event sourcing, pas de CQRS avec
bus. Seulement :

- Chaque domaine a un ou plusieurs **agrégats** (`shared/<agregat>.ts`) qui
  portent les règles métier aujourd'hui dupliquées dans les handlers.
- Les **handlers orchestrent**, ils ne réimplémentent pas les règles.
- Les **repositories persistent**, ils ne décident rien.
- Les **DTO appartiennent au transport** (route/validator), jamais à
  l'agrégat.

## Exemple concret : l'agrégat `Invoice`

Règles actuellement dispersées dans
`libs/features/accounting/api/src/routes/invoices.ts`, à extraire :

```ts
// libs/domains/accounting/shared/invoice.ts
export class Invoice {
  // ...

  canBeEdited(): boolean {
    // aujourd'hui dupliqué dans PUT /:id :
    // if (invoice.status !== 'draft') return error
    return this.status === 'draft';
  }

  canBeDeleted(): boolean {
    // aujourd'hui dupliqué dans DELETE /:id :
    // if (status !== 'draft' && status !== 'cancelled') return error
    return this.status === 'draft' || this.status === 'cancelled';
  }

  markAsPaid(bankStatementLineId: number): void {
    this.status = 'paid';
    this.bankStatementLineId = bankStatementLineId;
  }
}
```

Chaque handler (`update-invoice`, `delete-invoice`, `change-invoice-status`)
appelle ces méthodes plutôt que de réécrire la condition. Bénéfice direct :
la règle "une facture non-brouillon n'est pas modifiable" n'existe plus qu'à
un seul endroit.

## Exemple concret : l'agrégat `BankStatementLine`

La fonction `reconcileBankTxInternal()` (`accounting/api/src/helpers.ts`,
~200 lignes) mélange aujourd'hui : validation, plusieurs règles métier
(facture déjà payée, saison clôturée), orchestration de 2 actions possibles
(`match`/`create`), et mutation d'un domaine voisin (`membersTable`). À
éclater en :

- `BankStatementLine.reconcile(...)` (agrégat `accounting`, décide si un
  rapprochement est possible et calcule le nouveau statut)
- appel à `members.applyPaymentToMember(tx, memberId, amount)` (API publique
  du domaine `members`, cf. `01-principles.md` règle 5) pour la partie qui
  aujourd'hui écrit directement dans `membersTable`
