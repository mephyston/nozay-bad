<script lang="ts">
  import { ArrowUpLeft, CornerDownLeft } from '@lucide/svelte';
  import type { NavSearchHit } from '../../lib/nav-search';

  /**
   * Les résultats d'une recherche dans le menu : pages et saisies rapides, la rubrique
   * sous le nom pour lever les homonymes. Le premier répond à Entrée.
   */
  let {
    hits,
    query,
    icons,
    onPick
  }: {
    hits: NavSearchHit[];
    query: string;
    icons: Record<string, any>;
    onPick: (hit: NavSearchHit) => void;
  } = $props();
</script>

<div role="listbox" aria-label="Résultats" class="p-1.5">
  {#if hits.length === 0}
    <p class="px-3 py-3 text-sm text-muted-foreground">Rien dans le menu pour « {query.trim()} ».</p>
  {:else}
    {#each hits as hit, i (hit.kind + hit.href)}
      {@const Icon = icons[hit.icon]}
      <button
        type="button"
        role="option"
        aria-selected={i === 0}
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary/10 {i === 0 ? 'bg-primary/10' : ''}"
        onclick={() => onPick(hit)}
      >
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {hit.kind === 'action' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}">
          {#if Icon}<Icon class="h-4 w-4" />{/if}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-foreground">{hit.name}</span>
          <span class="block truncate text-xs text-muted-foreground">{hit.group}</span>
        </span>
        {#if i === 0}
          <CornerDownLeft class="h-4 w-4 shrink-0 text-muted-foreground" />
        {:else}
          <ArrowUpLeft class="h-4 w-4 shrink-0 text-muted-foreground/60" />
        {/if}
      </button>
    {/each}
  {/if}
</div>
