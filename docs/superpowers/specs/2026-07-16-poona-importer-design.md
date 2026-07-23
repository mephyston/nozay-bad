# Spécification Technique : Refonte de l'Importateur Poona

Ce document spécifie le design, l'architecture et les exigences pour la refonte du composant d'importation des adhérents depuis Poona (`PoonaImporter.svelte`) avec une validation et une prévisualisation locales côté client.

## 1. Objectifs et Expérience Utilisateur (UX)

L'importateur actuel envoie directement le fichier au serveur sans contrôle préalable. La refonte vise à introduire :
* **Validation immédiate** : Détecter les erreurs de format (en-têtes manquants, séparateur invalide, extension incorrecte) avant de charger le fichier sur le réseau.
* **Aperçu des données** : Donner confiance à l'utilisateur en affichant un tableau synthétique des 5 premiers adhérents détectés dans le fichier CSV.
* **Bilan visuel clair** : Remplacer les alertes textuelles de succès par un tableau de bord (KPI cards) distinguant les insertions, les mises à jour et les rejets.

## 2. Architecture & Logique Applicative

Le composant `PoonaImporter.svelte` gérera la logique suivante :

### A. États réactifs (Svelte 5 `$state`)
* `dragOver` (boolean) : Pour le survol de fichier dans la zone de dépôt.
* `selectedFile` (File | null) : Fichier CSV actuellement sélectionné.
* `csvPreview` (Array<any>) : Liste des 5 premières lignes décodées pour affichage.
* `totalRows` (number) : Nombre de lignes total détectées dans le fichier (moins l'en-tête).
* `separator` (string) : Séparateur détecté (`,` ou `;`).
* `validationError` (string | null) : Erreur de structure ou d'en-tête détectée localement.
* `loading` (boolean) : Indicateur de soumission en cours.

### B. En-têtes attendus et Mappage
Le script de validation locale vérifiera la présence des colonnes indispensables suivantes (indifféremment séparées par `,` ou `;` et insensibles aux guillemets de protection) :
1. `Licence`
2. `Saison`
3. `Nom`
4. `Prénom`
5. `Sexe` (Genre)
6. `Date de naissance` (ou `Date naissance`)
7. `Type` (ou `Tarif`)

## 3. Composants et Structure HTML (Shadcn Svelte)

Le balisage utilisera les primitives de `@nba/ui` :

* **Card** (`Card.Root`, `Card.Content`) : Pour encapsuler le formulaire d'importation.
* **Zone de dépôt (Dropzone)** :
  * Un élément `div` stylisé avec une bordure en tirets (`border-dashed`), une icône d'upload animée et des styles de survol réactifs (`hover:bg-accent/50`).
  * Un champ `<Input type="file">` masqué, déclenché au clic sur la zone.
* **Alert** (`Alert.Root`, `Alert.Title`, `Alert.Description`) :
  * Pour afficher les erreurs de validation locale (en-têtes manquants) et les erreurs retournées par le serveur.
* **Table** (`Table.Root`, `Table.Header`, `Table.Row`, `Table.Head`, `Table.Body`, `Table.Cell`) :
  * Affiché uniquement si un fichier est chargé et valide. Affiche les colonnes essentielles pour validation visuelle rapide de la structure du fichier par l'utilisateur.
* **Cartes de Statistiques (Bilan)** :
  * Affichées après succès sous forme de grille à 3 colonnes :
    * **Créations** (Vert)
    * **Mises à jour** (Bleu)
    * **Rejets / Erreurs** (Rouge, affiché uniquement si > 0).

## 4. Stratégie de Test

La suite de tests unitaires `PoonaImporter.test.ts` sera mise à jour pour valider :
1. **Validation locale** : Simulation du dépôt d'un fichier avec des en-têtes manquants (doit afficher l'erreur et désactiver le bouton d'import).
2. **Affichage de l'aperçu** : Simulation du dépôt d'un fichier valide (doit afficher les lignes d'aperçu dans le tableau).
3. **Affichage du bilan** : Transmission de la prop `result` (doit afficher les cartes KPI correspondantes).
