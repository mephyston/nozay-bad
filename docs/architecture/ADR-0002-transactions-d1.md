# ADR-0002 — Transactions D1 : comportement réel et risques

**Statut :** Investigation complétée — en attente de décision  
**Date :** 2026-07-24  
**Conditionne :** Prompts 9 et 13 (opérations multi-tables)

## Contexte

11 handlers utilisent `db.transaction()` (drizzle-orm). Le harnais de test (`libs/shared/db/src/test-utils.ts`) intercepte `BEGIN`/`COMMIT`/`ROLLBACK` via un Proxy JavaScript et simule le rollback par snapshot+restauration des 16 tables. Les tests valident donc un comportement transactionnel que le harnais fabrique lui-même.

## Comportement constaté

### 1. Ce que fait drizzle-orm D1 `transaction()`

Source analysée : `node_modules/drizzle-orm/d1/session.js`, lignes 63-74.

```javascript
async transaction(transaction, config) {
  const tx = new D1Transaction("async", this.dialect, this, this.schema);
  await this.run(sql.raw(`begin${config?.behavior ? " " + config.behavior : ""}`));
  try {
    const result = await transaction(tx);
    await this.run(sql`commit`);
    return result;
  } catch (err) {
    await this.run(sql`rollback`);
    throw err;
  }
}
```

Drizzle envoie **littéralement** `BEGIN`, `COMMIT`, `ROLLBACK` comme des requêtes SQL préparées au binding D1.

### 2. Ce que fait Cloudflare D1 avec `BEGIN`

| Environnement | Comportement |
|---|---|
| **`wrangler dev --local`** (miniflare/workerd) | SQLite local réel → `BEGIN`/`COMMIT`/`ROLLBACK` **fonctionnent**. Les transactions sont atomiques. |
| **D1 production / staging** (HTTP API) | **`D1_ERROR`** : D1 ne supporte pas les transactions interactives. `BEGIN` lève une erreur. |

**Preuve dans le code existant :** `import-bank-statement/handler.ts` lignes 80-85 :

```typescript
} catch (err: unknown) {
  if (err.message && err.message.includes('begin')) {
    insertedCount = await runSequential(db);
  } else {
    throw err;
  }
}
```

Ce `catch` prouve que l'erreur sur `BEGIN` **a déjà été rencontrée en production** pour ce handler. Le développeur a contourné le problème en exécutant séquentiellement sans aucune garantie d'atomicité. Les 10 autres handlers n'ont **aucun fallback** — ils crashent en production sur `BEGIN`.

### 3. Ce que fait le harnais de test

`libs/shared/db/src/test-utils.ts` utilise `@cloudflare/vitest-pool-workers` qui exécute les tests dans miniflare (SQLite local). Le Proxy intercepte `BEGIN`/`COMMIT`/`ROLLBACK` pour simuler un rollback par snapshot. Conséquences :

1. **Les tests passent toujours** — même si le runtime de production lèverait une erreur
2. **Le rollback simulé masque l'absence de vrai rollback** — les tests vérifient un comportement que D1 ne peut pas fournir
3. **Les tests ne peuvent pas détecter les écritures orphelines** — car le Proxy empêche toute exécution réelle des statements transactionnels

## Classification des handlers par risque

### 🔴 Risque CRITIQUE — Écriture financière multi-tables

Ces handlers écrivent dans des tables financières distinctes. Sans atomicité, un crash entre deux écritures laisse des données incohérentes à impact comptable.

| Handler | Tables écrites | Scénario d'orphelinage | Impact métier |
|---|---|---|---|
| **shop/approve-order** | `transactions` → `orders` | Transaction de recette créée, commande non mise à jour | Recette comptabilisée sans commande approuvée. Double-comptabilisation possible si retry. |
| **checks/record-check-ledger-entry** (`createCheck`) | `transactions` → `checks` → `members` | Transaction créée, chèque non lié | Chèque sans transaction associée. Montant adhérent non mis à jour. |
| **checks/record-check-ledger-entry** (`deleteCheck`) | `checks` → `transactions` → `members` | Chèque délié, transaction non supprimée | Transaction orpheline dans le Grand Livre. Comptabilité fausse. |
| **expenses/update** (`approveExpense`) | `transactions` → `expenses` | Transaction de dépense créée, note de frais non validée | Dépense comptabilisée mais note de frais reste "pending". |
| **expenses/update** (`cancelExpenseApproval`) | `expenses` → `bank_statement_lines` → `transactions` | Note de frais annulée, transaction non supprimée | Transaction fantôme dans le Grand Livre. |
| **transactions/delete-ledger-entry** | `bank_statement_lines` → `members` → `expenses` → `transactions` | Bank tx réinitialisée, transaction non supprimée | État de rapprochement incohérent avec le relevé bancaire. |
| **bank/reconcile-bank-statement-line** | `transactions` → `invoices` → `bank_statement_lines` → `members` | Transaction créée, facture non marquée payée, écriture bancaire non pointée | Écart entre comptabilité et relevé bancaire. Facture affichée impayée alors que le paiement est enregistré. |
| **bank/reconcile-bulk** | Itération sur N réconciliations | 3 sur 5 réussies, les 2 suivantes échouent | État partiellement rapproché sans moyen de savoir où ça s'est arrêté. |

### 🟡 Risque MODÉRÉ — Cohérence structurelle

| Handler | Tables écrites | Scénario d'orphelinage | Impact métier |
|---|---|---|---|
| **invoices/create-invoice** | `invoices` → `invoice_items` | Facture créée, lignes non insérées | Facture vide avec un montant total mais aucun détail. Race condition sur `generateInvoiceNumber()`. |
| **invoices/update-invoice** | `invoices` + `invoice_items` (delete + re-insert) | Items supprimés, nouveaux non insérés | Facture vidée de ses lignes. |
| **invoices/delete-invoice** | `invoices` + `invoice_items` (cascade) | Cascade gérée par FK `ON DELETE CASCADE` | ✅ Pas de risque si FK cascade est active. |
| **checks/create-bank-check-deposit** | `check_deposits` → `checks` | Remise créée, chèques non rattachés | Remise avec montant mais sans chèques. |
| **checks/clear-check-deposit** | `check_deposits` → `bank_statement_lines` | Remise clearée, écriture bancaire non rapprochée | Incohérence entre pointage bancaire et remise de chèques. |
| **checks/delete-check-deposit** | `bank_statement_lines` → `checks` → `check_deposits` | Bank tx réinitialisée, remise non supprimée | Données de remise fantôme. |

### 🟢 Risque FAIBLE — Single-table ou idempotent

| Handler | Tables écrites | Justification |
|---|---|---|
| **bank/import-bank-statement** | `bank_statement_lines` (N inserts) | Single table. Duplicates gérées par UNIQUE sur `fitid`. Fallback non-transactionnel déjà implémenté. Import partiel acceptable. |
| **members/import-members-csv** | `seasons` → `members` | Upsert idempotent (`ON CONFLICT DO UPDATE`). Re-import corrige automatiquement un import partiel. |

## Analyse du test d'intégration demandé

Un test d'intégration contre D1 staging pour `shop/approve-order` n'est **pas réalisable dans l'immédiat** pour les raisons suivantes :

1. **`db.transaction()` lève `D1_ERROR` sur `BEGIN` avant même d'exécuter le callback** — il n'y a pas de "crash entre deux écritures" à simuler car la transaction ne démarre jamais sur D1 production.
2. Le vrai bug est **plus grave que prévu** : les handlers ne sont pas "non-atomiques", ils **ne fonctionnent pas du tout** sur D1 production (sauf `import-bank-statement` qui a le fallback).
3. La seule raison pour laquelle cela n'a pas été détecté est que l'application n'est pas en production et les tests tournent sur miniflare (SQLite local).

**Conclusion :** le test d'intégration staging ne ferait que confirmer le `D1_ERROR` sur `BEGIN`. L'information de diagnostic est complète sans lui.

## Options de remédiation

### Option A — `db.batch()` (RECOMMANDÉE)

**Principe :** Remplacer `db.transaction()` par `db.batch()` de Drizzle, qui utilise le D1 batch API atomique.

**Avantages :**
- Atomicité garantie par D1
- Support natif dans drizzle-orm@0.45.2 via `db.batch([query1, query2, ...])`
- Pas de changement d'infrastructure

**Contrainte majeure :** `batch()` ne permet pas d'utiliser le résultat d'une requête dans la suivante. Les handlers qui font `INSERT ... RETURNING id` puis utilisent cet `id` dans un `UPDATE` (6 sur 11) doivent être restructurés :
- Utiliser `last_insert_rowid()` dans le SQL
- Ou pré-générer les IDs (UUID) côté applicatif
- Ou restructurer pour que les dépendances soient résolues avant le batch

**Handlers nécessitant restructuration pour batch :**
| Handler | Dépendance inter-requêtes |
|---|---|
| shop/approve-order | `recipeTx.id` → `orders.ledgerEntryId` |
| checks/createCheck | `newTx.id` → `checks.ledgerEntryId` |
| checks/deleteCheck | lecture → décision → suppression |
| expenses/approveExpense | `tx.id` → `expenses.ledgerEntryId` |
| invoices/create-invoice | `invoice.id` → `invoice_items.invoiceId` |
| checks/createCheckDeposit | `deposit.id` → `checks.checkDepositId` |

### Option B — Compensation applicative

**Principe :** Exécuter les requêtes séquentiellement et implémenter un rollback applicatif en cas d'erreur (undo de chaque écriture).

**Avantages :**
- Pas de restructuration des handlers
- Garde la logique read-then-write

**Inconvénients :**
- Complexité élevée : chaque handler doit implémenter sa logique d'undo
- Pas réellement atomique : si le Worker crash pendant le undo, l'état reste incohérent
- Double code à maintenir (action + undo) pour chaque opération

**Écarté car :** fragilité inhérente, multiplication du code, et absence de garantie en cas de crash du Worker lui-même.

### Option C — Statu quo justifié

**Principe :** Accepter le risque, documenter, et ne corriger que si/quand l'application passe en production.

**Avantages :**
- Zéro effort maintenant

**Inconvénients :**
- Les 10 handlers sans fallback **crashent en production** sur `BEGIN`
- Ce n'est pas un risque d'incohérence, c'est une **impossibilité de fonctionner**

**Écarté car :** le problème n'est pas théorique — les handlers sont **cassés** sur D1 production. Le statu quo implique de ne jamais déployer les fonctionnalités comptables.

### Option D — Durable Objects

**Principe :** Déplacer la logique transactionnelle dans un Durable Object qui possède un SQLite local transactionnel.

**Avantages :**
- Transactions interactives complètes (ACID)
- SQLite local synchrone dans le DO

**Inconvénients :**
- Refactoring architectural majeur
- Changement de paradigme (DO = single-threaded, état sérialisé)
- Surcoût de complexité pour une application associative

**Écarté car :** disproportionné pour le cas d'usage actuel. À reconsidérer uniquement si les contraintes de batch sont bloquantes pour des besoins futurs complexes.

## Décision recommandée

**Option A — Migration vers `db.batch()`**, avec les adaptations suivantes :

1. **Phase 1 (bloquant pour la mise en production) :** Migrer les 8 handlers 🔴 CRITIQUES vers `db.batch()`
2. **Phase 2 :** Migrer les 6 handlers 🟡 MODÉRÉS
3. **Phase 3 :** Supprimer le Proxy transactionnel du harnais de test et utiliser le vrai `db.batch()` dans les tests

Pour les handlers avec dépendances inter-requêtes, la stratégie recommandée est :
- **Pré-lire** toutes les données nécessaires en amont du batch
- **Pré-calculer** les valeurs dérivées
- **Exécuter le batch** avec toutes les écritures en une seule fois

Quand une dépendance sur un ID auto-incrémenté est incontournable (ex : `INSERT invoice RETURNING id` → `INSERT invoice_items(invoice_id)`), utiliser la séquence de substitution :
```sql
-- Dans le batch, SQLite exécute séquentiellement
INSERT INTO invoices (...) VALUES (...);
INSERT INTO invoice_items (invoice_id, ...) VALUES (last_insert_rowid(), ...);
```

## Impact sur les prompts 9 et 13

Les prompts 9 et 13 prévoient des opérations multi-tables. **Ils doivent utiliser `db.batch()` dès le départ**, et non `db.transaction()`. Cette contrainte doit être intégrée dans leur spécification.

## Avertissement — Base de staging

> ⚠️ Aucun des 10 handlers transactionnels (hors `import-bank-statement`) ne fonctionne actuellement sur la base D1 de staging. Tout appel à ces endpoints en staging ou production lève un `D1_ERROR` sur l'instruction `BEGIN`.
