<script lang="ts" module>
  export type ComboboxItem = { label: string; value: string | number; disabled?: boolean };
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
  import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
  import { Button } from '../ui/button';
  import { Check, ChevronsUpDown, ChevronRight } from '@lucide/svelte';
  import { cn } from '../../lib/utils.js';
  import ChoicePicker from './ChoicePicker.svelte';

  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
  const requete = creerIsMobile();

  let {
    items = [],
    placeholder = 'Sélectionner...',
    searchPlaceholder = 'Rechercher...',
    emptyText = 'Aucun résultat.',
    value = $bindable(),
    onValueChange,
    onSearch,
    onOpenChange,
    filter = true,
    disabled = false,
    id,
    class: className
  }: {
    items: ComboboxItem[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    value?: string | number;
    onValueChange?: (value: string | number) => void;
    // Recherche externe/asynchrone : appelé à chaque frappe. Fournir aussi
    // filter={false} pour que le parent contrôle entièrement `items`.
    onSearch?: (query: string) => void;
    onOpenChange?: (open: boolean) => void;
    filter?: boolean;
    disabled?: boolean;
    id?: string;
    class?: string;
  } = $props();

  let open = $state(false);
  let searchText = $state('');

  $effect(() => { onOpenChange?.(open); });
  $effect(() => { onSearch?.(searchText); });

  const choisi = $derived(items.find((item) => String(item.value) === String(value)));
  const selectedLabel = $derived(choisi?.label ?? invite);

  const optionsPicker = $derived(
    items.map((item) => ({ value: String(item.value), label: item.label }))
  );

  function choisirDepuisPicker(valeur: string) {
    const item = items.find((i) => String(i.value) === valeur);
    if (!item) return;
    value = item.value;
    onValueChange?.(item.value);
  }

  /* Même règle que `Input` : voir `FormField`. */
  const absorbable = $derived(!!champ && champ.absorbable && requete.current);
  const invite = $derived(absorbable ? champ!.label : placeholder);

  $effect(() => {
    if (absorbable) champ!.absorberLabel();
  });
</script>

{#if requete.current}
  <!--
    Au doigt, un choix est une navigation : une rangée qui porte l'intitulé et la
    valeur, puis un écran à part. Le menu flottant ancré reste à la souris, qui
    vise au pixel et n'a pas de pouce à ménager.
  -->
  <button
    type="button"
    {id}
    {disabled}
    onclick={() => (open = true)}
    data-field-row
    class={cn(
      'border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50',
      className
    )}
  >
    {#if absorbable}
      <span class="shrink-0 text-muted-foreground">{champ?.label}</span>
    {/if}
    <span class="flex min-w-0 items-center gap-1 {absorbable ? '' : 'flex-1'}">
      <span class={cn('truncate', !choisi && 'text-muted-foreground')}>
        {choisi?.label ?? (absorbable ? placeholder : invite)}
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
    </span>
  </button>

  <ChoicePicker
    bind:open
    title={champ?.label ?? placeholder}
    value={String(value ?? '')}
    options={optionsPicker}
    searchable
    {searchPlaceholder}
    onChoose={choisirDepuisPicker}
  />
{:else}
  <Popover bind:open>
    <PopoverTrigger>
      {#snippet child({ props })}
        <!--
          `{id}` **après** l'étalement : bits-ui y pose le sien, qui écrasait celui de
          l'appelant. Le `<label for=…>` du bloc de champ ne désignait alors plus rien —
          et aucun écran ne pouvait viser son propre champ, ce qui se voit dès qu'on le
          teste. L'ancrage du popover passe par des références, pas par l'identifiant :
          seul l'`aria-controls` du contenu perd sa cible, contre une étiquette qui
          retrouve la sienne.
        -->
        <Button
          {disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          class={cn('w-full justify-between font-normal', className)}
          {...props}
          {id}
        >
          <span class={cn('truncate', selectedLabel === invite && 'text-muted-foreground')}>{selectedLabel}</span>
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      {/snippet}
    </PopoverTrigger>
    <PopoverContent class="w-[--bits-popover-anchor-width] p-0">
      <Command shouldFilter={filter}>
        <CommandInput placeholder={searchPlaceholder} bind:value={searchText} />
        <CommandEmpty>{emptyText}</CommandEmpty>
        <CommandGroup>
          <CommandList>
            {#each items as item (item.value)}
              <CommandItem
                value={`${item.label} ${item.value}`}
                disabled={item.disabled}
                onSelect={() => {
                  value = item.value;
                  onValueChange?.(item.value);
                  open = false;
                }}
              >
                <Check class={cn('mr-2 h-4 w-4', String(item.value) === String(value) ? 'opacity-100' : 'opacity-0')} />
                {item.label}
              </CommandItem>
            {/each}
          </CommandList>
        </CommandGroup>
      </Command>
    </PopoverContent>
  </Popover>
{/if}
