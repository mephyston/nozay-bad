<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../../lib/utils.js';

  let {
    title,
    icon: Icon,
    iconClass = "text-primary bg-primary/10",
    bgIconClass = "",
    containerClass = "border-border/50 hover:border-primary/30 from-card/80 to-card",
    children,
    class: className = '',
  }: {
    title: string;
    icon: any;
    iconClass?: string;
    bgIconClass?: string;
    containerClass?: string;
    children: Snippet;
    class?: string;
  } = $props();
</script>

<div class={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-b p-6 shadow-sm transition-all hover:shadow-md group", containerClass, className)}>
  <div class={cn("absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300", bgIconClass)}>
    {#if Icon}<Icon size={120} />{/if}
  </div>
  <div class="flex items-center justify-between space-y-0 pb-4">
    <h3 class="font-semibold text-sm tracking-tight">{title}</h3>
    <div class={cn("p-2 rounded-lg", iconClass)}>
      {#if Icon}<Icon size={18} />{/if}
    </div>
  </div>
  {@render children()}
</div>
