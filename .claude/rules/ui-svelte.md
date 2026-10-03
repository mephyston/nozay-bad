---
paths:
  - "**/*.svelte"
  - "libs/shared/ui/**"
  - "libs/domains/**/ui/**"
  - "apps/admin/src/**"
  - "apps/storefront/src/**"
---

# Interface : design system `@nba/ui`, admin et espace adhérent

- Composants génériques dans `@nba/ui` (`libs/shared/ui`) ; composants métier dans le `ui/` de leur tranche. Jamais de `ui/` à la racine d'un domaine ni dans `libs/shared/` hors `ui`.
- Avant une notation pointée, vérifier l'export dans `libs/shared/ui/src/index.ts` : `Sheet`, `Card`, `DropdownMenu`, `Table` sont des namespaces (`export * as`), **`Select` non** (habillage d'un `<select>` natif avec des `<option>`). `<Select.Root>` compile et rend un champ invisible, sans erreur.
- Commentaire : `<!-- … -->` dans un `.svelte`, `{/* … */}` seulement dans un `.astro`.
- `tsc` ne lit pas les `.svelte` : grep les appelants à chaque renommage de prop. Un bouton « qui ne fait rien » = chercher `$$props.onX is not a function` en console.

## Écrans de l'admin

- Écran de liste : `DataTable` + `DataTableToolbar` (bouton « Nouveau… » dans le snippet `actions`), actions de ligne en `DataTableRowActions`. Au téléphone, `ListView` façon iOS (balayage, feuille à paliers) : migration en cours, partir d'un écran déjà migré (`InvoicesManager` + `InvoicesList`, `LedgerList`) plutôt que d'écrire de zéro. Page `.astro` : `<div class="space-y-6">` → `ErrorAlert`, `PageHeader`, le manager.
- Formulaire : `FormSheet`, chaque champ dans un `FormField`.
- Écriture : `submitForm()` (valider → écrire → fermer → flash). Un refus laisse le formulaire ouvert ; `onError` par défaut = `uiAlert()` à acquitter, jamais un toast qui s'efface. `success` seulement quand rien à l'écran ne montre l'écriture. Les `*-actions.ts` lèvent, ils ne flashent pas.
- Tailles de champ : **une seule source**, `libs/shared/ui/src/lib/field.ts` (`h-11 md:h-8`, bascule à 768 px = `md:`). Jamais de `h-*`, `min-h-*`, `py-*`, `text-*` posé sur un champ par un écran : DS7 (`libs/design-system.test.ts`) casse la CI.
- Choix au doigt : `SearchableCombobox`/`Combobox` (écran dédié), `ChoiceField` (menu en place, peu d'options), `SwitchField` (oui/non).
- Recherche : toujours `correspondA(terme, ...textes)` (accents, casse, ponctuation ignorés). Jamais `toLowerCase().includes`.
- Balayage (`swipe-actions.ts`) : ne pas abaisser `commitRatio`/`MARGE_ARMEMENT` sans refaire le calcul avec 3 actions sur 390 px.
- bits-ui réécrit tout l'attribut `style` d'un `Dialog.Content` quand un dialogue s'empile : ne jamais compter sur un style en ligne durable sur un nœud qu'il gère.

## Navigation et documents

- Navigation de l'admin : `softNavigate()`, jamais `window.location.href`. Pas de `transition:persist` sur un layout qui enveloppe le contenu (l'ancienne page persiste). Une page `client:only` est inatteignable par le `<ClientRouter />` : `client:load`.
- HTML de l'admin en `private, no-store` : obligatoire, `navigate()` refait un fetch.
- Réorganisation d'écran = redirection **302** (défaut d'`Astro.redirect`). Une 301 est mise en cache sans fin par le navigateur et détourne aussi la navigation douce.
- PDF et exports : `openDocument()`, jamais `window.open` (en PWA installée, une nouvelle fenêtre n'a ni onglets ni retour).
- Toute modification volontaire d'un atome visuel ⇒ régénérer les références (workflow *Update Visual Baselines*).
