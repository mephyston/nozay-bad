# Spécification Technique - Layout et Thème Dynamique (Console CA)

Ce document décrit la structure, le design et l'implémentation de l'enveloppe de la console d'administration (`admin-console`), incluant le layout, la navigation et le double thème.

## 1. Objectifs
* Installer et configurer les outils de style nécessaires (`mode-watcher`, `lucide-svelte`, `bits-ui` pour shadcn-svelte).
* Créer une barre latérale (`Sidebar`) réactive et rétractable pour la navigation.
* Implémenter la bascule de thème Clair / Sombre persistante et sans flash lumineux au chargement.
* Assurer que le layout global est responsive (Desktop & Mobile).

## 2. Structure des Composants UI
Le layout sera orchestré par Astro avec des îles d'interactivité Svelte :

```
apps/admin-console/
├── src/
│   ├── layouts/
│   │   └── Layout.astro         # Layout principal (Astro), injecte le ModeWatcher
│   ├── components/
│   │   ├── AdminLayout.svelte   # Enveloppe globale (Sidebar, Header, Content Area)
│   │   ├── UserNav.svelte       # Dropdown utilisateur (Profil, Thème, Logout)
│   │   └── ThemeToggle.svelte   # Bouton de bascule de thème (Clair / Sombre / Système)
│   └── styles/
│       └── global.css           # Imports Tailwind CSS v4 et variables HSL
```

## 3. Gestion du Thème (mode-watcher)
* Nous utiliserons `mode-watcher` pour synchroniser le thème Svelte et Tailwind CSS v4.
* Le composant `<ModeWatcher />` est inséré dans le `<head>` de `Layout.astro` pour appliquer la classe `.dark` sur la balise `<html>` avant le premier rendu de page (évite le flash blanc).
* Le bouton de thème (`ThemeToggle.svelte`) offre 3 options : Clair, Sombre, ou Système.

## 4. Composants structurels Shadcn Svelte
* **`Sidebar`** (de shadcn-svelte) :
  * Utilise les primitives de `bits-ui` pour la gestion d'état (ouvert/fermé).
  * Liens de navigation vers les différentes sections (Tableau de bord, Trésorerie, Adhésions, Boutique).
* **`DropdownMenu`** :
  * Affichage de l'avatar utilisateur et sélection du thème / déconnexion.
* **`Breadcrumb`** :
  * Indique le chemin actuel de navigation.

## 5. Critères d'Acceptation
* [ ] Les dépendances (`mode-watcher`, `lucide-svelte`, `bits-ui`, etc.) sont installées.
* [ ] Le thème (Clair / Sombre) bascule correctement et est sauvegardé dans le `localStorage`.
* [ ] Aucun flash blanc (FOUC) n'apparaît lors du rechargement de la page en mode sombre.
* [ ] La barre latérale est rétractable sur Desktop et s'affiche sous forme de tiroir (Sheet) sur Mobile.
* [ ] La page d'administration compile sans erreur TypeScript ou Astro.
