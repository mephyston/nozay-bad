# Spécification Technique : Attestations CSE & Module de Facturation

Ce document définit la conception technique et fonctionnelle pour l'ajout des attestations CSE et de la persistance/génération de factures au sein de l'application de gestion du club Nozay Badminton.

---

## 1. Modèle de Données (SQLite / Drizzle)

Deux nouvelles tables sont créées dans [`libs/shared/db/src/schema.ts`](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/schema.ts) :

### Table `invoices` (Factures)
```typescript
export const invoicesTable = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(), // Format: FAC-2526-NBA91-0001
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  date: text('date').notNull(), // Format YYYY-MM-DD
  dueDate: text('due_date').notNull(), // Format YYYY-MM-DD
  clientName: text('client_name').notNull(),
  clientAddress: text('client_address'),
  clientEmail: text('client_email'),
  
  // Champs spécifiques issus de vos modèles de factures réels
  subject: text('subject'),      // Objet de la facture (ex: "Stage Excellence n°5")
  location: text('location'),    // Lieu de l'activité (ex: "Châtenay-Malabry")
  period: text('period'),        // Dates / Période concernée (ex: "du 28 au 29 Avril 2026")
  attendees: text('attendees'),  // Personnes concernées (ex: "Julie Lecina")

  status: text('status', { enum: ['draft', 'sent', 'paid', 'cancelled'] }).notNull().default('draft'),
  totalAmount: integer('total_amount').notNull(), // TTC en centimes
  bankTransactionId: integer('bank_transaction_id').references(() => bankTransactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

### Table `invoice_items` (Lignes de facture)
```typescript
export const invoiceItemsTable = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(), // En centimes
  totalPrice: integer('total_price').notNull(), // En centimes (quantity * unitPrice)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

### Ajout dans `transactionsTable` (Lien Grand Livre)
Ajout d'une colonne optionnelle pour lier les écritures de recettes du Grand Livre à une facture émise :
```typescript
invoiceId: integer('invoice_id').references(() => invoicesTable.id)
```

---

## 2. API Routes & Endpoints (Hono)

Les endpoints suivants sont ajoutés dans [`apps/api/src/index.ts`](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :

### Factures (CRUD)
* `GET /invoices?season=<seasonId>` : Liste toutes les factures de la saison.
* `GET /invoices/:id` : Récupère les détails d'une facture et ses lignes d'articles.
* `POST /invoices` : Crée une facture.
  * **Numérotation automatique :** Recherche le numéro le plus élevé correspondant à `FAC-<saison>-NBA91-XXXX` pour la saison fournie (ex: `FAC-2526-NBA91-0004` $\rightarrow$ génère `FAC-2526-NBA91-0005`).
* `PUT /invoices/:id` : Modifie une facture (autorisé uniquement si le statut est `draft`).
* `DELETE /invoices/:id` : Supprime une facture (uniquement si `draft` ou `cancelled`).
* `POST /invoices/:id/status` : Modifie le statut de la facture (`sent`, `cancelled`).

### Rapprochement
* Mise à jour de `POST /bank-transactions/:id/reconcile` pour accepter le paramètre optionnel `invoiceId` :
  1. Crée une ligne dans `transactionsTable` avec `invoiceId`, la catégorie comptable adéquate, et le montant perçu.
  2. Modifie le statut de la facture associée à `paid`.
  3. Lie la ligne de relevé `bankTransactionsTable` via `bankTransactionId`.

### Attestation CSE
* `GET /members/:id/cse-data` : Retourne les informations validées d'adhésion pour le CSE.
  * **Règle métier :** Renvoie une erreur si `paid = false`.
  * **Informations fournies :** Nom, prénom, montant perçu, saison, et dates des transactions associées.

---

## 3. Interface Utilisateur (Svelte 5) & Pages de Print (Astro)

### A. Gestionnaire de Factures (`/admin/compta/invoices`)
* Interface principale Svelte 5 (`InvoicesManager.svelte`) avec :
  * Filtres par saison et statut.
  * Liste des factures émanant du club.
  * Formulaire de création / édition avec ajout de lignes dynamiques et saisie des informations spécifiques (Objet, Lieu, Dates, Personnes concernées).
  * Boutons d'action : Marquer comme envoyée, Annuler, Supprimer, et Imprimer.

### B. Ajout du Rapprochement de Facture
* Dans `BankStatementReconciliation.svelte` :
  * Ajout de l'onglet **« Associer à une Facture »**.
  * Permet de sélectionner une facture en attente de règlement (`sent` ou `draft`) et de valider son paiement par rapprochement bancaire direct.

### C. Fiches Adhérents (Attestations CSE)
* Ajout d'un bouton d'action **« Attestation CSE »** sur le profil adhérent ou dans la table des membres s'il a entièrement réglé sa cotisation (`paid = true`).

### D. Pages d'Impression "Print-Ready" (Astro)
Deux pages autonomes sans navigation, utilisant la règle CSS `@media print` pour masquer les boutons d'action (comme le bouton d'impression système) et optimiser les marges physiques. Les modèles reprennent fidèlement les logos, textes et coordonnées des fichiers fournis :
* `/admin/compta/invoices/[id].astro` (Modèle officiel de facture NBA91 basé sur `Facture modèle.docx`, avec IBAN Société Générale, BIC, conditions de règlement et exonération de TVA Art. 261-7-1° du CGI).
* `/admin/compta/attestations/[id].astro` (Reçu fiscal / Attestation de paiement officielle signée par Robert THAI basée sur `Attestation CE NBA 2025-2026.docx`).

### E. Archivage Google Drive
* L'archivage s'effectue via le dossier local Google Drive synchronisé sur le Mac du trésorier. Lors du clic sur « Imprimer », l'utilisateur choisit « Enregistrer au format PDF » et sélectionne son dossier local partagé Google Drive pour que l'application de bureau Google Drive synchronise le document sur le cloud.

---

## 4. Stratégie de Validation et de Tests (TDD)

### Tests Unitaires & Intégration API (`apps/api/src/index.test.ts`)
* Création et calcul correct de la numérotation séquentielle des factures.
* Blocage des écritures de factures clôturées/annulées.
* Rapprochement bancaire d'une facture (mise à jour du Grand Livre et transition de statut à `paid`).
* Autorisation et génération de l'attestation CSE uniquement si le membre a payé.

### Tests UI (`apps/admin-console/src/components`)
* Rendu correct d'un projet de facture avec calcul dynamique du total.
* Affichage de l'onglet de rapprochement par facture sur l'écran des relevés.
* Présence et déclenchement correct du bouton d'attestation CSE pour les membres éligibles.
