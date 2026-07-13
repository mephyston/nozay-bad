# Spécification Technique : Importation de Relevés Bancaires & Pointage (Milestone 2)

## 1. Objectif du projet
Permettre l'importation de fichiers de relevés bancaires au format **OFX** (Société Générale) et le rapprochement (pointage) semi-automatique avec les transactions du Grand Livre de la saison en cours. Ce module sert également de socle de données brutes pour le rapprochement par Intelligence Artificielle (Milestone 3).

---

## 2. Base de Données

Nous ajoutons une nouvelle table `bank_transactions` pour conserver les lignes de relevé importées de l'OFX.

### Schéma Drizzle (`libs/shared/db/src/schema.ts`)
```typescript
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { seasonsTable, transactionsTable } from './schema';

export const bankTransactionsTable = sqliteTable('bank_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Identifiant de transaction unique fourni par la banque (FITID)
  // Permet d'éviter les doublons d'opérations lors des imports répétés
  fitid: text('fitid').notNull().unique(),
  
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
  
  amount: integer('amount').notNull(), // en centimes (positif = crédit, négatif = débit)
  date: text('date').notNull(),        // Format YYYY-MM-DD
  name: text('name').notNull(),        // Libellé de l'opération
  memo: text('memo'),                  // Détails/Motif complémentaire
  
  status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
  
  // Clé étrangère vers la table transactions si rapproché
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

---

## 3. API Back-end (Hono - `apps/api/src/index.ts`)

### A. Parseur OFX (Société Générale)
Un utilitaire de parsing pour extraire les données d'un fichier OFX (SGML) :
* **Détection du compte** :
  * Si `<ACCTID>00050007847` ➔ `current` (Compte Courant)
  * Si `<ACCTID>00070007847` ➔ `savings` (Compte Livret)
* **Extraction des opérations** :
  Recherche des blocs `<STMTTRN> ... </STMTTRN>` et extraction de :
  * `<FITID>` ➔ Identifiant unique
  * `<TRNTYPE>` ➔ CREDIT ou DEBIT
  * `<TRNAMT>` ➔ Montant en chaîne (ex: `15.5` ou `-1464`), à convertir en centimes (entier).
  * `<DTPOSTED>` ➔ Date brute (ex: `20260216`), à convertir au format `YYYY-MM-DD`.
  * `<NAME>` ➔ Libellé principal.
  * `<MEMO>` ➔ Détails complémentaires.

### B. Endpoints de l'API

#### 1. `POST /bank-transactions/import`
* **Format** : `multipart/form-data` contenant le fichier OFX (`file`) et la saison (`seasonId`).
* **Traitement** :
  1. Parse le fichier OFX et extrait les opérations.
  2. Associe la saison (`seasonId`) à chaque opération.
  3. Insère les opérations en base en ignorant les doublons (`onConflictDoNothing()`).
* **Réponse** : `{ success: true, count: insertedCount }`

#### 2. `GET /bank-transactions`
* **Query Params** : `season` (requis), `status` (optionnel, par défaut `'pending'`), `accountId` (optionnel).
* **Réponse** : `{ success: true, data: BankTransaction[] }`

#### 3. `POST /bank-transactions/:id/reconcile`
* **Body** :
  * Mode association simple : `{ action: 'match', transactionId: number }`
  * Mode création et association : `{ action: 'create', transaction: { type, accountId, category, amount, date, paymentMethod, description, reference } }`
* **Traitement** :
  * Si `match` : Met à jour la table `bank_transactions` avec `status = 'reconciled'` et `transactionId`.
  * Si `create` : Insère la transaction dans le Grand Livre, puis met à jour `bank_transactions` avec `status = 'reconciled'` et `transactionId = newTx.id`.
* **Réponse** : `{ success: true }`

#### 4. `POST /bank-transactions/:id/ignore`
* **Traitement** : Met à jour la table `bank_transactions` avec `status = 'ignored'`.
* **Réponse** : `{ success: true }`

---

## 4. Interface Utilisateur (Astro & Svelte - `apps/admin-console`)

### A. Route `/admin/compta/import` (`apps/admin-console/src/pages/admin/compta/import.astro`)
* Route pour uploader les fichiers de relevé et afficher l'espace de rapprochement.
* Intercepte les requêtes POST pour relayer les actions vers l'API Hono D1.

### B. Composant `BankStatementReconciliation.svelte` (Svelte 5)
* **Écran d'Upload** (si aucune transaction bancaire en attente) :
  * Zone drag-and-drop pour importer un fichier OFX.
  * Sélection de la saison concernée.
* **Écran de Rapprochement (Split-Screen)** :
  * **Colonne de gauche** : Liste des transactions bancaires en attente (`pending`). Affiche la date, le libellé, le compte (courant/livret) et le montant.
  * **Panneau de droite (Contextuel)** :
    * Affiche le détail de la transaction sélectionnée.
    * **Suggestions automatiques** : Recherche des écritures du Grand Livre avec le même montant et à +/- 7 jours de la transaction bancaire. Affiche un bouton **[Lier]** à côté des écritures trouvées.
    * **Formulaire d'enregistrement** : Permet de créer directement l'écriture en sélectionnant une catégorie et un moyen de paiement, puis de la pointer d'un coup.
    * **Bouton Ignorer** : Permet d'écarter l'opération de la liste de rapprochement.
