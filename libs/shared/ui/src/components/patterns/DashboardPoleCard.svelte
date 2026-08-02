<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../lib/utils.js';

  let {
    title,
    icon: Icon,
    iconClass = "text-primary bg-primary/10",
    children,
    class: className = '',
  }: {
    title: string;
    icon: any;
    iconClass?: string;
    children: Snippet;
    class?: string;
  } = $props();
</script>

<div class={cn("rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md", className)}>
  <div class="flex items-center gap-3 mb-4">
    <div class={cn("p-2.5 rounded-xl", iconClass)}>
      {#if Icon}<Icon size={20} />{/if}
    </div>
    <h3 class="font-semibold">{title}</h3>
  </div>
  {@render children()}
</div>
