# Spécification Technique : Rapprochement IA & Suivi Adhérents (Milestone 3)

## 1. Objectif du projet
Optimiser le rapprochement des relevés bancaires en intégrant des suggestions automatiques basées sur le modèle de langage de Cloudflare **Workers AI** (Llama 3). Ce module résout les cas complexes (différences de prénoms/noms entre enfants et parents payeurs) et enrichit le schéma pour associer les transactions du Grand Livre aux fiches adhérents, permettant un suivi automatique des règlements.

---

## 2. Base de Données

Nous modifions les tables `members` et `transactions` pour intégrer les champs requis par Poona et les liaisons comptables, et ajoutons un champ de stockage des suggestions IA dans `bank_statement_lines`.

### Schéma Drizzle (`libs/shared/db/src/schema.ts`)
```typescript
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { seasonsTable, ledgerEntriesTable } from './schema';

// 1. Mise à jour de membersTable : ajout des informations financières de Poona et des contacts parents
export const membersTable = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  season: text('season').notNull().default('25-26').references(() => seasonsTable.id),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birthDate: text('birth_date').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status').notNull().default('valide'),
  type: text('type').notNull(),
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull(),
  
  // Nouveaux champs financiers de l'export Poona
  amountDue: integer('amount_due').notNull().default(0),       // "Montant" en centimes
  amountReceived: integer('amount_received').notNull().default(0), // "Montant reçu" en centimes
  amountRemaining: integer('amount_remaining').notNull().default(0), // "Montant restant" en centimes
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false), // "Payé" (Oui/Non)
  
  // Nouveaux champs contacts parents pour rapprochement IA
  parent1Name: text('parent1_name'),
  parent1Email: text('parent1_email'),
  parent1Phone: text('parent1_phone'),
  parent2Name: text('parent2_name'),
  parent2Email: text('parent2_email'),
  parent2Phone: text('parent2_phone')
}, (table) => ({
  licenceSeasonUnq: uniqueIndex('members_licence_season_idx').on(table.licence, table.season),
}));

// 2. Mise à jour de ledgerEntriesTable : ajout du lien vers l'adhérent
export const ledgerEntriesTable = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
  destinationAccountId: text('destination_account_id', { enum: ['current', 'savings', 'cash'] }),
  category: text('category'),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method', { 
    enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
  }).notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  
  // Nouveau lien optionnel vers l'adhérent
  memberId: integer('member_id').references(() => membersTable.id),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

// 3. Mise à jour de bankStatementLinesTable : ajout du stockage des suggestions IA
export const bankStatementLinesTable = sqliteTable('bank_statement_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fitid: text('fitid').notNull().unique(),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  memo: text('memo'),
  status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
  ledgerEntryId: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
  
  // Nouveau champ JSON stockant les suggestions d'imputation IA
  aiSuggestions: text('ai_suggestions'), // stocke { category: string, memberId: number, memberName: string, confidence: number }
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

---

## 3. API Back-end (Hono) & Cloudflare Workers AI

### A. Mise à jour de l'importateur Poona (`POST /members/import`)
Le script de parsing CSV est étendu pour mapper :
* `"Montant"` ➔ `amountDue` (converti en centimes)
* `"Montant reçu"` ➔ `amountReceived` (converti en centimes)
* `"Montant restant"` ➔ `amountRemaining` (converti en centimes)
* `"Payé"` ➔ `paid` (égal à true si "Oui", sinon false)
* `"Nom du contact 1"` ➔ `parent1Name`
* `"Email du contact 1"` ➔ `parent1Email`
* `"Tél. du contact 1"` ➔ `parent1Phone`
* `"Nom du contact 2"` ➔ `parent2Name`
* `"Email du contact 2"` ➔ `parent2Email`
* `"Tél. du contact 2"` ➔ `parent2Phone`

### B. Moteur de Rapprochement IA (`POST /bank-transactions/analyze`)
Cet endpoint parcourt les opérations bancaires en statut `'pending'` pour la saison active.

Pour chaque opération :
1. **Sélection des candidats (TS/D1)** :
   Le Worker lance une recherche rapide par jetons (tokens) sur le nom de l'opération dans `membersTable` pour retenir les 5 meilleurs profils d'adhérents (correspondance sur `lastName`, `firstName`, ou `parent1Name` / `parent2Name`).
2. **Workers AI (Llama 3)** :
   Si au moins un candidat est trouvé, nous interrogeons Workers AI (`@cf/meta/llama-3-8b-instruct`) avec un prompt ciblé :
   * **Entrée** : Le libellé bancaire (ex: *"VIR INST RE 651196118756 DE: MR FABIEN LE BLEVEC"*) et la liste des 5 candidats avec leurs détails (Noms, Prénoms, Parents, Montants attendus).
   * **Sortie attendue** : Un format JSON strict `{ memberId: number | null, category: string, confidence: number, reasoning: string }`.
3. **Mise à jour** : Les suggestions retournées sont enregistrées dans la colonne `aiSuggestions` de `bank_statement_lines`.

---

## 4. Améliorations de l'Interface Utilisateur (Astro & Svelte)

### A. Espace de Rapprochement
* Lors du chargement de la page de pointage, les suggestions IA sont récupérées et affichées sous forme de badges clairs sur les opérations de relevé.
* Dans le panneau d'action de droite, si l'IA propose une correspondance, elle affiche :
  * *« Suggestion IA (Confiance 95%) : Associer à **Maxime ABADIE** (Cotisation restante : 250 €) dans la catégorie **Adhésions** »*.
  * Un bouton **[Valider la suggestion IA]** exécute la liaison en un clic (crée la transaction liée au membre ou associe).
* Recherche manuelle : Un champ de recherche textuel permet de lier à n'importe quel adhérent si l'IA s'est trompée.

### B. Profil de l'Adhérent (`/admin/members/[licence]`)
* Ajout d'une section **« Suivi de Cotisation »** : affiche les montants Dû, Reçu et Restant ainsi que le statut payé.
* Liste les transactions du Grand Livre liées à cet adhérent.
