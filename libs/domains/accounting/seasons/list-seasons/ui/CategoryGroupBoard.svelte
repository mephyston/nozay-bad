<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { Button, Input } from '@nba/ui';
  import type { Category, CategoryGroup, CategoryGroupKind } from './settings-types';
  import type { SettingsState } from './settings-api-classes';
  import * as groupsApi from './settings-api-groups';
  import CategoryGroupColumn from './CategoryGroupColumn.svelte';

  /**
   * Le rangement d'une famille — les pôles, ou les rubriques — en colonnes : une par
   * regroupement, et une dernière pour les catégories non rangées.
   */
  let {
    kind,
    title,
    description,
    unsortedTitle,
    groups = [],
    categories = [],
    settings,
    onPlace
  }: {
    kind: CategoryGroupKind;
    title: string;
    description: string;
    unsortedTitle: string;
    groups: CategoryGroup[];
    /** Les catégories avec leur rangement affiché, déjà corrigé des déplacements en cours. */
    categories: Category[];
    settings: SettingsState;
    onPlace: (categoryId: number, groupId: number | null) => void;
  } = $props();

  const champ = $derived(kind === 'pole' ? 'poleId' : 'rubriqueId');
  const groupeDe = (c: Category) => (c[champ] ?? null) as number | null;
  const libelles = $derived(new Map(groups.map((g) => [g.id, g.label])));
  const dans = (id: number | null) => categories.filter((c) => groupeDe(c) === id);
  // Une catégorie inactive ne se propose plus ; déjà rangée, elle reste visible là où elle est.
  const ailleurs = (id: number) => categories.filter((c) => groupeDe(c) !== id && c.active !== false);

  let dragging = $state<number | null>(null);
  let nouveau = $state('');

  async function ajouter(e: SubmitEvent) {
    e.preventDefault();
    if (await groupsApi.createCategoryGroup(settings, kind, nouveau)) nouveau = '';
  }
</script>

<section class="space-y-3" data-testid="group-board-{kind}">
  <div>
    <h3 class="text-base font-semibold text-foreground">{title}</h3>
    <p class="text-sm text-muted-foreground">{description}</p>
  </div>

  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {#each groups as group, i (group.id)}
      <CategoryGroupColumn
        {group}
        title={group.label}
        categories={dans(group.id)}
        candidates={ailleurs(group.id)}
        placeOf={(c) => { const g = groupeDe(c); return g === null ? null : libelles.get(g) ?? null; }}
        {dragging}
        isSubmitting={settings.isSubmitting}
        onDragStart={(id) => (dragging = id)}
        onDragEnd={() => (dragging = null)}
        onPlace={(id) => onPlace(id, group.id)}
        onRemove={(id) => onPlace(id, null)}
        onRename={(label) => groupsApi.updateCategoryGroup(settings, group, { label })}
        onMove={(d) => groupsApi.moveCategoryGroup(settings, groups, i, d)}
        onDelete={() => groupsApi.deleteCategoryGroup(settings, group)}
        onMarkFees={kind === 'rubrique' ? () => groupsApi.updateCategoryGroup(settings, group, { membershipFees: true }) : undefined}
      />
    {/each}
    <CategoryGroupColumn
      title={unsortedTitle}
      categories={dans(null)}
      placeOf={() => null}
      {dragging}
      onDragStart={(id) => (dragging = id)}
      onDragEnd={() => (dragging = null)}
      onPlace={(id) => onPlace(id, null)}
    />
  </div>

  <form class="flex gap-2 md:max-w-md" onsubmit={ajouter}>
    <Input aria-label="Nouveau libellé" placeholder={kind === 'pole' ? 'Nouveau pôle' : 'Nouvelle rubrique'} bind:value={nouveau} class="flex-1" />
    <Button type="submit" variant="outline" disabled={settings.isSubmitting || !nouveau.trim()}><Plus data-icon="inline-start" />Ajouter</Button>
  </form>
</section>
