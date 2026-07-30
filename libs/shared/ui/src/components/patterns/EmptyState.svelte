<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    icon: Icon,
    title,
    description,
    actions
  }: {
    icon?: any;
    title: string;
    description: string;
    actions?: Snippet;
  } = $props();
</script>

<div class="flex flex-col items-center justify-center p-8 text-center animate-in fade-in-50">
  {#if Icon}
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <Icon class="h-6 w-6 text-muted-foreground" />
    </div>
  {/if}
  <h3 class="mt-4 text-lg font-semibold">{title}</h3>
  <p class="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
    {description}
  </p>
  {#if actions}
    <div class="flex gap-2">
      {@render actions()}
    </div>
  {/if}
</div>
