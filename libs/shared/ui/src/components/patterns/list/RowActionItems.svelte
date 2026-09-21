<script lang="ts" generics="T">
  import * as DropdownMenu from '../../ui/dropdown-menu/index.js';
  import { cn } from '../../../lib/utils.js';
  import { runAction } from '../../../lib/actions/run-action.js';
  import type { SwipeAction } from './list-types.js';

  /**
   * Rend un tableau d'actions en items de menu.
   *
   * Sert la table comme la liste : les actions se déclarent une fois, en données,
   * et les deux rendus en découlent. C'est ce qui remplace les menus recopiés
   * d'un `mobileView` à son `row`.
   */
  let { actions, item }: { actions: SwipeAction<T>[]; item: T } = $props();
</script>

{#each actions as action (action.id)}
  {@const Icone = action.icon}
  <DropdownMenu.Item
    onclick={() => runAction(action, item)}
    class={cn('cursor-pointer', action.tone === 'destructive' && 'text-destructive focus:text-destructive')}
  >
    {#if Icone}<Icone class="mr-2 size-3.5" aria-hidden="true" />{/if}
    {action.label}
  </DropdownMenu.Item>
{/each}
