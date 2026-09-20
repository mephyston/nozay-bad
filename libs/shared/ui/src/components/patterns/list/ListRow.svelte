<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { ChevronRight, MoreHorizontal } from '@lucide/svelte';
  import * as DropdownMenu from '../../ui/dropdown-menu/index.js';
  import { Button } from '../../ui/button/index.js';
  import { cn } from '../../../lib/utils.js';
  import { TONE_CLASS, type Tone } from './list-types.js';

  let {
    item,
    href,
    onclick,
    title,
    subtitle,
    value,
    valueTone = 'muted',
    valueCaption,
    leading,
    badge,
    actions,
    chevron = !!href,
    selected = false,
    disabled = false,
    class: className,
    children
  }: {
    item?: T;
    href?: string;
    onclick?: (event: MouseEvent) => void;
    title?: string;
    subtitle?: string;
    value?: string;
    valueTone?: Tone;
    valueCaption?: string;
    /** Avatar ou icône. Reste petit : au-delà de 36 px, le titre n'a plus sa place. */
    leading?: Snippet;
    /** À droite du titre, sur la même ligne. */
    badge?: Snippet;
    /**
     * Items de `DropdownMenu` pour les actions de la ligne. Le déclencheur est
     * **escamoté** : invisible au doigt, il apparaît au `Tab` et s'annonce au
     * lecteur d'écran. C'est la contrepartie de la règle « une seule affordance
     * visible par ligne » — le chevron dit où l'on va, rien d'autre ne s'affiche.
     */
    actions?: Snippet<[T]>;
    chevron?: boolean;
    selected?: boolean;
    disabled?: boolean;
    class?: string;
    /** Échappatoire : remplace entièrement titre / sous-titre / valeur. */
    children?: Snippet;
  } = $props();
</script>

{#snippet body()}
  {#if leading}
    <div class="shrink-0">{@render leading()}</div>
  {/if}

  {#if children}
    <div class="min-w-0 flex-1">{@render children()}</div>
  {:else}
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="truncate text-sm font-medium">{title}</span>
        {#if badge}{@render badge()}{/if}
      </div>
      {#if subtitle}
        <!--
          `data-selectable` : cette ligne porte souvent une référence qu'on recopie
          (un numéro de licence, un numéro de pièce). Les gestes qui suppriment la
          sélection de texte doivent y renoncer.
        -->
        <span data-selectable class="mt-0.5 block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      {/if}
    </div>
  {/if}

  {#if value !== undefined || valueCaption}
    <div class="shrink-0 text-right">
      {#if value !== undefined}
        <div class={cn('text-sm tabular-nums', TONE_CLASS[valueTone])}>{value}</div>
      {/if}
      {#if valueCaption}
        <div class="text-xs text-muted-foreground">{valueCaption}</div>
      {/if}
    </div>
  {/if}

  {#if chevron}
    <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  {/if}
{/snippet}

<li
  data-list-row
  class={cn('relative bg-card transition-colors', selected && 'bg-accent', className)}
>
  <div class="flex items-center gap-2 px-4">
    <!--
      `min-h-[3.25rem]` : 52 px, la hauteur au-dessous de laquelle une ligne cesse
      d'être visable au pouce. Elle ne se négocie pas par écran.
    -->
    {#if href && !disabled}
      <a
        {href}
        {onclick}
        class="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 py-2.5 text-foreground no-underline"
      >
        {@render body()}
      </a>
    {:else if onclick && !disabled}
      <button
        type="button"
        {onclick}
        class="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 py-2.5 text-left text-foreground"
      >
        {@render body()}
      </button>
    {:else}
      <div
        class={cn(
          'flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 py-2.5',
          disabled && 'opacity-50'
        )}
      >
        {@render body()}
      </div>
    {/if}

    {#if actions}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              variant="ghost"
              size="icon-sm"
              {...props}
              class="sr-only focus:not-sr-only focus-visible:not-sr-only"
            >
              <span class="sr-only">Actions</span>
              <MoreHorizontal class="size-4" aria-hidden="true" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {@render actions(item as T)}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </div>
</li>
