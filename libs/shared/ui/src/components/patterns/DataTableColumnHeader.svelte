<script lang="ts">
  import { ArrowUp, ArrowDown, ChevronsUpDown } from '@lucide/svelte';
  import { Button } from '../ui/button';
  import { TableHead } from '../ui/table';

  let {
    title,
    sortable = false,
    sortDirection = null,
    onSort,
    class: className
  }: {
    title: string;
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
    onSort?: () => void;
    class?: string;
  } = $props();
</script>

<TableHead class={className}>
  {#if sortable}
    <Button
      variant="ghost"
      size="sm"
      class="-ml-4 h-8 data-[state=open]:bg-accent"
      onclick={onSort}
    >
      <span>{title}</span>
      {#if sortDirection === 'desc'}
        <ArrowDown class="ml-2 h-4 w-4" />
      {:else if sortDirection === 'asc'}
        <ArrowUp class="ml-2 h-4 w-4" />
      {:else}
        <ChevronsUpDown class="ml-2 h-4 w-4" />
      {/if}
    </Button>
  {:else}
    <div class="font-medium text-muted-foreground">{title}</div>
  {/if}
</TableHead>
