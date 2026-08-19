# Spécification Technique : Rapprochement Bancaire de Masse, Rapprochement Groupé (Multi-match) et Ventilation

Ce document décrit le design et les spécifications techniques pour l'amélioration de l'interface de rapprochement bancaire dans la console d'administration de Nozay Badminton Association.

## 1. Objectifs
* **Rapprochement de masse :** Faciliter le traitement rapide des opérations évidentes (suggestions fiables) et répétitives.
* **Rapprochement groupé (Multi-match) :** Permettre d'associer une transaction bancaire unique (virement) à plusieurs commandes en attente (Boutique) ou factures.
* **Ventilation manuelle (Split) :** Offrir la possibilité d'éclater une transaction bancaire en plusieurs lignes d'écriture dans le Grand Livre (ex: répartir un paiement entre cordages et volants).
* **Robustesse :** Maintenir la sécurité comptable (saisons clôturées) et la cohérence de la base de données.

---

## 2. Interface Utilisateur (UX)

### A. Onglets de filtrage rapide (Liste des transactions)
Au-dessus de la liste des transactions bancaires à gauche, nous ajouterons trois onglets de sélection :
1. **Toutes :** Affiche toutes les transactions en attente.
2. **Correspondances :** Affiche uniquement les transactions ayant une suggestion automatique à 100% fiable (ex. montant identique et description ressemblante).
3. **Récurrentes :** Regroupe les transactions par motifs récurrents (ex. tous les débits contenant "SALAIRE" ou "LARDESPORT").

### B. Actions en masse (Bulk Actions)
* Des **cases à cocher** sont insérées à gauche de chaque transaction dans la liste.
* Une **barre d'action groupée** collante s'affiche en haut de la liste dès qu'une ou plusieurs cases sont cochées :
  * **"Rapprocher en masse (X)" :** Exécute automatiquement le rapprochement pour toutes les transactions sélectionnées disposant d'une suggestion fiable.
  * **"Ignorer en masse (X)" :** Passe le statut de toutes les transactions cochées à `ignored` en base.
  * **"Sélectionner tout" :** Coche toutes les lignes actuellement filtrées.

### C. Panier de commandes / Multi-match (Détail droite)
Dans le panneau de droite de la transaction active, l'onglet **"Panier Commande"** est amélioré :
* Il affiche la liste de toutes les factures impayées et commandes boutique en attente avec des cases à cocher.
* Un indicateur en temps réel calcule la somme des éléments cochés : `Somme sélectionnée / Montant du virement`.
* Le bouton de validation reste verrouillé tant que la somme sélectionnée ne correspond pas exactement au montant de la transaction bancaire (à une tolérance de 10 centimes près).
* Lors de la validation, toutes les commandes/factures cochées sont associées au virement.

### D. Ventilation manuelle (Split)
Dans l'onglet **"Saisir écriture"** du volet de droite :
* Ajout d'un bouton **"Ventiler l'opération"**.
* Cliquer sur ce bouton permet d'ajouter des lignes de ventilation supplémentaires (champs Catégorie et Montant).
* Un indicateur affiche le montant restant à affecter. La validation n'est possible que si la somme des ventilations est égale au montant global de l'opération bancaire.

---

## 3. Architecture Technique & APIs

### A. Base de données
Le schéma de la base de données actuel est déjà compatible avec le multi-match et la ventilation :
* `ledgerEntriesTable` (Grand Livre) contient `bankStatementLineId` (plusieurs écritures peuvent référencer le même virement).
* `invoicesTable` contient `bankStatementLineId`.
* `ordersTable` contient `bankStatementLineId`.

### B. Endpoints API Hono
Nous allons implémenter ou mettre à jour les routes suivantes dans `apps/api/src/index.ts` :

1. **Rapprochement groupé (Multi-match) :**
   * Mettre à jour `POST /bank-transactions/:id/reconcile` (action `'create'`) pour accepter un tableau de `invoiceIds` et/ou `orderIds` au lieu d'un seul identifiant.
   * En base, le serveur associera le `bankStatementLineId` à toutes les factures et commandes spécifiées, passera leur statut à `'paid'`, et créera autant d'écritures dans le Grand Livre que de commandes/factures associées pour assurer la traçabilité.

2. **Rapprochement en masse (Bulk) :**
   * Créer la route `POST /bank-transactions/reconcile-bulk`.
   * Reçoit un tableau de requêtes de rapprochement : `[{ btId, action: 'match'|'create', invoiceId?, ledgerEntryId?, ... }]`.
   * Traite l'ensemble des opérations dans une **transaction de base de données** unique pour garantir l'atomicité.

3. **Ventilation manuelle :**
   * Mettre à jour `POST /bank-transactions/:id/reconcile` (action `'create'`) pour accepter un tableau d'écritures `transactions: Array<{ category, amount, description }>` afin d'enregistrer plusieurs lignes de Grand Livre liées au même virement.

---

## 4. Stratégie de Test

* **Tests d'intégration API (`apps/api/src/index.test.ts`) :**
  * Valider que `POST /bank-transactions/reconcile-bulk` applique correctement les rapprochements et échoue proprement si l'une des saisons est clôturée.
  * Valider le multi-match (un virement de 50 € associé à deux factures de 25 €).
  * Valider la ventilation (un virement de 50 € ventilé sur deux catégories).
* **Tests Unitaires Frontend (`apps/admin-console/src/components/BankStatementReconciliation.test.ts`) :**
  * Valider l'affichage de la barre d'action groupée lors du clic sur les cases à cocher.
  * Valider le calcul du montant total dans l'onglet panier de commandes.
