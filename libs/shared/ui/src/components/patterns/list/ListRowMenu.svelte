<script lang="ts" generics="T">
  import { MoreHorizontal } from '@lucide/svelte';
  import * as DropdownMenu from '../../ui/dropdown-menu/index.js';
  import { Button } from '../../ui/button/index.js';
  import ActionSheet from '../ActionSheet.svelte';
  import RowActionItems from './RowActionItems.svelte';
  import { creerIsMobile } from '../../../lib/hooks/is-mobile.svelte.js';
  import type { SwipeAction } from './list-types.js';

  /**
   * Le menu d'actions d'une ligne, dans la forme que veut chaque support.
   *
   * Au doigt, une feuille d'actions montant du bas — les recommandations d'Apple
   * n'emploient pas le menu flottant ancré, qui se pose là où il y a de la place,
   * souvent hors de portée du pouce. À la souris, ce même menu ancré, qui est le
   * bon geste quand on vise au pixel.
   *
   * Le déclencheur reste escamoté : invisible au doigt — le balayage et le maintien
   * long y mènent —, il apparaît au `Tab` et s'annonce au lecteur d'écran.
   */
  let {
    actions,
    item,
    title,
    open = $bindable(false)
  }: {
    actions: SwipeAction<T>[];
    item: T;
    /** Ce sur quoi portent les actions ; en-tête de la feuille. */
    title?: string;
    /** Ouvrable de l'extérieur : le balayage y mène par son action « Plus… ». */
    open?: boolean;
  } = $props();

  const requete = creerIsMobile();
</script>

{#snippet declencheur(props: Record<string, unknown> = {})}
  <Button
    variant="ghost"
    size="icon-sm"
    {...props}
    data-row-menu
    class="sr-only focus:not-sr-only focus-visible:not-sr-only"
  >
    <span class="sr-only">Actions</span>
    <MoreHorizontal class="size-4" aria-hidden="true" />
  </Button>
{/snippet}

{#if requete.current}
  {@render declencheur({ onclick: () => (open = true) })}
  <ActionSheet bind:open {actions} {item} {title} />
{:else}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        {@render declencheur(props)}
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <RowActionItems {actions} {item} />
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
