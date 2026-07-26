<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { Button } from '../button';

  let {
    pagination,
    onChangePage,
    itemName = 'élément(s)'
  }: {
    pagination: { page: number; total: number; totalPages: number };
    onChangePage: (page: number) => void;
    itemName?: string;
  } = $props();

  let pageRange = $derived.by(() => {
    const { page, totalPages } = pagination;
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  });
</script>

<div class="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
  <div class="text-xs text-muted-foreground">
    Total : {pagination.total} {itemName}
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
