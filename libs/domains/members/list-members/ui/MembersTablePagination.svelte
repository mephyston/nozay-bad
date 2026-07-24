<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { Button } from '@nba/ui';
  import type { Pagination } from './members-table-types';

  let {
    pagination,
    onChangePage
  }: {
    pagination: Pagination;
    onChangePage: (newPage: number) => void;
  } = $props();
</script>

<div class="p-4 border-t border-border flex items-center justify-between">
  <div class="text-xs text-muted-foreground">
    Total : {pagination.total} adhérent(s)
  </div>
  <div class="flex items-center gap-4">
    <span class="text-xs">
      Page {pagination.page} sur {pagination.totalPages}
    </span>
    <div class="flex gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => onChangePage(pagination.page - 1)}
        disabled={pagination.page <= 1}
      >
        <ChevronLeft class="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onclick={() => onChangePage(pagination.page + 1)}
        disabled={pagination.page >= pagination.totalPages}
      >
        <ChevronRight class="w-4 h-4" />
      </Button>
    </div>
  </div>
</div>
