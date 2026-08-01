import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helpDir = path.join(__dirname, '../src/content/help');

const articles = [
  {
    filename: 'tableau-de-bord.md',
    title: 'Tableau de Bord',
    description: "Comprendre et utiliser le tableau de bord de l'association.",
    category: 'Général',
    order: 1,
    content: `Le **Tableau de bord** est votre point d'entrée principal. Il regroupe toutes les statistiques importantes de la saison en cours pour Nozay Bad Association.

## Vue d'ensemble

Dès votre connexion, vous pouvez consulter :
- **Le nombre total d'adhérents** : comparé à la saison précédente.
- **Les tâches en attente** : factures à payer, chèques à encaisser, ou commandes boutique à préparer.
- **Le solde des différents pôles** : Événements, Jeunes, Matériel, et Fonctionnement.

### Comment changer de saison ?
En haut à droite de votre écran, un sélecteur vous permet de basculer entre les différentes saisons (ex: *24-25* à *25-26*). Toutes les statistiques du tableau de bord se mettront à jour instantanément pour refléter la saison choisie.`
  },
  {
    filename: 'gestion-adherents.md',
    title: 'Gestion des Adhérents',
    description: "Comment rechercher, filtrer et gérer les membres de l'association.",
    category: 'Adhérents',
    order: 2,
    content: `La rubrique **Adhérents** vous permet d'avoir une vision complète de tous les membres inscrits pour la saison.

## Liste des adhérents

La liste principale affiche les informations clés de chaque membre :
- Nom et Prénom
- Catégorie (Adulte, Jeune, Compétiteur)
- Statut du paiement (Payé, Partiel, En attente)
- Numéro de licence FFBad

### Rechercher et Filtrer
Utilisez la barre de recherche en haut pour trouver rapidement un membre par son nom. Vous pouvez également filtrer la liste par statut de paiement ou par pôle d'activité.

### Exporter les données
Un bouton "Exporter" est généralement disponible pour télécharger la liste sous format Excel/CSV pour vos envois d'emails ou pointages en salle.`
  },
  {
    filename: 'rapports-financiers.md',
    title: 'Rapports Financiers',
    description: "Consulter la santé financière et le bilan par pôle.",
    category: 'Comptabilité',
    order: 3,
    content: `Les **Rapports Financiers** offrent une analyse détaillée des flux de trésorerie de l'association.

## Bilan par Pôle

La comptabilité de l'association est analytique. Chaque dépense ou recette est affectée à un pôle :
1. **Événements** : Tournois, buvette, soirées du club.
2. **Jeunes** : Entraînements jeunes, volants spécifiques.
3. **Matériel** : Achat de volants adultes, poteaux, filets.
4. **Fonctionnement** : Frais bancaires, assurance, affiliation FFBad.

### Le graphique des dépenses/recettes
Un graphique vous permet de comparer visuellement les recettes et les dépenses pour s'assurer que l'association reste à l'équilibre. Vous pouvez survoler les barres du graphique pour voir le montant exact.`
  },
  {
    filename: 'grand-livre.md',
    title: 'Grand Livre',
    description: "Consulter toutes les écritures comptables enregistrées.",
    category: 'Comptabilité',
    order: 4,
    content: `Le **Grand Livre** est le registre officiel de toutes les transactions (écritures) de l'association.

## Comprendre une écriture comptable

Une écriture est toujours composée d'au moins deux lignes (principe de la partie double) :
- **Un compte de débit** (où va l'argent)
- **Un compte de crédit** (d'où vient l'argent)

### Consulter les transactions
Dans la liste, vous pouvez cliquer sur une ligne pour voir le détail de l'écriture (les comptes impactés, la date, la pièce justificative associée, et la personne ayant saisi l'opération).

> [!WARNING]
> La suppression d'une écriture comptable dans le Grand Livre est irréversible. Privilégiez la création d'une "écriture de contrepassation" (une ligne inverse) en cas d'erreur de saisie pour garder la trace comptable.`
  },
  {
    filename: 'gestion-factures.md',
    title: 'Gestion des Factures',
    description: "Suivre les factures fournisseurs et les factures émises.",
    category: 'Comptabilité',
    order: 5,
    content: `La rubrique **Factures** permet de suivre tout ce que l'association doit payer, et ce qu'elle facture à des tiers.

## Les statuts d'une facture
Une facture passe généralement par trois états :
1. **Brouillon** : La facture est en cours de saisie.
2. **À payer / En attente** : La facture est validée et attend son règlement.
3. **Payée** : Le paiement a été effectué et rapproché avec la banque.

### Joindre un justificatif
Il est obligatoire de joindre un PDF ou une photo lisible pour chaque facture fournisseur. Cliquez sur "Ajouter une pièce jointe" lors de la saisie d'une nouvelle facture.`
  },
  {
    filename: 'notes-de-frais.md',
    title: 'Notes de Frais',
    description: "Rembourser les bénévoles pour leurs achats.",
    category: 'Comptabilité',
    order: 6,
    content: `Les **Notes de Frais** permettent de gérer les demandes de remboursement des bénévoles qui ont effectué des achats pour le compte de l'association.

## Processus de validation

1. **Soumission** : Le bénévole soumet sa note de frais avec le ticket de caisse en pièce jointe.
2. **Validation** : Le trésorier vérifie le montant et la nature de la dépense.
3. **Remboursement** : Le paiement est émis (généralement par virement bancaire).
4. **Comptabilisation** : Une fois payée, la note de frais génère automatiquement l'écriture dans le Grand Livre.

> [!TIP]
> Si vous ne souhaitez pas être remboursé mais faire un don à l'association (abandon de frais), précisez-le. L'association pourra vous éditer un reçu fiscal (Cerfa) en fin d'année.`
  },
  {
    filename: 'boutique-produits.md',
    title: 'Boutique : Produits',
    description: "Gérer le catalogue des produits en vente (maillots, volants, raquettes).",
    category: 'Boutique',
    order: 7,
    content: `Le catalogue de la **Boutique** contient tous les articles mis en vente pour les adhérents.

## Ajouter un produit

Lors de l'ajout d'un produit, vous devez renseigner :
- **Le nom et la description**
- **Le prix de vente** (TTC)
- **Les variations** : Par exemple, pour un maillot, ajoutez les tailles (S, M, L, XL).
- **Le stock initial**

### Gestion des stocks
Dès qu'une commande est validée, le stock du produit diminue automatiquement. Si le stock tombe à 0, le produit s'affiche comme "Rupture de stock" sur la partie publique du site.`
  },
  {
    filename: 'boutique-commandes.md',
    title: 'Boutique : Commandes',
    description: "Préparer et délivrer les commandes de la boutique.",
    category: 'Boutique',
    order: 8,
    content: `La rubrique **Commandes** centralise les achats effectués en ligne ou sur place par les adhérents.

## Traiter une commande

Une nouvelle commande apparaît avec le statut **À préparer**.
1. Préparez les articles demandés (ex: Boîte de volants).
2. Lors du passage du membre au gymnase, remettez-lui sa commande.
3. Changez le statut de la commande en **Livrée**.

### Moyens de paiement
Si la commande n'a pas été payée en ligne via Wero ou Carte Bancaire, vous pourrez indiquer un paiement en espèces ou par chèque au moment de la remise.`
  },
  {
    filename: 'configuration.md',
    title: 'Configuration',
    description: "Paramètres globaux du club (saisons, infos légales).",
    category: 'Réglages',
    order: 9,
    content: `L'écran de **Configuration** permet de modifier les informations fondamentales de Nozay Bad Association.

## Informations de l'association
Vous pouvez y mettre à jour :
- Le siège social de l'association.
- Le numéro SIRET et RNA.
- Le nom de l'actuel Président et Trésorier (ces informations figurent sur les reçus fiscaux et factures générés).

## Gestion des saisons
C'est ici que s'effectue la "Clôture de saison" et la "Création d'une nouvelle saison". Attention, la clôture verrouille définitivement la comptabilité de l'année passée !`
  },
  {
    filename: 'acces-permissions.md',
    title: 'Accès & Permissions',
    description: "Gérer qui a le droit de se connecter et d'agir sur l'interface d'administration.",
    category: 'Réglages',
    order: 10,
    content: `Le module **Accès & Permissions (IAM)** contrôle la sécurité de la plateforme.

## Rôles utilisateurs

Vous pouvez attribuer différents rôles aux membres du bureau :
- **Administrateur** : Accès total à toutes les rubriques.
- **Trésorier** : Accès à la comptabilité et aux rapports.
- **Boutique** : Accès uniquement aux commandes et produits de la boutique.

> [!CAUTION]
> Ne donnez les droits Administrateur qu'aux membres du bureau restreint (Président, Secrétaire, Trésorier) pour éviter les erreurs de manipulation sur les données sensibles.`
  }
];

if (!fs.existsSync(helpDir)) {
  fs.mkdirSync(helpDir, { recursive: true });
}

for (const article of articles) {
  const fileContent = "---\n" +
"title: \"" + article.title + "\"\n" +
"description: \"" + article.description + "\"\n" +
"category: \"" + article.category + "\"\n" +
"order: " + article.order + "\n" +
"---\n\n" +
article.content + "\n";

  fs.writeFileSync(path.join(helpDir, article.filename), fileContent);
}

console.log('Help articles generated successfully!');
