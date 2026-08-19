<script lang="ts">
  import { ArrowUpRight, ArrowDownRight, Minus } from '@lucide/svelte';
  import { cn } from '../../lib/utils.js';

  let {
    title,
    value,
    trend = 'none',
    trendValue = '',
    class: className = ''
  }: {
    title: string;
    value: string | number;
    trend?: 'up' | 'down' | 'flat' | 'none';
    trendValue?: string;
    class?: string;
  } = $props();
</script>

<div class={cn("flex flex-col gap-1", className)}>
  <h3 class="text-sm font-medium text-muted-foreground">{title}</h3>
  <div class="flex items-baseline gap-2 mt-1">
    <span class="text-2xl font-bold font-outfit text-foreground">{value}</span>
    {#if trend !== 'none' && trendValue}
      <span class={cn(
        "flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md",
        trend === 'up' ? "bg-success/10 text-success" : 
        trend === 'down' ? "bg-destructive/10 text-destructive" : 
        "bg-muted text-muted-foreground"
      )}>
        {#if trend === 'up'}
          <ArrowUpRight class="w-3 h-3 mr-0.5" />
        {:else if trend === 'down'}
          <ArrowDownRight class="w-3 h-3 mr-0.5" />
        {:else}
          <Minus class="w-3 h-3 mr-0.5" />
        {/if}
        {trendValue}
      </span>
    {/if}
  </div>
</div>
