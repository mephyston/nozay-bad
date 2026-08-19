<script lang="ts">
  import type { Snippet } from 'svelte';
  import { MoreHorizontal } from '@lucide/svelte';
  import { Button } from '../ui/button';
  import * as DropdownMenu from '../ui/dropdown-menu';

  let {
    children
  }: {
    children: Snippet;
  } = $props();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button variant="ghost" size="icon" {...props} class="h-8 w-8 p-0">
        <span class="sr-only">Ouvrir le menu</span>
        <MoreHorizontal class="h-4 w-4" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    {@render children()}
  </DropdownMenu.Content>
</DropdownMenu.Root>
