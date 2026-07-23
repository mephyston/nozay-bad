# Spécification Technique : Standardisation de la Remise de Chèques

Ce document spécifie le design, l'architecture et les exigences pour uniformiser le module de remise de chèques (`CheckDepositManager`), à travers l'uniformisation de l'en-tête de page Astro, la migration des onglets vers les composants standards, l'utilisation de checkboxes accessibles et l'uniformisation des polices avec la police Outfit.

## 1. Structure de l'En-tête Astro (`cheques.astro`)

* Le titre « Remise de chèques », la description et le sélecteur de saison sont déplacés au niveau d'Astro, à droite de l'en-tête, de manière homogène avec le reste de l'application.

```html
      <div class="flex items-center justify-between print:hidden">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Remise de chèques</h1>
          <p class="text-muted-foreground mt-2">
            Gestion et suivi des chèques physiques, génération de bordereaux de remise et rapprochement bancaire.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <select
            id="season-selector"
            class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
          >
            {seasonsList.map((s: any) => (
              <option value={s.id} selected={s.id === season}>{s.name}</option>
            ))}
            {seasonsList.length === 0 && (
              <option value="25-26" selected>Saison 2025-2026</option>
            )}
          </select>
        </div>
      </div>
```

## 2. Refonte en Onglets Standards (`CheckDepositManager.svelte`)

Le composant utilisera le composant `<Tabs>` standard de `@nba/ui` pour découper la vue :

```html
<Tabs.Root value={activeTab} onValueChange={(val) => activeTab = val as any} class="w-full space-y-6">
  <Tabs.List class="no-print">
    <Tabs.Trigger value="checks">Chèques reçus</Tabs.Trigger>
    <Tabs.Trigger value="deposits">Bordereaux de Remise</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="checks" class="space-y-6">
    <!-- Liste des chèques + actions -->
  </Tabs.Content>

  <Tabs.Content value="deposits" class="space-y-6">
    <!-- Bordereaux de Remise -->
  </Tabs.Content>
</Tabs.Root>
```

## 3. Checkboxes Accessibles

Toutes les balises `<input type="checkbox">` brutes sont remplacées par le composant accessible `<Checkbox>` de `@nba/ui`.

## 4. Uniformisation des Polices (Outfit)

Toutes les classes `font-mono` appliquées sur des éléments de texte comptable (numéros de chèques, références de remises, inputs de numéros) sont supprimées pour permettre le rendu avec la police Outfit sans-serif du projet.

## 5. Résolution des Fuites dans les Tests

Les tests unitaires dans `CheckDepositManager.test.ts` seront mis à jour pour capturer les instances Svelte 5 montées et appeler `unmount(component)` dans le hook `afterEach` pour éviter les fuites de mémoire.
