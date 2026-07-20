# Rapport d'analyse des cas d'usage pour la migration VSA

Ce rapport présente l'inventaire complet de tous les cas d'usage (use cases) identifiés à partir des routes d'API actuelles de l'application, structurés par domaine métier. Il sert de plan de découpage pour la migration vers l'architecture par tranches verticales (**Vertical Slice Architecture**), conformément aux règles définies dans [01-principles.md](file:///Users/david/Lab/nozay-bad/docs/architecture/01-principles.md) et la checklist de [08-rules.md](file:///Users/david/Lab/nozay-bad/docs/architecture/08-rules.md).

---

## 1. Domaine : `accounting` (Comptabilité)

Ce domaine est le plus complexe et regroupe la gestion des écritures bancaires, des remises de chèques, de la configuration comptable, de la facturation, des saisons et des transactions du Grand Livre.

### 1.1. Sous-domaine : Relevés & Écritures Bancaires (`routes/bank.ts`)

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /` | Lister les écritures bancaires | `list-bank-transactions` | Récupère les écritures bancaires d'une saison avec filtres (statut, compte source). |
| `POST /import` | Importer un relevé bancaire | `import-bank-statement` | Analyse un fichier OFX (via `parseOFX`) et insère les écritures bancaires uniques (`onConflictDoNothing`) pour une saison et un compte donnés. |
| `POST /analyze` | Suggérer des rapprochements bancaires par IA | `suggest-reconciliation-ai` | **Logique complexe / IA :** Utilise Workers AI (Llama 3) pour suggérer des adhérents ou des catégories de rapprochement en s'appuyant sur l'historique et le catalogue de produits boutique. |
| `POST /reconcile-bulk` | Rapprocher des écritures bancaires en lot | `reconcile-bank-transactions-bulk` | Orchestre le rapprochement de plusieurs écritures en lot. Doit être transactionnel. |
| `POST /:id/reconcile` | Rapprocher une écriture bancaire | `reconcile-bank-transaction` | **Écritures multi-tables / Cross-domaine :** Crée ou associe des transactions dans le Grand Livre, change le statut de la facture si applicable, et appelle le domaine `members` (`applyPaymentToMember`) s'il s'agit d'une adhésion. Doit s'exécuter dans une transaction SQL. |
| `POST /:id/ignore` | Ignorer une écriture bancaire | `ignore-bank-transaction` | Passe le statut d'une écriture bancaire à `ignored`. |
| `POST /:id/unignore` | Rétablir une écriture bancaire | `unignore-bank-transaction` | Repasse le statut d'une écriture bancaire ignorée à `pending`. |

### 1.2. Sous-domaine : Chèques & Dépôts (`routes/checks.ts`)

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `POST /analyze` | Analyser un chèque par vision IA | `analyze-check-vision` | **IA Vision :** Utilise Workers AI Vision pour extraire le numéro de chèque, montant, émetteur, banque et date à partir d'une image. |
| `GET /` | Lister les chèques | `list-checks` | Récupère tous les chèques reçus pour une saison avec filtre sur le statut. Joint les informations de l'adhérent. |
| `POST /` | Enregistrer un chèque | `receive-check` | **Écritures multi-tables / Cross-domaine :** Insère une transaction de recette, crée le chèque au statut `received`, et applique le paiement sur l'adhérent s'il s'agit d'une cotisation (via le domaine `members`). Doit être transactionnel. |
| `DELETE /:id` | Supprimer un chèque | `delete-check` | **Écritures multi-tables / Cross-domaine :** Supprime le chèque et la transaction associée, et déduit le paiement de l'adhérent s'il y a lieu. Doit être transactionnel. |
| `POST /` (dépôts) | Créer une remise de chèques | `create-check-deposit` | Regroupe plusieurs chèques au statut `received` pour générer une remise de chèques au statut `deposited`. Doit être transactionnel. |
| `GET /` (dépôts) | Lister les remises de chèques | `list-check-deposits` | Récupère les remises de chèques d'une saison. |
| `POST /:id/clear` (dépôts) | Encaisser une remise de chèques | `clear-check-deposit` | Lie une remise de chèques à une écriture bancaire réelle et valide le rapprochement de celle-ci. |
| `POST /:id/delete` (dépôts) | Supprimer une remise de chèques | `delete-check-deposit` | Supprime une remise de chèques non encore validée, libère l'écriture bancaire liée et repasse les chèques associés au statut `received`. Doit être transactionnel. |

### 1.3. Sous-domaine : Facturation (`routes/invoices.ts`)

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /` | Lister les factures | `list-invoices` | Récupère la liste des factures pour une saison. |
| `GET /:id` | Consulter une facture | `get-invoice-detail` | Récupère les détails d'une facture et ses lignes d'articles. |
| `POST /` | Créer une facture | `create-invoice` | **Règle métier de génération :** Calcule le numéro séquentiel unique de facture `FAC-YYZZ-NBA91-XXXX` en fonction de la saison, crée la facture au statut `draft` et insère ses lignes. Doit être transactionnel. |
| `PUT /:id` | Modifier une facture | `update-invoice` | Met à jour les informations et écrase/recrée les lignes d'une facture au statut `draft` uniquement. Doit être transactionnel. |
| `DELETE /:id` | Supprimer une facture | `delete-invoice` | Supprime une facture uniquement si elle est au statut `draft` ou `cancelled`. |
| `POST /:id/status` | Modifier le statut d'une facture | `change-invoice-status` | Met à jour le statut d'une facture. |

### 1.4. Sous-domaine : Saisons & Budgets (`routes/seasons.ts`)

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /` | Lister les saisons | `list-seasons` | Récupère toutes les saisons enregistrées. |
| `POST /` | Créer une saison | `create-season` | Crée une saison et désactive l'ancienne si la nouvelle est marquée active. Doit être transactionnel. |
| `PUT /:id` | Modifier une saison | `update-season` | Met à jour le nom, l'état actif ou l'état de clôture d'une saison. |
| `POST /:id/close` | Clôturer une saison | `close-season` | Marque définitivement une saison comme clôturée (`closed: true`), empêchant les modifications ultérieures dans toute la comptabilité. |
| `GET /:seasonId/budget` | Consulter le budget d'une saison | `get-season-budget` | Récupère le budget prévisionnel de la saison. |
| `POST /:seasonId/budget` | Définir le budget d'une saison | `set-season-budget` | Met à jour ou écrase le budget prévisionnel d'une saison non clôturée. Doit être transactionnel. |
| `GET /:seasonId/balance` | Consulter le solde consolidé d'une saison | `get-season-consolidated-balance` | Calcule le solde total consolidé (courant + épargne + caisse) à la fin de la saison à partir des soldes initiaux et des transactions réelles. |
| `GET /:seasonId/balances` | Lister les soldes initiaux | `list-season-initial-balances` | Récupère les soldes initiaux par compte pour une saison donnée. |
| `POST /:seasonId/balances` | Définir les soldes initiaux | `set-season-initial-balances` | Enregistre ou met à jour les soldes de départ par compte pour une saison non clôturée. |
| `GET /:seasonId/reports` | Générer les rapports financiers | `generate-financial-reports` | Calcule le compte de résultat ventilé par catégorie comptable et le bilan de trésorerie (soldes initiaux vs finals). |

### 1.5. Sous-domaine : Grand Livre (`routes/transactions.ts`)

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /` | Lister les transactions | `list-transactions` | Récupère les transactions de Grand Livre avec des filtres multicritères (compte, type, catégorie, classe de compte, adhérent, chèques non pointés) et pagination. |
| `POST /` | Créer une transaction | `create-transaction` | Crée une transaction de recette, dépense ou transfert entre comptes. Valide que la catégorie est fournie (hors virements internes) et que la saison n'est pas clôturée. |
| `PUT /:id` | Modifier une transaction | `update-transaction` | Met à jour une transaction du Grand Livre si la saison d'origine et la saison cible ne sont pas clôturées. |
| `DELETE /:id` | Supprimer une transaction | `delete-transaction` | **Écritures multi-tables / Cross-domaine :** Supprime la transaction, met à jour l'écriture bancaire liée en `pending` si le seuil de pointage tombe, réajuste le montant reçu de l'adhérent s'il s'agissait d'une adhésion (via le domaine `members`), et repasse les notes de frais liées à l'état `pending`. Doit être transactionnel. |

### 1.6. Sous-domaine : Configuration & Référentiels (`routes/config.ts`)

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /categories` | Lister les catégories comptables | `list-categories` | Récupère la liste de toutes les catégories. |
| `POST /categories` | Créer une catégorie comptable | `create-category` | Enregistre une nouvelle catégorie avec ses codes comptables. |
| `PUT /categories/:id` | Modifier une catégorie comptable | `update-category` | Modifie une catégorie comptable existante. |
| `DELETE /categories/:id` | Supprimer une catégorie comptable | `delete-category` | Supprime une catégorie comptable existante. |
| `GET /account-classes` | Lister les classes de comptes | `list-account-classes` | Récupère la liste des classes de comptes. |
| `POST /account-classes` | Créer une classe de compte | `create-account-class` | Enregistre une nouvelle classe de compte. |
| `PUT /account-classes/:code` | Modifier une classe de compte | `update-account-class` | Modifie une classe de compte existante. |
| `DELETE /account-classes/:code` | Supprimer une classe de compte | `delete-account-class` | Supprime une classe de compte existante. |

---

## 2. Domaine : `expenses` (Notes de frais)

Le domaine des dépenses / notes de frais interagit avec le domaine `accounting` lors de l'approbation d'une dépense en créant une transaction de dépense dans le Grand Livre.

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /` | Lister les notes de frais | `list-expenses` | Récupère la liste des dépenses soumises avec des filtres par saison et statut. |
| `POST /` | Soumettre une note de frais | `submit-expense` | Soumet une nouvelle note de frais au statut `pending` (interdit si saison clôturée). |
| `POST /:id/approve` | Approuver une note de frais | `approve-expense` | **Écritures multi-tables / Cross-domaine :** Crée une transaction de dépense de type 'recette'/'depense' dans le Grand Livre de `accounting`, et met à jour la note de frais avec le statut `approved` et le lien vers la transaction créée. Doit être transactionnel. |
| `POST /:id/reject` | Rejeter une note de frais | `reject-expense` | Passe le statut de la note de frais à `rejected`. |
| `POST /:id/cancel` | Annuler le traitement d'une note de frais | `cancel-expense-approval` | **Écritures multi-tables / Cross-domaine :** Coupe le lien avec la transaction, supprime la transaction associée du Grand Livre de `accounting` (et repasse l'écriture bancaire liée à `pending` si elle était rapprochée), et remet le statut de la note de frais à `pending`. Doit être transactionnel. |
| `PUT /:id` | Modifier une note de frais | `update-expense` | Met à jour les détails d'une note de frais (description, montant, catégorie, etc.) si la saison actuelle et la saison cible ne sont pas clôturées. |

---

## 3. Domaine : `members` (Adhérents)

Ce domaine est propriétaire de la gestion des adhérents et des saisons (en tant que table canonique). Il fournit des API publiques permettant à d'autres domaines d'enregistrer des règlements de cotisation.

| Route Actuelle / API | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `POST /import` | Importer les adhérents via CSV | `import-members-csv` | **Logique complexe :** Analyse un fichier CSV d'adhérents (provenant de Poona), gère les normalisations complexes (Sexe, Date de naissance, Statut) et insère ou met à jour les adhérents en lot (`onConflictDoUpdate`). Crée automatiquement les saisons non existantes. |
| `GET /` | Lister les adhérents | `list-members` | Récupère les adhérents paginés avec moteur de recherche textuelle et filtres (saison, genre, tarif, payé, etc.). |
| `GET /:licence` | Consulter un adhérent par sa licence | `get-member-by-licence` | Récupère la fiche détaillée d'un adhérent en fonction de son numéro de licence unique et de la saison. |
| `GET /:id/cse-data` | Générer l'attestation CSE d'un adhérent | `get-member-cse-data` | **Cross-domaine read :** Génère les données nécessaires pour le CSE (uniquement si la cotisation est payée à 100%) en allant chercher la dernière transaction de recette associée à ce membre dans `accounting`. |
| **API Publique** (in-process) | Appliquer un paiement à un adhérent | `apply-payment` | **Invariant Métier :** Calcule le nouveau montant reçu, le restant dû, et bascule l'état `paid` à `true` si le solde restant est nul. Appelé par `accounting` lors du rapprochement bancaire ou de l'enregistrement de chèque. |

---

## 4. Domaine : `shop` (Boutique)

Le domaine de la boutique permet de gérer les produits de la boutique du club et les commandes passées par les adhérents. Il interagit avec le domaine `accounting` lors de la validation des commandes en créant une transaction de recette pour le club.

### 4.1. Gestion des Produits

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /products` | Lister les produits de la boutique | `list-products` | Récupère la liste des articles en vente dans la boutique (filtrables par catégorie, actif). |
| `POST /products` | Créer un produit | `create-product` | Ajoute un nouveau produit dans la boutique (nom, catégorie, prix, stock, statut). |
| `PUT /products/:id` | Modifier un produit | `update-product` | Met à jour les caractéristiques d'un produit (prix, stock, actif, etc.). |

### 4.2. Gestion des Commandes

| Route Actuelle | Cas d'Usage Cible | Tranche Cible | Description & Invariants Métier |
| :--- | :--- | :--- | :--- |
| `GET /orders` | Lister les commandes de la boutique | `list-orders` | **Cross-domaine read :** Récupère les commandes d'une saison et joint les informations de l'adhérent (depuis `members`) et du produit pour affichage. |
| `POST /orders` | Passer une commande | `create-order` | Soumet une commande de produit pour un adhérent (vérifie que la saison n'est pas clôturée et calcule le prix total de la commande). |
| `POST /orders/:id/approve` | Approuver une commande | `approve-order` | **Écritures multi-tables / Cross-domaine :** Récupère la commande, vérifie le produit et l'adhérent. Trouve la catégorie comptable 'Boutique' dans `accounting`, insère une transaction de recette dans le Grand Livre liée à l'adhérent, et passe la commande à `approved` avec verrouillage optimiste. Doit être transactionnel. |
| `POST /orders/:id/reject` | Rejeter une commande | `reject-order` | Passe le statut d'une commande en attente à `rejected` (verrouillage optimiste). |
