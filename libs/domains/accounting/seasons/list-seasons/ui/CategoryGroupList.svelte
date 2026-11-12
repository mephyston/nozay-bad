<script lang="ts">
  import { ArrowUp, ArrowDown, Trash2, Plus, Star } from '@lucide/svelte';
  import { Button, Input, Badge } from '@nba/ui';
  import type { CategoryGroup, CategoryGroupKind } from './settings-types';

  /**
   * Une famille de regroupements (pôles ou rubriques) : renommer, ordonner, supprimer,
   * ajouter. Le libellé s'enregistre en quittant le champ, sans bouton à chercher.
   */
  let {
    kind,
    title,
    description,
    groups = [],
    isSubmitting = false,
    onCreate,
    onRename,
    onMove,
    onDelete,
    onMarkFees
  }: {
    kind: CategoryGroupKind;
    title: string;
    description: string;
    groups: CategoryGroup[];
    isSubmitting: boolean;
    onCreate: (label: string) => Promise<boolean>;
    onRename: (group: CategoryGroup, label: string) => Promise<boolean>;
    onMove: (index: number, delta: -1 | 1) => Promise<boolean>;
    onDelete: (group: CategoryGroup) => Promise<boolean>;
    onMarkFees?: (group: CategoryGroup) => Promise<boolean>;
  } = $props();

  let nouveau = $state('');

  async function ajouter(e: SubmitEvent) {
    e.preventDefault();
    if (await onCreate(nouveau)) nouveau = '';
  }

  function renommer(group: CategoryGroup, e: Event) {
    const label = (e.currentTarget as HTMLInputElement).value.trim();
    if (label && label !== group.label) void onRename(group, label);
  }
</script>

<section class="space-y-3" data-testid="category-groups-{kind}">
  <div>
    <h3 class="text-base font-semibold text-foreground">{title}</h3>
    <p class="text-sm text-muted-foreground">{description}</p>
  </div>

  <ul class="divide-y divide-border rounded-xl border border-border bg-card">
    {#each groups as group, i (group.id)}
      <li class="flex flex-wrap items-center gap-2 px-3 py-2">
        <Input
          aria-label="Libellé"
          value={group.label}
          disabled={isSubmitting}
          onchange={(e) => renommer(group, e)}
          class="flex-1 min-w-40"
        />
        <span class="text-xs text-muted-foreground whitespace-nowrap">{group.categoryCount} catégorie(s)</span>
        {#if kind === 'rubrique'}
          {#if group.membershipFees}
            <Badge variant="secondary">Cotisations</Badge>
          {:else if onMarkFees}
            <Button variant="ghost-muted" size="icon-sm" title="Désigner comme rubrique des cotisations" aria-label="Désigner comme rubrique des cotisations" disabled={isSubmitting} onclick={() => onMarkFees?.(group)}>
              <Star />
            </Button>
          {/if}
        {/if}
        <Button variant="ghost-muted" size="icon-sm" aria-label="Monter" disabled={isSubmitting || i === 0} onclick={() => onMove(i, -1)}><ArrowUp /></Button>
        <Button variant="ghost-muted" size="icon-sm" aria-label="Descendre" disabled={isSubmitting || i === groups.length - 1} onclick={() => onMove(i, 1)}><ArrowDown /></Button>
        <Button variant="ghost-danger" size="icon-sm" aria-label="Supprimer" disabled={isSubmitting} onclick={() => onDelete(group)}><Trash2 /></Button>
      </li>
    {:else}
      <li class="px-3 py-3 text-sm text-muted-foreground">Aucun pour l'instant.</li>
    {/each}
  </ul>

  <form class="flex gap-2" onsubmit={ajouter}>
    <Input aria-label="Nouveau libellé" placeholder={kind === 'pole' ? 'Nouveau pôle' : 'Nouvelle rubrique'} bind:value={nouveau} class="flex-1" />
    <Button type="submit" variant="outline" disabled={isSubmitting || !nouveau.trim()}><Plus data-icon="inline-start" />Ajouter</Button>
  </form>
</section>
