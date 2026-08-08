// Fichier généré automatiquement. Ne pas modifier manuellement.
export const HELP_DOCS = `
--- Article: acces-permissions.md ---
---
title: "Accès & Rôles"
description: "Gérer qui a le droit de se connecter et d'agir sur l'interface d'administration."
category: "admin"
order: 10
---

Le module **Accès & Rôles** contrôle qui peut ouvrir l'administration et ce que chacun peut y faire.

## Le principe : aucun droit par défaut

Un compte n'a accès qu'à ce qu'on lui a explicitement accordé. Créer un compte ne donne donc rien de plus que le tableau de bord et le centre d'aide : c'est en lui attribuant un **rôle** qu'on lui ouvre des rubriques.

## Les rôles

Un rôle correspond à une fonction réelle dans l'association. Vous pouvez en attribuer plusieurs à la même personne — une secrétaire qui assure aussi la trésorerie reçoit les deux rôles.

- **Membre** — Tableau de bord et centre d'aide uniquement. C'est le rôle par défaut.
- **Secrétaire** — Le fichier des adhérents (consultation, modification, import Poona), les attestations CSE, la communication (notifications) et le catalogue de la boutique. Consultation seule côté finances.
- **Trésorier·ère** — La comptabilité complète : grand livre, factures, rapprochement bancaire, chèques, exercices, budget et rapports. Les notes de frais, de la saisie au remboursement. L'encaissement des commandes.
- **Président·e** — La consultation de l'ensemble du club, les actes de gouvernance (ouverture et clôture d'exercice, vote du budget), la validation des notes de frais et des commandes, la communication, et la gestion des accès.
- **Super administrateur** — Tous les droits, y compris la configuration technique.

> [!NOTE]
> La présidence peut tout consulter mais ne saisit pas d'écriture comptable. C'est volontaire : le trésorier saisit, la présidence contrôle, et chaque écriture du grand livre reste attribuable à une seule personne. Si la même personne assure les deux fonctions, attribuez-lui les deux rôles.

## Attribuer un rôle

Depuis **Réglages → Accès & Rôles**, ajoutez la personne avec l'adresse e-mail qu'elle utilise pour se connecter, puis cochez ses rôles. La liste des droits accordés s'affiche juste en dessous : vérifiez-la avant d'enregistrer, elle dit exactement ce que la personne pourra faire.

> [!CAUTION]
> Ne donnez le rôle **Super administrateur** qu'aux personnes qui en ont réellement besoin. Il ouvre la configuration technique et permet de consulter l'application sous l'identité d'un autre compte.

## Retirer un accès

Supprimer un compte lui retire immédiatement l'accès. Un garde-fou empêche de supprimer — ou de rétrograder — le dernier super administrateur : sans lui, plus personne ne pourrait attribuer de rôle, et il faudrait une intervention technique pour rouvrir l'application.

## Consulter en tant qu'un autre compte

Un super administrateur peut consulter l'application sous l'identité d'un autre compte, pour reproduire ce qu'une personne voit quand elle signale un problème. Un bandeau orange rappelle en permanence sous quelle identité vous agissez. Cette fonction ne permet jamais d'obtenir plus de droits que les siens.

--- Article: attestations.md ---
---
title: "Attestations & Documents"
description: "Générer les documents légaux pour les adhérents."
category: "admin"
order: 14
---

Le menu **Réglages** permet notamment de gérer les documents administratifs de l'association.

## Attestations
Vous pouvez générer diverses attestations en lot ou à l'unité :
- **Reçus fiscaux (Cerfa)** : Pour les dons ou abandons de frais.
- **Attestations de paiement** : Utiles pour les comités d'entreprise des adhérents.

Ces documents reprennent automatiquement les informations de l'adhérent, de la saison en cours, et les données de paiement extraites du Grand Livre.


--- Article: boutique-commandes.md ---
---
title: "Boutique : Commandes"
description: "Préparer et délivrer les commandes de la boutique."
category: "boutique"
order: 8
---

La rubrique **Commandes** centralise les achats effectués en ligne ou sur place par les adhérents.

## Traiter une commande

Une nouvelle commande apparaît avec le statut **À préparer**.
1. Préparez les articles demandés (ex: Boîte de volants).
2. Lors du passage du membre au gymnase, remettez-lui sa commande.
3. Changez le statut de la commande en **Livrée**.

### Moyens de paiement
Si la commande n'a pas été payée en ligne via Wero ou Carte Bancaire, vous pourrez indiquer un paiement en espèces ou par chèque au moment de la remise.


--- Article: boutique-produits.md ---
---
title: "Boutique : Produits"
description: "Gérer le catalogue des produits en vente (maillots, volants, raquettes)."
category: "boutique"
order: 7
---

Le catalogue de la **Boutique** contient tous les articles mis en vente pour les adhérents.

## Ajouter un produit

Lors de l'ajout d'un produit, vous devez renseigner :
- **Le nom et la description**
- **Le prix de vente** (TTC)
- **Les variations** : Par exemple, pour un maillot, ajoutez les tailles (S, M, L, XL).
- **Le stock initial**

### Gestion des stocks
Dès qu'une commande est validée, le stock du produit diminue automatiquement. Si le stock tombe à 0, le produit s'affiche comme "Rupture de stock" sur la partie publique du site.


--- Article: caisse.md ---
---
title: "Gestion de la Caisse"
description: "Comment gérer les espèces (paiements, retraits, dépôts en banque)."
category: "comptabilite"
order: 4
---

La rubrique **Caisse** permet de suivre les mouvements d'espèces de l'association (billets et pièces).

## Enregistrer un mouvement de caisse
Tout paiement en espèces (ex: paiement d'une commande boutique, buvette) est enregistré dans le compte de trésorerie "Caisse".
Si vous déposez des espèces à la banque, vous devez effectuer une écriture de type **Transfert** :
- **Compte source** : Caisse
- **Compte de destination** : Compte Courant (Banque)

Le solde de la caisse virtuelle doit toujours refléter exactement l'argent liquide présent dans la caisse physique du club.


--- Article: categories-comptables.md ---
---
title: "Catégories Comptables"
description: "Faciliter la saisie grâce aux catégories."
category: "comptabilite"
order: 12
---

Pour simplifier la saisie comptable par les bénévoles, le club utilise des **Catégories Comptables** (ex: "Achat volants", "Paiement inscription").

## Fonctionnement d'une catégorie
Plutôt que de choisir un numéro de compte complexe, le bénévole choisit une catégorie.
En arrière-plan, chaque catégorie est liée à :
- **Une classe de compte Recette** (si l'argent entre)
- **Une classe de compte Dépense** (si l'argent sort)

La catégorie dispose également de deux noms :
- **Libellé Admin** : Affiché pour le bureau (ex: "Cotisations Adultes").
- **Libellé Adhérent** : Affiché publiquement (ex: "Votre inscription").
Il est aussi possible de cacher une catégorie dans les notes de frais si elle ne doit pas être utilisée pour un remboursement.


--- Article: categories-produits.md ---
---
title: "Catégories de Produits (Boutique)"
description: "Organiser les articles de la boutique et les lier à la comptabilité."
category: "boutique"
order: 13
---

La boutique permet de regrouper vos articles dans des **Catégories de Produits** (ex: Textiles, Raquettes, Volants).

## Lien direct avec la comptabilité
L'avantage principal est que chaque catégorie de produit est **obligatoirement liée à une catégorie comptable**.

Ainsi, lorsqu'une commande est validée et payée dans la boutique (ex: achat d'une raquette), l'écriture comptable est générée automatiquement dans le Grand Livre, affectée au bon compte (ex: Recette > Vente matériel), sans aucune double saisie !


--- Article: gestion-adherents.md ---
---
title: "Gestion des Adhérents"
description: "Comment rechercher, filtrer et gérer les membres de l'association."
category: "adherents"
order: 2
---

La rubrique **Adhérents** vous permet d'avoir une vision complète de tous les membres inscrits pour la saison.

## Liste des adhérents

La liste principale affiche les informations clés de chaque membre :
- Nom et Prénom
- Catégorie (Adulte, Jeune, Compétiteur)
- Statut du paiement (Payé, Partiel, En attente)
- Numéro de licence FFBad

### Rechercher et Filtrer
Utilisez la barre de recherche en haut pour trouver rapidement un membre par son nom. Vous pouvez également filtrer la liste par statut de paiement ou par pôle d'activité.

### Exporter les données
Un bouton "Exporter" est généralement disponible pour télécharger la liste sous format Excel/CSV pour vos envois d'emails ou pointages en salle.


--- Article: gestion-factures.md ---
---
title: "Gestion des Factures"
description: "Suivre les factures fournisseurs et les factures émises."
category: "comptabilite"
order: 5
---

La rubrique **Factures** permet de suivre tout ce que l'association doit payer, et ce qu'elle facture à des tiers.

## Les statuts d'une facture
Une facture passe généralement par trois états :
1. **Brouillon** : La facture est en cours de saisie.
2. **À payer / En attente** : La facture est validée et attend son règlement.
3. **Payée** : Le paiement a été effectué et rapproché avec la banque.

### Joindre un justificatif
Il est obligatoire de joindre un PDF ou une photo lisible pour chaque facture fournisseur. Cliquez sur "Ajouter une pièce jointe" lors de la saisie d'une nouvelle facture.


--- Article: gestion-saisons.md ---
---
title: "Gestion des Saisons"
description: "Créer, activer, clôturer et approuver les saisons."
category: "admin"
order: 9
---

La plateforme fonctionne par **Saisons** (ex: 2024-2025, 2025-2026). Chaque saison isole la comptabilité et les inscriptions.

## Cycle de vie d'une saison

1. **Création** : Vous définissez un code (ex: "24-25"), un nom, une date de début et de fin.
2. **Saison Active** : Une seule saison peut être marquée comme *Active*. C'est la saison par défaut sur laquelle arrivent les membres lors de leur connexion.
3. **Clôture** : Lorsque l'année est terminée, la saison est clôturée (\`closedAt\`). Plus aucune écriture comptable ne peut être ajoutée.
4. **Approbation** : Après l'Assemblée Générale, les comptes sont approuvés (\`approvedAt\`), figeant définitivement l'historique.


--- Article: grand-livre.md ---
---
title: "Grand Livre"
description: "Consulter toutes les écritures comptables enregistrées."
category: "comptabilite"
order: 4
---

Le **Grand Livre** est le registre officiel de toutes les transactions (écritures) de l'association.

## Comprendre une écriture comptable

Une écriture est toujours composée d'au moins deux lignes (principe de la partie double) :
- **Un compte de débit** (où va l'argent)
- **Un compte de crédit** (d'où vient l'argent)

### Consulter les transactions
Dans la liste, vous pouvez cliquer sur une ligne pour voir le détail de l'écriture (les comptes impactés, la date, la pièce justificative associée, et la personne ayant saisi l'opération).

> [!WARNING]
> La suppression d'une écriture comptable dans le Grand Livre est irréversible. Privilégiez la création d'une "écriture de contrepassation" (une ligne inverse) en cas d'erreur de saisie pour garder la trace comptable.


--- Article: notes-de-frais.md ---
---
title: "Notes de Frais"
description: "Rembourser les bénévoles pour leurs achats."
category: "comptabilite"
order: 6
---

Les **Notes de Frais** permettent de gérer les demandes de remboursement des bénévoles qui ont effectué des achats pour le compte de l'association.

## Processus de validation

1. **Soumission** : Le bénévole soumet sa note de frais avec le ticket de caisse en pièce jointe.
2. **Validation** : Le trésorier vérifie le montant et la nature de la dépense.
3. **Remboursement** : Le paiement est émis (généralement par virement bancaire).
4. **Comptabilisation** : Une fois payée, la note de frais génère automatiquement l'écriture dans le Grand Livre.

> [!TIP]
> Si vous ne souhaitez pas être remboursé mais faire un don à l'association (abandon de frais), précisez-le. L'association pourra vous éditer un reçu fiscal (Cerfa) en fin d'année.


--- Article: plan-comptable.md ---
---
title: "Plan Comptable"
description: "Comprendre les classes de comptes et les comptes."
category: "comptabilite"
order: 11
---

Le **Plan Comptable** définit l'architecture financière du club. Il est structuré en deux niveaux.

## Les Classes de Comptes
Chaque compte appartient à une classe définissant son type :
- **Recette** : L'argent qui entre (ex: Cotisations, Subventions).
- **Dépense** : L'argent qui sort (ex: Achats matériels, Frais bancaires).
- **Trésorerie** : Les comptes réels où est stocké l'argent (ex: Banque, Livret A, Caisse).

## Les Comptes
À l'intérieur des classes, on retrouve les comptes détaillés (avec leur code unique et libellé). Chaque écriture du Grand Livre est obligatoirement affectée à l'un de ces comptes.


--- Article: rapports-financiers.md ---
---
title: "Rapports Financiers"
description: "Consulter la santé financière et le bilan par pôle."
category: "comptabilite"
order: 3
---

Les **Rapports Financiers** offrent une analyse détaillée des flux de trésorerie de l'association.

## Bilan par Pôle

La comptabilité de l'association est analytique. Chaque dépense ou recette est affectée à un pôle :
1. **Événements** : Tournois, buvette, soirées du club.
2. **Jeunes** : Entraînements jeunes, volants spécifiques.
3. **Matériel** : Achat de volants adultes, poteaux, filets.
4. **Fonctionnement** : Frais bancaires, assurance, affiliation FFBad.

### Le graphique des dépenses/recettes
Un graphique vous permet de comparer visuellement les recettes et les dépenses pour s'assurer que l'association reste à l'équilibre. Vous pouvez survoler les barres du graphique pour voir le montant exact.


--- Article: remises-cheques.md ---
---
title: "Comment enregistrer et remettre des chèques ?"
description: "Gérer la réception des chèques et générer un bordereau pour la banque."
category: "comptabilite"
order: 2
---

La gestion des chèques se fait en deux étapes : l'enregistrement du chèque lors de sa réception, puis la création d'une "remise" (un groupe de chèques) pour les déposer physiquement à la banque.

## 1. Enregistrer la réception d'un chèque
Lorsqu'un adhérent ou un partenaire vous remet un chèque :
1. Allez dans **Comptabilité > Remises de chèques**.
2. Cliquez sur **Enregistrer un chèque**.
3. Remplissez les informations (Nom de l'émetteur, Montant, Banque, Numéro de chèque si souhaité).
4. Ce chèque est maintenant "En attente".

## 2. Générer le bordereau de remise
Quand vous avez accumulé plusieurs chèques et que vous souhaitez les déposer à la banque :
1. Allez dans **Comptabilité > Remises de chèques**.
2. Cliquez sur le bouton **Créer une remise de chèque**.
3. Sélectionnez tous les chèques que vous allez mettre dans l'enveloppe.
4. L'application va regrouper ces chèques et générer un bordereau PDF que vous pourrez imprimer, dater, signer et glisser dans l'enveloppe de dépôt.

## 3. Encaisser
Une fois que la remise apparaît sur votre relevé bancaire, vous n'aurez plus qu'à associer la ligne du relevé avec le bordereau de remise lors de votre prochain **Rapprochement bancaire**.


--- Article: soldes-initiaux.md ---
---
title: "Soldes Initiaux"
description: "Initialiser les soldes des comptes au début d'une nouvelle saison."
category: "comptabilite"
order: 5
---

La rubrique **Soldes Initiaux** vous permet de reporter l'argent restant de la saison précédente sur la nouvelle saison.

## Pourquoi initialiser les soldes ?
À l'ouverture d'une nouvelle saison comptable, il faut renseigner le solde de départ pour chaque compte (ex: Livret A, Compte Courant, Caisse). 

- Ce montant représente ce qui était présent sur le compte au dernier jour de la saison précédente.
- Cela permet que les rapports financiers et le rapprochement bancaire démarrent avec les bons montants.

Une fois validés, ces soldes servent de base à tous les calculs de trésorerie de la nouvelle saison.


--- Article: tableau-de-bord.md ---
---
title: "Tableau de Bord"
description: "Comprendre et utiliser le tableau de bord de l'association."
category: "admin"
order: 1
---

Le **Tableau de bord** est votre point d'entrée principal. Il regroupe toutes les statistiques importantes de la saison en cours pour Nozay Bad Association.

## Vue d'ensemble

Dès votre connexion, vous pouvez consulter :
- **Le nombre total d'adhérents** : comparé à la saison précédente.
- **Les tâches en attente** : factures à payer, chèques à encaisser, ou commandes boutique à préparer.
- **Le solde des différents pôles** : Événements, Jeunes, Matériel, et Fonctionnement.

### Comment changer de saison ?
En haut à droite de votre écran, un sélecteur vous permet de basculer entre les différentes saisons (ex: *24-25* à *25-26*). Toutes les statistiques du tableau de bord se mettront à jour instantanément pour refléter la saison choisie.


--- Article: valider-rapprochement.md ---
---
title: "Comment valider un rapprochement bancaire ?"
description: "Instructions pour importer, pointer et valider un rapprochement bancaire avec vos relevés."
category: "comptabilite"
order: 1
---

Le rapprochement bancaire consiste à vérifier que les opérations enregistrées dans la comptabilité du club correspondent bien aux opérations passées sur le compte en banque.

## 1. Importer le relevé
Dans l'onglet **Comptabilité > Rapprochement bancaire**, vous pouvez importer un fichier fourni par votre banque (formats acceptés : CSV, QIF).

## 2. Pointer les opérations
L'interface affichera d'un côté les transactions de la banque, et de l'autre les écritures comptables du club (adhésions, achats, etc.).
* Si une transaction correspond exactement à une écriture (même date, même montant), le système vous la proposera automatiquement.
* Cliquez sur **Associer** pour lier la ligne bancaire à la ligne comptable.

## 3. Valider le rapprochement
Une fois que toutes les lignes de votre relevé ont été associées à des écritures et que le solde final calculé correspond au solde réel de votre relevé papier ou PDF, vous pouvez cliquer sur **Valider le rapprochement**.

> ⚠️ Attention : Une fois validé, le rapprochement est scellé et les écritures correspondantes ne peuvent plus être modifiées ni supprimées pour garantir l'intégrité de la comptabilité.

`;

export const DB_SCHEMA = `
// Schema: accounting
export const seasonsTable = sqliteTable('seasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  closed_at: integer('closed_at', { mode: 'timestamp' }),
  approved_at: integer('approved_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});


export const accountClassesTable = sqliteTable('account_classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  type: text('type', { enum: ['recette', 'depense', 'tresorerie'] }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const accountsTable = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  account_class_id: integer('account_class_id').notNull().references(() => accountClassesTable.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const paymentMethodsTable = sqliteTable('payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  default_account_id: integer('default_account_id').notNull().references(() => accountsTable.id),
  default_entry_status: text('default_entry_status', { enum: ['cleared', 'in_vault', 'pending_debit'] }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  admin_label: text('admin_label').notNull(),
  adherent_label: text('adherent_label').notNull(),
  hide_in_expenses: integer('hide_in_expenses', { mode: 'boolean' }).notNull().default(false),
  receipt_account_class_id: integer('receipt_account_class_id').references(() => accountClassesTable.id),
  expense_account_class_id: integer('expense_account_class_id').references(() => accountClassesTable.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonBalancesTable = sqliteTable('season_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  initial_balance_cents: integer('initial_balance_cents').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  season_account_idx: uniqueIndex('season_account_idx').on(table.seasonId, table.accountId),
}));

export const bankStatementLinesTable = sqliteTable('bank_statement_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fitid: text('fitid').notNull().unique(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  amount_cents: integer('amount_cents').notNull(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  memo: text('memo'),
  status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
  ai_suggestions: text('ai_suggestions'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const checkDepositsTable = sqliteTable('check_deposits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  reference: text('reference').notNull().unique(),
  date: text('date').notNull(),
  amount_cents: integer('amount_cents').notNull(),
  status: text('status', { enum: ['pending', 'deposited', 'cleared'] }).notNull().default('pending'),
  bank_statement_line_id: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoicesTable = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_number: text('invoice_number').notNull().unique(),
  season_id: integer('season_id').notNull(),
  date: text('date').notNull(),
  due_date: text('due_date').notNull(),
  client_name: text('client_name').notNull(),
  client_address: text('client_address'),
  client_email: text('client_email'),
  subject: text('subject'),
  location: text('location'),
  period: text('period'),
  attendees: text('attendees'),
  status: text('status', { enum: ['draft', 'sent', 'paid', 'cancelled'] }).notNull().default('draft'),
  total_amount_cents: integer('total_amount_cents').notNull(),
  bank_statement_line_id: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoiceItemsTable = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_id: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unit_price_cents: integer('unit_price_cents').notNull(),
  total_price_cents: integer('total_price_cents').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ledgerEntriesTable = sqliteTable('ledger_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  destination_account_id: integer('destination_account_id').references(() => accountsTable.id),
  category_id: integer('category_id').references(() => categoriesTable.id),
  amount_cents: integer('amount_cents').notNull(),
  date: text('date').notNull(),
  payment_method_id: integer('payment_method_id').notNull().references(() => paymentMethodsTable.id),
  description: text('description').notNull(),
  reference: text('reference'),
  accrual_type: text('accrual_type', {
    enum: ['normal', 'produit_constate_avance', 'charge_constatee_avance', 'charge_a_payer', 'produit_a_recevoir']
  }).notNull().default('normal'),
  accrual_note: text('accrual_note'),
  member_id: integer('member_id'),
  bank_statement_line_id: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  invoice_id: integer('invoice_id').references(() => invoicesTable.id),
  status: text('status', { enum: ['pending_debit', 'in_vault', 'cleared'] }).notNull().default('cleared'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  ledger_entries_amount_cents_check: check('ledger_entries_amount_cents_check', sql\`\${table.amountCents} > 0\`),
  transfertCheck: check(
    'ledger_entries_transfert_check',
    sql\`(\${table.type} = 'transfert' AND \${table.destinationAccountId} IS NOT NULL AND \${table.destinationAccountId} <> \${table.accountId} AND \${table.categoryId} IS NULL) OR (\${table.type} <> 'transfert' AND \${table.destinationAccountId} IS NULL)\`
  )
}));

export const checksTable = sqliteTable('checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  check_deposit_id: integer('check_deposit_id').references(() => checkDepositsTable.id),
  season_id: integer('season_id').notNull(),
  number: text('number').notNull(),
  amount_cents: integer('amount_cents').notNull(),
  emitter: text('emitter').notNull(),
  bank: text('bank'),
  member_id: integer('member_id'),
  ledger_entry_id: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
  status: text('status', { enum: ['received', 'deposited'] }).notNull().default('received'),
  photo_url: text('photo_url'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonCategoryBudgetsTable = sqliteTable('season_category_budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  type: text('type', { enum: ['recette', 'depense'] }).notNull(),
  amount_cents: integer('amount_cents').notNull().default(0),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  season_category_idx: uniqueIndex('season_category_idx').on(table.seasonId, table.categoryId, table.type),
}));

// Schema: shop
export const productCategoriesTable = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  accounting_category_id: integer('accounting_category_id').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  product_category_id: integer('product_category_id').notNull().references(() => productCategoriesTable.id),
  price_cents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  track_stock: integer('track_stock', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  member_id: integer('member_id').notNull(),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  total_amount_cents: integer('total_amount_cents').notNull(),
  payment_method_id: integer('payment_method_id').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  paid_at: text('paid_at'),
  ledger_entry_id: integer('ledger_entry_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Schema: iam
export const adminUsersTable = sqliteTable('admin_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' })
});

// Rôles attribués à un compte d'administration. Les permissions qu'un rôle accorde
// sont définies en TypeScript (libs/domains/iam/shared/roles.ts), pas en base.
// Rôles : super_admin, president, tresorier, secretaire, membre.
export const adminUserRolesTable = sqliteTable('admin_user_roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => adminUsersTable.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Schema: members
export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'ca', 'member'] }).notNull().default('member'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const membersTable = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  season_id: integer('season_id').notNull(),
  last_name: text('last_name').notNull(),
  first_name: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birth_date: text('birth_date').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status', { enum: ['valide', 'suspendu', 'incomplet', 'en_attente'] }).notNull().default('valide'),
  type: text('type').notNull(),
  imported_at: integer('imported_at', { mode: 'timestamp' }).notNull(),
  amount_due_cents: integer('amount_due_cents').notNull().default(0),
  amount_received_cents: integer('amount_received_cents').notNull().default(0),
  amount_remaining_cents: integer('amount_remaining_cents').notNull().default(0),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
  parent1_name: text('parent1_name'),
  parent1_email: text('parent1_email'),
  parent1_phone: text('parent1_phone'),
  parent2_name: text('parent2_name'),
  parent2_email: text('parent2_email'),
  parent2_phone: text('parent2_phone')
}, (table) => ({
  members_licence_season_idx: uniqueIndex('members_licence_season_idx').on(table.licence, table.seasonId),
}));

// Configuration (singleton, id = 1) du modèle d'attestation CSE : identité du
// signataire et signature. La signature est stockée en base64 (TEXT) car le
// worker n'a pas \`nodejs_compat\` (pas de Buffer) et \`pdf-lib\` accepte le base64
// directement. Cap applicatif à l'upload pour rester sous la limite D1 (100 KB/SQL).
export const attestationConfigTable = sqliteTable('attestation_config', {
  id: integer('id').primaryKey(),
  signatory_name: text('signatory_name').notNull().default('Robert THAI'),
  signatory_email: text('signatory_email').notNull().default('president@nozaybad.fr'),
  website_url: text('website_url').notNull().default('www.nozaybad.fr'),
  signature_base64: text('signature_base64'),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull()
});
`;
