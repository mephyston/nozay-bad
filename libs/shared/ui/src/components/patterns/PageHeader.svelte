<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    description,
    actions
  }: {
    title: string;
    description?: string;
    actions?: Snippet;
  } = $props();
</script>

<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
  <div class="flex flex-col gap-1">
    <h1 class="text-3xl font-bold tracking-tight">{title}</h1>
    {#if description}
      <p class="text-muted-foreground">{description}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</div>
