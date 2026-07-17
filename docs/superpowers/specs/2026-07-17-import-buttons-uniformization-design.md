# Spécification Technique : Uniformisation des Boutons d'Importation

Ce document spécifie le design, l'architecture et les exigences pour l'uniformisation visuelle des boutons d'importation dans les modules Adhérents et Comptabilité (Rapprochement).

## 1. Objectifs UX

* **Module Adhérents** (`/admin/members`) :
  * Texte du bouton : « Import Poona » (au lieu de « Importer »).
  * Icône : Ajout de l'icône standardisée `<Upload>` à gauche du texte.
  * Alignement : Aligné horizontalement à droite du titre principal.
* **Module Rapprochement** (`/admin/accounting/import`) :
  * Texte du bouton : « Importer un relevé bancaire » (au lieu de « Importer »).
  * Icône : Conserver l'icône standardisée `<Upload>` à gauche du texte.
  * Alignement : Aligné horizontalement à droite du titre principal.

## 2. Structure du Balisage dans index.astro (Adhérents)

```html
        <a
          href="/admin/members/import"
          class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-2 border-0 no-underline"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          Import Poona
        </a>
```

## 3. Structure du Balisage dans import.astro (Rapprochement)

```html
            <button
              id="trigger-import-btn"
              onclick="window.dispatchEvent(new CustomEvent('open-bank-import'))"
              class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90 cursor-pointer inline-flex items-center gap-2 border-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Importer un relevé bancaire
            </button>
```

## 4. Stratégie de Vérification

* Vérification du rendu dans les fichiers Astro.
* Lancement de `npx astro check --root apps/admin-console` pour s'assurer qu'il n'y a pas d'erreur de compilation HTML/TS.
