# Spécification Technique : Uniformisation des Polices des Rapports Financiers

Ce document spécifie le design, l'architecture et les exigences pour uniformiser les polices de caractères dans le module comptable en supprimant l'usage du monospace (`font-mono`) sur les montants numériques pour utiliser la police par défaut Outfit, et réaliser le nettoyage du code mort identifié.

## 1. Objectifs UX

* **Uniformisation** : Remplacer la police monospace par la police sans-serif Outfit pour tous les montants et nombres dans le rapport financier (`GeneralMeetingReport.svelte`), garantissant un aspect visuel moderne, lisible et harmonisé.
* **Lisibilité** : La police Outfit (qui est configurée comme police sans-serif par défaut du projet) est optimisée et offre un rendu extrêmement qualitatif pour les nombres de bilans.

## 2. Nettoyage de la police monospace (`font-mono`)

Dans `GeneralMeetingReport.svelte` :
* Retirer les classes `font-mono` sur l'ensemble des conteneurs de montants (tableau comparatif, graphiques, inputs éditables du prévisionnel).
* Remplacer `<strong class="font-mono">` par `<strong class="font-semibold">` dans les pourcentages des légendes des graphiques.

## 3. Nettoyage du code mort (Svelte Component)

Dans `GeneralMeetingReport.svelte` :
* Retirer les imports inutilisés `Printer` et `AlertCircle` de `'lucide-svelte'`.
* Retirer la fonction d'aide obsolète `applySeasonChange()`.
* Retirer les déclarations de variables réactives inutilisées :
  - `getClassSum`
  - `totalDepensesRealise`
  - `totalRecettesRealise`
  - `netResultRealise`
  - `netResultPrevisionnel`
  - `totalDepenses`
  - `totalRecettes`
  - `netResult`

## 4. Stratégie de Vérification

* Validation du rendu visuel de la page des rapports financiers.
* Exécution de la commande `npx astro check --root apps/admin-console`.
* Exécution de la suite de tests unitaires via `npx vitest run`.
