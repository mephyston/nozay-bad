<script lang="ts">
  import { getContext } from 'svelte';
  import { ChevronsUpDown, Check } from '@lucide/svelte';
  import * as DropdownMenu from '../ui/dropdown-menu/index.js';
  import { Select } from '../ui/select/index.js';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';

  /**
   * Un choix parmi quelques options connues, sans recherche.
   *
   * Sur téléphone, un menu en verre s'ouvre à même la rangée — la forme que prend
   * une liste déroulante dans l'application Calendrier. Le **double chevron** le
   * dit : un menu s'ouvre ici, on ne va nulle part. Le chevron simple vers la
   * droite est réservé à ce qui emmène sur un autre écran, comme la variante
   * cherchable ({@link SearchableCombobox}), qui a besoin d'une page entière pour
   * son champ de recherche.
   *
   * À la souris, la liste déroulante native : rien ne la bat.
   */
  let {
    label,
    id,
    value = $bindable(''),
    options,
    placeholder = 'Choisir…',
    disabled = false
  }: {
    label: string;
    id: string;
    value?: string;
    options: { value: string; label: string; hint?: string }[];
    placeholder?: string;
    disabled?: boolean;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
  const absorbable = $derived(!!champ && champ.absorbable && requete.current);

  // La rangée porte l'intitulé : le bloc n'a plus à l'afficher au-dessus.
  $effect(() => {
    if (absorbable) champ!.absorberLabel();
  });

  const choisi = $derived(options.find((o) => o.value === value));
</script>

{#if requete.current}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <button
          type="button"
          {id}
          {disabled}
          {...props}
          class="border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50"
        >
          {#if absorbable}
            <span class="shrink-0 text-muted-foreground">{label}</span>
          {/if}
          <span class="flex min-w-0 items-center gap-1.5 {absorbable ? '' : 'flex-1'}">
            <span class={cn('truncate', !choisi && 'text-muted-foreground')}>
              {choisi?.label ?? placeholder}
            </span>
            <ChevronsUpDown class="size-4 shrink-0 text-muted-foreground" />
          </span>
        </button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="end"
      sideOffset={6}
      class="glass-surface max-h-[60dvh] min-w-[12rem] overflow-y-auto rounded-2xl border-0 p-1.5"
    >
      {#each options as option (option.value)}
        <DropdownMenu.Item
          onclick={() => (value = option.value)}
          class="cursor-pointer gap-2 rounded-xl py-2.5"
        >
          <Check
            class={cn('size-4 shrink-0 text-primary', option.value !== value && 'opacity-0')}
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate">{option.label}</span>
            {#if option.hint}
              <span class="block truncate text-xs text-muted-foreground">{option.hint}</span>
            {/if}
          </span>
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <Select {id} bind:value {disabled}>
    <option value="">{placeholder}</option>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </Select>
{/if}
