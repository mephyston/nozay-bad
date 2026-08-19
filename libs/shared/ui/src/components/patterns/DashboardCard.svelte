<script lang="ts">
  import * as Card from '../ui/card/index.js';
  import type { Snippet } from 'svelte';
  import { cn } from '../../lib/utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    header,
    children,
    class: className = '',
    ...restProps
  }: {
    header?: Snippet;
    children: Snippet;
    class?: string;
  } & HTMLAttributes<HTMLDivElement> = $props();
</script>

<Card.Root class={cn("bg-muted/10 shadow-none border-border/50", className)} {...restProps}>
  {#if header}
    <Card.Header class="pb-2">
      {@render header()}
    </Card.Header>
  {/if}
  <Card.Content>
    {@render children()}
  </Card.Content>
</Card.Root>
