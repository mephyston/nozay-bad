<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { Button } from '../button';
  import { softNavigate } from '../../../lib/navigation';

  let {
    pagination,
    onChangePage,
    itemName = 'élément(s)',
    limitOptions = [10, 20, 50, 100]
  }: {
    pagination: { page: number; total: number; totalPages: number; limit?: number };
    onChangePage: (page: number) => void;
    itemName?: string;
    limitOptions?: number[];
  } = $props();

  function handleLimitChange(newLimit: number) {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('limit', String(newLimit));
      params.set('page', '1');
      softNavigate(`${window.location.pathname}?${params.toString()}`);
    }
  }

  let pageRange = $derived.by(() => {
    const { page, totalPages } = pagination;
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  });
</script>

<div class="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
  <div class="flex items-center gap-4">
    <div class="text-xs text-muted-foreground">
      Total : {pagination.total} {itemName}
    </div>
    {#if pagination.limit}
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">Lignes :</span>
        <select
          class="h-7 w-[70px] rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          value={pagination.limit}
          onchange={(e) => handleLimitChange(Number((e.target as HTMLSelectElement).value))}
        >
          {#each limitOptions as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>
  <div class="flex items-center gap-2 sm:gap-4">
    <span class="text-xs">
      Page {pagination.page} sur {pagination.totalPages}
    </span>
    <div class="flex gap-1 items-center">
      <Button
        variant="outline"
        size="icon-xs"
        class="p-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[36px] min-w-[36px]"
        onclick={() => onChangePage(pagination.page - 1)}
        disabled={pagination.page <= 1}
        aria-label="Page précédente"
      >
        <ChevronLeft class="w-4 h-4" />
      </Button>

      {#each pageRange as p}
        {#if p === '...'}
          <span class="px-2.5 py-1 text-xs text-muted-foreground select-none">...</span>
        {:else}
          <Button
            variant={Number(p) === pagination.page ? 'default' : 'outline'}
            size="xs"
            class="px-3 py-1 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] min-w-[36px]"
            onclick={() => onChangePage(Number(p))}
            aria-current={Number(p) === pagination.page ? 'page' : undefined}
          >
            {p}
          </Button>
        {/if}
      {/each}

      <Button
        variant="outline"
        size="icon-xs"
        class="p-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[36px] min-w-[36px]"
        onclick={() => onChangePage(pagination.page + 1)}
        disabled={pagination.page >= pagination.totalPages}
        aria-label="Page suivante"
      >
        <ChevronRight class="w-4 h-4" />
      </Button>
    </div>
  </div>
</div>
