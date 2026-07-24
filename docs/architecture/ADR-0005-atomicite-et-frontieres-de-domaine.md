# ADR-0005 — Pattern de migration batch (Read-Decide-Write) et gestion de l'atomicité inter-domaines sur Cloudflare D1

**Statut :** Validé  
**Date :** 2026-07-24  
**Conditionne :** Migration des 11 handlers vers `db.batch()`

---

## 1. Contexte & Problématique

L'ADR-0002 et la vérification empirique réalisée lors du Prompt B1 ont confirmé que `db.transaction()` lève systématiquement l'erreur `Failed query: begin` sur Cloudflare Workers D1 en production. Cloudflare D1 ne supportant pas les transactions SQL interactives (`BEGIN` / `COMMIT` / `ROLLBACK`), **la seule primitive d'écriture atomique mise à disposition par Cloudflare D1 est `db.batch([])`**.

Cependant, `db.batch()` diffère fondamentalement de `db.transaction()` :
- **`db.transaction()`** : permettait d'entrelacer des lectures et des écritures dynamiques au sein de la même transaction JS.
- **`db.batch()`** : prend un tableau fixe de requêtes SQL préparées (`BatchItem[]`), émises en un seul aller-retour réseau et exécutées de façon atomique par D1. **Aucune lecture applicative ne peut être intercalée au milieu du lot.**

Or, les 11 handlers identifiés entrelacent tous des lectures et des écritures (ex: *reconcile-bank-statement-line* effectue 6 lectures et 2 écritures ; *expenses/update* effectue 7 lectures et 3 écritures).

De plus, l'architecture du monorepo impose des frontières strictes entre domaines Bounded Contexts (standards NX et VSA). La migration des 11 handlers vers `db.batch()` soulève deux questions majeures :
1. **Question 1** : Comment restructurer les handlers pour éliminer les I/O intercalées, gérer les dépendances de clés primaires parents/enfants et vérifier les verrous optimistes au sein d'un lot unique ?
2. **Question 2** : Comment préserver l'atomicité transactionnelle lors d'opérations modifiant plusieurs domaines (ex: validation de commande boutique, approbation de note de frais, remise de chèques) sans détruire l'isolation des Bounded Contexts ?

---

## 2. Question 1 — Le motif de restructuration (Pattern Read-Decide-Write)

### 2.1 Le motif à 3 phases
Tous les handlers migrés doivent obligatoirement adopter un découpage strict en 3 phases :

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1 : LECTURE (Read - Asynchrone, hors lot D1)     │
│ Charger toutes les données nécessaires (saisons,      │
│ membres, catégories, entités existantes).              │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 2 : DÉCISION (Decide - En mémoire, synchrone)     │
│ Valider les règles métier, exécuter les calculs        │
│ monétaires, construire le tableau BatchItem[].          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3 : ÉCRITURE (Write - Lot unique db.batch)        │
│ Soumettre le tableau BatchItem[] en un appel unique     │
│ et atomique à Cloudflare D1.                            │
└─────────────────────────────────────────────────────────┘
```

1. **Phase 1 : Lecture (Read)** — Hors batch, I/O asynchrones (`SELECT`). Récupération de toutes les entités, vérification d'existence, état des saisons et contrôles de pré-requis via des requêtes parallèles ou séquentielles (`repo.getById`, `isSeasonClosed`, etc.).
2. **Phase 2 : Décision (Decide)** — En mémoire, purement synchrone. Validation des règles métier, calculs financiers (en centimes), construction des objets DTO et préparation du tableau d'instructions Drizzle (`BatchItem[]`).
3. **Phase 3 : Écriture (Write Batch)** — Exécution unique et atomique via `db.batch([stmt1, stmt2, ...])`.

---

### 2.2 Dépendances intra-batch (Clés primaires parents / enfants)

Pour les opérations de création parent-enfant comme `create-invoice` (insertion de la facture puis insertion des $N$ lignes de facture référençant `invoice_id`), nous avons évalué 4 stratégies :

#### Option A : `(SELECT last_insert_rowid())` dans une sous-requête SQL *(RETENUE & VALIDÉE EMPIRIQUEMENT)*
- **Vérification empirique** : Validée avec 100% de succès sur Cloudflare D1.
- En SQLite / D1, SQLite conserve le `last_insert_rowid()` d'une instruction à l'autre au sein de la même transaction de lot.
- La première instruction du batch insère la facture parente :
  ```ts
  const insertInvoiceStmt = db.insert(invoicesTable).values({ ... });
  ```
- La seconde instruction insère les lignes enfants en référençant la sous-requête Drizzle :
  ```ts
  const insertItemStmt = db.insert(invoiceItemsTable).values({
    invoiceId: sql`(SELECT last_insert_rowid())`,
    description: item.description,
    unitPriceCents: item.unitPriceCents,
    totalPriceCents: item.totalPriceCents,
    createdAt: now
  });
  ```
- **Avantage** : **Atomicité 100% garantie dans un seul `db.batch()`**, aucune modification de schéma nécessaire, zéro aller-retour réseau supplémentaire.

#### Option B : Multiple `db.batch()` avec `INSERT ... RETURNING` *(ÉCARTÉE)*
- Exécuter un premier batch pour le parent, récupérer l'ID inséré, puis lancer un second batch pour les enfants.
- **Raison du rejet** : Perte de l'atomicité. Si le second batch échoue (ex: déconnexion réseau), le parent reste créé sans ses enfants (facture vide sans lignes).

#### Option C : UUIDs générés côté client / applicatif *(ÉCARTÉE)*
- Utiliser des UUIDv4/v7 textuels comme clés primaires.
- **Raison du rejet** : Nécessiterait de modifier les schémas Drizzle et les tables SQLite d'auto-incrément vers TEXT. Impact lourd non justifié alors que l'Option A fonctionne nativement.

#### Option D : Étapes idempotentes compensatoires *(ÉCARTÉE POUR LE SYNCHRONE)*
- Réservée aux traitements asynchrones ou en arrière-plan.

---

### 2.3 Verrou optimiste au sein d'un lot (`approveWithLock`)

Dans des opérations comme `shop/approve-order`, la commande est mise à jour avec une clause conditionnelle :
`UPDATE orders SET status = 'approved', ledger_entry_id = ? WHERE id = ? AND status = 'pending'`

Dans `db.batch([stmtInsertLedger, stmtUpdateOrder])` :
- D1 retourne un tableau de résultats `BatchResult[]`.
- Chaque élément du tableau contient les métadonnées de l'instruction (`meta.changes` ou `meta.rows_affected`).
- **Détection de conflit concurrent** : Si `batchRes[1].meta.changes === 0`, cela signifie que le verrou optimiste a échoué (la commande avait déjà été modifiée/approuvée par une autre requête).
- En cas d'échec du verrou optimiste dans le résultat du batch, le handler lève l'exception `ConcurrentModificationError`.

---

### 2.4 Traitement des traitements en volume (Bulk processing) & Limites D1

Pour les traitements de masse (`reconcile-bulk`, `import-bank-statement`) :
- **Limites D1** : Cloudflare D1 limite chaque appel `db.batch()` à **100 statements maximum** et une taille de charge utile de 10 MB.
- **Stratégie de lotissement borné (Bounded Batching)** :
  - Découpage des gros volumes en lots de **50 instructions maximum**.
  - Chaque lot doit être **individuellement idempotent** (ex: `INSERT OR IGNORE` via contrainte `UNIQUE(fitid)` pour le relevé bancaire).

---

## 3. Question 2 — La frontière inter-domaines

Lors d'une opération modifiant des entités appartenant à des Bounded Contexts différents (ex: `shop/approve-order` écrivant dans `ledger_entries` [Accounting] et `orders` [Shop]), deux principes s'affrontent :
1. **L'Atomicité physique** : Nécessite que les instructions SQL soient soumises dans le même tableau `db.batch([])`.
2. **L'Isolation des domaines** : Interdit à un domaine (ex: `shop`) d'importer directement `ledgerEntriesTable` pour construire du SQL ou de contourner les méthodes métier de l'API de domaine (`@nba/accounting-api`).

---

### 3.1 Évaluation des options

#### Option A : Usine de Statements de domaine (`buildStatement` / `prepareBatchItem`) — *(OPTION RETENUE & RECOMMANDÉE)*
- Le domaine propriétaire (`accounting`) exporte via son API publique une fonction factory produisant un statement Drizzle non exécuté :
  ```ts
  // Expose dans @nba/accounting-api
  export function buildCreateRevenueLedgerEntryStatement(db: Db, params: CreateRevenueLedgerEntryInput): BatchItem
  ```
- Le domaine appelant (`shop`) appelle cette factory pour obtenir l'instruction SQL préparée par le domaine propriétaire, puis assemble son batch :
  ```ts
  const stmt1 = buildCreateRevenueLedgerEntryStatement(db, params);
  const stmt2 = repo.buildApproveOrderStatement(db, orderId, ledgerEntryId);
  const [res1, res2] = await db.batch([stmt1, stmt2]);
  ```
- **Analyse de la frontière de domaine** :
  - *L'instruction SQL/Drizzle traverse-t-elle la frontière ?* Oui, mais en tant qu'objet opaque de type `BatchItem` (infrastructure partagée Drizzle/Db au même titre que `DbOrTx`).
  - *Avantages* : **Atomicité D1 100% garantie**, la logique d'insertion et le schéma de `ledger_entries` restent **strictement encapsulés dans le domaine `accounting`**, aucune fuite de structure de table.

#### Option B : Multi-étapes idempotentes avec compensation *(ÉCARTÉE POUR LES APPELS REQUÊTE/RÉPONSE)*
- Exécution séparée de l'API accounting, puis mise à jour de la commande. En cas d'échec, retry ou job de réconciliation.
- **Raison du rejet** : Complexité excessive pour des opérations synchrones et risque de données orphelines visibles par les utilisateurs avant réconciliation.

#### Option C : Bascule de la propriété du cas d'usage vers Accounting *(ÉCARTÉE)*
- Déplacer l'orchestration de `approveOrder` dans le domaine `accounting`.
- **Raison du rejet** : Viole la cohérence fonctionnelle du domaine `shop` qui est le véritable propriétaire du cycle de vie des commandes.

#### Option D : Collecteur d'Unité de Travail (Unit of Work / BatchAccumulator) *(ÉCARTÉE)*
- Instanciation d'un objet `batchCollector.add(stmt)` transmis à travers les services.
- **Raison du rejet** : Introduit un état mutable partagé complexe sans valeur ajoutée par rapport à l'Option A.

---

## 4. Ordre et feuille de route de migration des 11 Handlers

La migration s'effectuera par vagues selon le niveau de risque et de complexité :

| Vague | Handlers | Domaine | Justification |
| :--- | :--- | :--- | :--- |
| **Vague 1** | `invoices/create-invoice`, `invoices/update-invoice` | Accounting | Domaine unique, validation du motif `(SELECT last_insert_rowid())` |
| **Vague 2** | `shop/approve-order` | Shop / Accounting | Premier cas inter-domaines avec `buildStatement` |
| **Vague 3** | `checks/record-check-ledger-entry`, `checks/create-bank-check-deposit`, `checks/clear-check-deposit`, `checks/delete-check-deposit` | Accounting | Traitement des chèques et remises bancaires |
| **Vague 4** | `expenses/update` (`approveExpense`, `cancelExpenseApproval`) | Expenses / Accounting | Notes de frais et écritures de régularisation |
| **Vague 5** | `bank/reconcile-bank-statement-line`, `bank/reconcile-bulk`, `ledger/delete-ledger-entry` | Accounting | Rapprochement bancaire complexe & bulk processing |

---

## 5. Bilan & Décisions

1. **Pattern unique** : Tous les handlers adoptent le motif `Read-Decide-Write` (3 phases).
2. **Dépendance d'ID parent** : Résolue par sous-requête `(SELECT last_insert_rowid())` dans `db.batch()`.
3. **Verrou optimiste** : Vérification du nombre de lignes modifiées (`meta.changes`) après exécution du batch.
4. **Frontière inter-domaines** : Chaque domaine Bounded Context expose des fonctions `build*Statement(db, params)` retournant un `BatchItem` opaque pour permettre à l'orchestrateur d'assembler un lot atomique unique.
