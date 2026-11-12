<script lang="ts">
  import { Plus, X, MoreHorizontal, Star } from '@lucide/svelte';
  import { Button, Input, Badge, DropdownMenu } from '@nba/ui';
  import type { Category, CategoryGroup } from './settings-types';

  /**
   * Une colonne du rangement : un pôle, une rubrique, ou les catégories non rangées
   * (`group` absent). On y dépose une catégorie glissée, on en ajoute une par « + »,
   * on en retire une par sa croix — les deux derniers pour le doigt, que le glisser-
   * déposer natif ignore.
   */
  let {
    group = null,
    title,
    categories = [],
    candidates = [],
    placeOf,
    dragging = null,
    isSubmitting = false,
    onDragStart,
    onDragEnd,
    onPlace,
    onRemove,
    onRename,
    onMove,
    onDelete,
    onMarkFees
  }: {
    group?: CategoryGroup | null;
    title: string;
    categories: Category[];
    /** Les catégories qui n'y sont pas, proposées par « + ». */
    candidates?: Category[];
    /** Où se range aujourd'hui une catégorie, pour l'annoncer dans le menu « + ». */
    placeOf: (category: Category) => string | null;
    dragging?: number | null;
    isSubmitting?: boolean;
    onDragStart: (categoryId: number) => void;
    onDragEnd: () => void;
    /** Range la catégorie dans cette colonne. */
    onPlace: (categoryId: number) => void;
    /** La retire de cette colonne : elle redevient non rangée. */
    onRemove?: (categoryId: number) => void;
    onRename?: (label: string) => void;
    onMove?: (delta: -1 | 1) => void;
    onDelete?: () => void;
    onMarkFees?: () => void;
  } = $props();

  let survol = $state(false);
  const cible = $derived(dragging !== null && !categories.some((c) => c.id === dragging));

  function deposer(e: DragEvent) {
    e.preventDefault();
    survol = false;
    const id = Number(e.dataTransfer?.getData('text/plain'));
    if (Number.isSafeInteger(id) && id > 0) onPlace(id);
  }

  function renommer(e: Event) {
    const label = (e.currentTarget as HTMLInputElement).value.trim();
    if (label && group && label !== group.label) onRename?.(label);
  }
</script>

<section
  role="list"
  aria-label={title}
  data-testid="group-column"
  class="flex flex-col gap-3 rounded-xl border bg-card p-3 transition-colors {survol && cible ? 'border-primary bg-primary/5' : group ? 'border-border' : 'border-dashed border-border bg-muted/20'}"
  ondragover={(e) => { if (cible) { e.preventDefault(); survol = true; } }}
  ondragleave={(e) => { if (!(e.currentTarget as Node).contains(e.relatedTarget as Node)) survol = false; }}
  ondrop={deposer}
>
  <header class="flex items-center gap-2">
    {#if group}
      <Input aria-label="Libellé" value={group.label} disabled={isSubmitting} onchange={renommer} class="flex-1 min-w-0 font-semibold" />
      {#if group.membershipFees}<Badge variant="secondary">Cotisations</Badge>{/if}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="ghost-muted" size="icon-sm" aria-label="Actions sur {group.label}"><MoreHorizontal /></Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onclick={() => onMove?.(-1)}>Placer avant</DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => onMove?.(1)}>Placer après</DropdownMenu.Item>
          {#if onMarkFees && !group.membershipFees}
            <DropdownMenu.Item onclick={() => onMarkFees?.()}><Star />Désigner comme cotisations</DropdownMenu.Item>
          {/if}
          <DropdownMenu.Separator />
          <DropdownMenu.Item class="text-destructive" onclick={() => onDelete?.()}>Supprimer</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else}
      <h4 class="flex-1 text-sm font-semibold text-muted-foreground">{title}</h4>
    {/if}
    <span class="text-xs text-muted-foreground tabular-nums">{categories.length}</span>
  </header>

  <ul class="flex flex-wrap gap-1.5 min-h-9">
    {#each categories as category (category.id)}
      <li
        draggable="true"
        ondragstart={(e) => { e.dataTransfer?.setData('text/plain', String(category.id)); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; onDragStart(category.id); }}
        ondragend={onDragEnd}
        class="inline-flex items-center gap-1 rounded-full border border-border bg-background pl-3 pr-1 text-sm text-foreground cursor-grab active:cursor-grabbing {dragging === category.id ? 'opacity-40' : ''} {group ? '' : 'pr-3'}"
      >
        <span class="py-1">{category.adminLabel}{#if category.active === false}<span class="text-muted-foreground"> (inactive)</span>{/if}</span>
        {#if group}
          <Button variant="ghost-muted" size="icon-xs" aria-label="Retirer {category.adminLabel}" onclick={() => onRemove?.(category.id)}><X /></Button>
        {/if}
      </li>
    {:else}
      <li class="text-xs text-muted-foreground self-center">{group ? 'Glissez une catégorie ici.' : 'Tout est rangé.'}</li>
    {/each}
  </ul>

  {#if group && candidates.length > 0}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost-muted" size="sm" class="self-start"><Plus data-icon="inline-start" />Ajouter une catégorie</Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" class="max-h-80 overflow-y-auto">
        {#each candidates as category (category.id)}
          {@const ailleurs = placeOf(category)}
          <DropdownMenu.Item onclick={() => onPlace(category.id)}>
            <span>{category.adminLabel}</span>
            {#if ailleurs}<span class="ml-auto pl-3 text-xs text-muted-foreground">dans {ailleurs}</span>{/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</section>
