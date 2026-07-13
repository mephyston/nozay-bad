# Spécification Technique : Grand Livre Simple Flux & Rapports AG (Sous-Projet 1)

Ce document décrit les spécifications techniques et l'architecture pour le module de comptabilité simple flux et la génération de rapports pour l'Assemblée Générale (AG).

---

## 1. Modélisation de la Base de Données

Nous modélisons les flux financiers de l'association répartis sur 3 comptes :
* **Compte Courant** (`current`)
* **Compte Livret** (`savings`)
* **Caisse Physique** (`cash`)

### Table `season_balances` (Soldes Initiaux de Début de Saison)
Cette table stocke les soldes d'ouverture de chaque compte au 1er septembre pour une saison donnée.
* `id` : `integer` (Clé primaire autoincrémentée)
* `season_id` : `text` (Référence vers `seasons.id`)
* `account_id` : `text` (Type de compte : `current` | `savings` | `cash`)
* `initial_balance` : `integer` (Montant en centimes, non nul)
* `created_at` : `integer` (Date de création, mode timestamp)
* **Index unique** : `(season_id, account_id)`

### Table `transactions` (Grand Livre)
Cette table enregistre toutes les recettes, dépenses et virements internes.
* `id` : `integer` (Clé primaire autoincrémentée)
* `season_id` : `text` (Référence vers `seasons.id`)
* `type` : `text` (Type : `recette` | `depense` | `transfert`)
* `account_id` : `text` (Compte source ou récepteur, obligatoire : `current` | `savings` | `cash`)
* `destination_account_id` : `text` (Compte destinataire, obligatoire pour un `transfert` uniquement)
* `category` : `text` (Catégorie, obligatoire pour `recette`/`depense`, nulle pour `transfert`)
* `amount` : `integer` (Montant en centimes, strictement positif)
* `date` : `text` (Date de transaction au format `YYYY-MM-DD`)
* `payment_method` : `text` (Moyen de paiement : `virement` | `cheque` | `especes` | `labaz` | `ancv` | `pass_sport` | `ticket_loisir` | `up_loisir`)
* `description` : `text` (Motif de l'opération)
* `reference` : `text` (Facultatif, numéro de chèque ou libellé de virement)
* `created_at` : `integer` (Mode timestamp)

---

## 2. Liste des Catégories Standards

Les catégories sont fixes afin d'assurer la cohérence des comptes de résultat saison après saison :

### Recettes (Revenues)
* `adhesions` : Cotisations des membres
* `partenariats` : Sponsoring, mécénat et partenariats privés
* `subventions` : Aides de la ville, de la ligue, de la FFBad ou de l'État
* `buvette` : Ventes lors de la buvette
* `boutique` : Ventes de volants et cordages aux adhérents
* `evenements` : Frais d'inscriptions aux tournois du club, actions jeunes, etc.
* `stages` : Participations financières aux stages sportifs du club
* `divers_recette` : Autres recettes exceptionnelles

### Dépenses (Expenses)
* `salaires` : Rémunérations des entraîneurs (2) et charges sociales
* `achats_boutique` : Achats de matériel destiné à la revente (volants, cordages)
* `achats_club` : Achat de matériel club (poteaux, filets, volants d'entraînement)
* `licences_ffbad` : Reversement des licences à la FFBad / Ligue / Comité départemental
* `championnats` : Frais d'inscription du club aux compétitions par équipe (Interclubs)
* `formations` : Formation des entraîneurs, officiels de table, arbitres
* `evenements_club` : Frais d'organisation d'événements, d'actions jeunes ou de tournois
* `frais_deplacement` : Remboursement des frais de déplacement des bénévoles
* `assurances` : Assurances RC et affiliations diverses
* `frais_administratifs` : Frais bancaires, abonnements logiciels, hébergement web
* `divers_depense` : Autres dépenses exceptionnelles

---

## 3. Endpoints de l'API Hono

### Soldes Initiaux
* `GET /seasons/:seasonId/balances` : Récupère les soldes initiaux de la saison.
* `POST /seasons/:seasonId/balances` : Enregistre le solde initial de chaque compte.

### Transactions
* `GET /transactions?season=...&page=...&limit=...` : Liste filtrée et paginée.
* `POST /transactions` : Enregistre une nouvelle transaction (avec validations de cohérence par type).
* `DELETE /transactions/:id` : Supprime une écriture comptable.

### Rapports de l'AG
* `GET /seasons/:seasonId/reports` : Calcule et retourne :
  * Le bilan recettes/dépenses global et détaillé par catégorie (Compte de résultat).
  * Les soldes initiaux et finaux réels de chaque compte (Bilan de trésorerie).

---

## 4. Écrans de l'Interface Console d'Administration

### Grand Livre (`/admin/compta`)
* Affichage des soldes courants des comptes (Courant, Livret, Caisse).
* Tableau paginé avec tri chronologique.
* Formulaires de saisie sous forme de panneau latéral coulissant :
  * Formulaire Recette/Dépense : Saisie du montant, de la date, de la catégorie prédéfinie, du compte concerné et de la description.
  * Formulaire Virement interne : Saisie du compte source, du compte destinataire, de la date, du montant et de la description.

### Rapports de l'AG (`/admin/compta/reports`)
* Consultation par saison.
* Présentation claire des recettes vs dépenses pour le rapport financier du trésorier.
* Tableau comparatif des soldes bancaires initiaux et finaux pour prouver le pointage global.
* Lien direct pour configurer ou modifier les soldes de départ de la saison.
