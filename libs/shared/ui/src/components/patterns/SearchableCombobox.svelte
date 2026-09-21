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
  import { Check, ChevronsUpDown } from '@lucide/svelte';
  import { cn } from '../../lib/utils.js';

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

  const selectedLabel = $derived(
    items.find((item) => String(item.value) === String(value))?.label ?? invite
  );

  /* Même règle que `Input` : voir `FormField`. */
  const absorbable = $derived(!!champ && requete.current);
  const invite = $derived(absorbable ? champ!.label : placeholder);

  $effect(() => {
    if (absorbable) champ!.absorberLabel();
  });
</script>

<Popover bind:open>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        {id}
        {disabled}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class={cn('w-full justify-between font-normal', className)}
        {...props}
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
