import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const helpDir = path.join(__dirname, '../src/content/help');

const articles = [
  {
    filename: 'caisse.md',
    title: 'Gestion de la Caisse',
    description: "Comment gérer les espèces (paiements, retraits, dépôts en banque).",
    category: 'comptabilite',
    order: 4,
    content: `La rubrique **Caisse** permet de suivre les mouvements d'espèces de l'association (billets et pièces).

## Enregistrer un mouvement de caisse
Tout paiement en espèces (ex: paiement d'une commande boutique, buvette) est enregistré dans le compte de trésorerie "Caisse".
Si vous déposez des espèces à la banque, vous devez effectuer une écriture de type **Transfert** :
- **Compte source** : Caisse
- **Compte de destination** : Compte Courant (Banque)

Le solde de la caisse virtuelle doit toujours refléter exactement l'argent liquide présent dans la caisse physique du club.`
  },
  {
    filename: 'soldes-initiaux.md',
    title: 'Soldes Initiaux',
    description: "Initialiser les soldes des comptes au début d'une nouvelle saison.",
    category: 'comptabilite',
    order: 5,
    content: `La rubrique **Soldes Initiaux** vous permet de reporter l'argent restant de la saison précédente sur la nouvelle saison.

## Pourquoi initialiser les soldes ?
À l'ouverture d'une nouvelle saison comptable, il faut renseigner le solde de départ pour chaque compte (ex: Livret A, Compte Courant, Caisse). 

- Ce montant représente ce qui était présent sur le compte au dernier jour de la saison précédente.
- Cela permet que les rapports financiers et le rapprochement bancaire démarrent avec les bons montants.

Une fois validés, ces soldes servent de base à tous les calculs de trésorerie de la nouvelle saison.`
  },
  {
    filename: 'gestion-saisons.md',
    title: 'Gestion des Saisons',
    description: "Créer, activer, clôturer et approuver les saisons.",
    category: 'admin',
    order: 9,
    content: `La plateforme fonctionne par **Saisons** (ex: 2024-2025, 2025-2026). Chaque saison isole la comptabilité et les inscriptions.

## Cycle de vie d'une saison

1. **Création** : Vous définissez un code (ex: "24-25"), un nom, une date de début et de fin.
2. **Saison Active** : Une seule saison peut être marquée comme *Active*. C'est la saison par défaut sur laquelle arrivent les membres lors de leur connexion.
3. **Clôture** : Lorsque l'année est terminée, la saison est clôturée (\`closedAt\`). Plus aucune écriture comptable ne peut être ajoutée.
4. **Approbation** : Après l'Assemblée Générale, les comptes sont approuvés (\`approvedAt\`), figeant définitivement l'historique.`
  },
  {
    filename: 'plan-comptable.md',
    title: 'Plan Comptable',
    description: "Comprendre les classes de comptes et les comptes.",
    category: 'comptabilite',
    order: 11,
    content: `Le **Plan Comptable** définit l'architecture financière du club. Il est structuré en deux niveaux.

## Les Classes de Comptes
Chaque compte appartient à une classe définissant son type :
- **Recette** : L'argent qui entre (ex: Cotisations, Subventions).
- **Dépense** : L'argent qui sort (ex: Achats matériels, Frais bancaires).
- **Trésorerie** : Les comptes réels où est stocké l'argent (ex: Banque, Livret A, Caisse).

## Les Comptes
À l'intérieur des classes, on retrouve les comptes détaillés (avec leur code unique et libellé). Chaque écriture du Grand Livre est obligatoirement affectée à l'un de ces comptes.`
  },
  {
    filename: 'categories-comptables.md',
    title: 'Catégories Comptables',
    description: "Faciliter la saisie grâce aux catégories.",
    category: 'comptabilite',
    order: 12,
    content: `Pour simplifier la saisie comptable par les bénévoles, le club utilise des **Catégories Comptables** (ex: "Achat volants", "Paiement inscription").

## Fonctionnement d'une catégorie
Plutôt que de choisir un numéro de compte complexe, le bénévole choisit une catégorie.
En arrière-plan, chaque catégorie est liée à :
- **Une classe de compte Recette** (si l'argent entre)
- **Une classe de compte Dépense** (si l'argent sort)

La catégorie dispose également de deux noms :
- **Libellé Admin** : Affiché pour le bureau (ex: "Cotisations Adultes").
- **Libellé Adhérent** : Affiché publiquement (ex: "Votre inscription").
Il est aussi possible de cacher une catégorie dans les notes de frais si elle ne doit pas être utilisée pour un remboursement.`
  },
  {
    filename: 'categories-produits.md',
    title: 'Catégories de Produits (Boutique)',
    description: "Organiser les articles de la boutique et les lier à la comptabilité.",
    category: 'boutique',
    order: 13,
    content: `La boutique permet de regrouper vos articles dans des **Catégories de Produits** (ex: Textiles, Raquettes, Volants).

## Lien direct avec la comptabilité
L'avantage principal est que chaque catégorie de produit est **obligatoirement liée à une catégorie comptable**.

Ainsi, lorsqu'une commande est validée et payée dans la boutique (ex: achat d'une raquette), l'écriture comptable est générée automatiquement dans le Grand Livre, affectée au bon compte (ex: Recette > Vente matériel), sans aucune double saisie !`
  },
  {
    filename: 'attestations.md',
    title: 'Attestations & Documents',
    description: "Générer les documents légaux pour les adhérents.",
    category: 'admin',
    order: 14,
    content: `Le menu **Réglages** permet notamment de gérer les documents administratifs de l'association.

## Attestations
Vous pouvez générer diverses attestations en lot ou à l'unité :
- **Reçus fiscaux (Cerfa)** : Pour les dons ou abandons de frais.
- **Attestations de paiement** : Utiles pour les comités d'entreprise des adhérents.

Ces documents reprennent automatiquement les informations de l'adhérent, de la saison en cours, et les données de paiement extraites du Grand Livre.`
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

console.log('Accurate help articles generated successfully!');
