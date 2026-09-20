<script lang="ts">
  import { Skeleton } from '../../ui/skeleton/index.js';

  let { withLeading = false }: { withLeading?: boolean } = $props();
</script>

<li class="flex min-h-[3.25rem] items-center gap-3 bg-card px-4 py-2.5">
  {#if withLeading}
    <Skeleton class="size-9 shrink-0 rounded-full" />
  {/if}
  <div class="min-w-0 flex-1 space-y-2">
    <Skeleton class="h-3.5 w-1/2" />
    <Skeleton class="h-3 w-1/3" />
  </div>
  <Skeleton class="h-3.5 w-12 shrink-0" />
</li>
