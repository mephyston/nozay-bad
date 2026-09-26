<script lang="ts" module>
  export type ComboboxItem = {
    label: string;
    value: string | number;
    /**
     * Ce qui distingue deux options de même nom — une date, un état.
     *
     * Sur une seconde ligne, en retrait : allongé dans le libellé, il finissait
     * tronqué sur la rangée, qui n'a la place que d'un titre.
     */
    hint?: string;
    disabled?: boolean;
  };
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
  import { FIELD_ROW } from '../../lib/field.js';
  import { correspondA } from '../../lib/recherche.js';

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
    items.map((item) => ({ value: String(item.value), label: item.label, hint: item.hint }))
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
      FIELD_ROW,
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
    {filter}
    onSearch={(terme) => (searchText = terme)}
    {searchPlaceholder}
    onChoose={choisirDepuisPicker}
  />
{:else}
  <Popover bind:open>
    <PopoverTrigger>
      {#snippet child({ props })}
        <!--
          `{id}` et `class` **après** l'étalement : bits-ui y pose les siens, qui
          écrasaient ceux de l'appelant. La largeur en souffrait sans bruit — le
          `w-full` de cette ligne n'arrivait jamais jusqu'au bouton, qui se rétractait
          sur son contenu au milieu de champs pleine largeur. La classe de bits-ui est
          reprise dans la fusion, pour ne rien lui retirer. Le `<label for=…>` du bloc de champ ne désignait alors plus rien —
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
          {...props}
          {id}
          class={cn('w-full justify-between font-normal', props.class as string | undefined, className)}
        >
          <span class={cn('truncate', selectedLabel === invite && 'text-muted-foreground')}>{selectedLabel}</span>
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      {/snippet}
    </PopoverTrigger>
    <PopoverContent class="w-[--bits-popover-anchor-width] p-0">
      <!--
        Imbrication de bits-ui : la liste porte le groupe, et non l'inverse. Rangée
        dans le groupe, elle défaisait le masquage et le tri — une recherche laissait
        toute la liste affichée, et dans un menu haut de neuf lignes on ne voyait que
        les premiers adhérents.

        `filter` : la même règle qu'au doigt (`correspondA`), le texte tapé tel quel.
        Le score flou de bits-ui gardait quiconque avait les mêmes lettres dans l'ordre.
        Elle porte sur les `keywords` — libellé et seconde ligne —, et non sur `value`,
        qui embarque l'identifiant technique : « 12 » trouverait sinon l'adhérent n° 12.
      -->
      <Command shouldFilter={filter} filter={(_valeur, terme, motsCles) => (correspondA(terme, ...(motsCles ?? [])) ? 1 : 0)}>
        <CommandInput placeholder={searchPlaceholder} bind:value={searchText} />
        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>
            {#each items as item (item.value)}
              <CommandItem
                value={`${item.label} ${item.hint ?? ''} ${item.value}`}
                keywords={[item.label, item.hint ?? '']}
                disabled={item.disabled}
                onSelect={() => {
                  value = item.value;
                  onValueChange?.(item.value);
                  open = false;
                }}
              >
                <Check class={cn('mr-2 h-4 w-4 shrink-0', String(item.value) === String(value) ? 'opacity-100' : 'opacity-0')} />
                <span class="min-w-0 flex-1">
                  <span class="block truncate">{item.label}</span>
                  {#if item.hint}
                    <span class="block truncate text-xs text-muted-foreground">{item.hint}</span>
                  {/if}
                </span>
              </CommandItem>
            {/each}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
{/if}
