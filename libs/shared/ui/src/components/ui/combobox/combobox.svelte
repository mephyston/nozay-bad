<script lang="ts">
  import { Search, ChevronDown, ChevronRight, X } from '@lucide/svelte';
  import { cn } from '../../../lib/utils';
  import { creerIsMobile } from '../../../lib/hooks/is-mobile.svelte.js';
  import ChoicePicker from '../../patterns/ChoicePicker.svelte';
  import type { ComboboxItem } from './types';

  let {
    items = [],
    value = $bindable(''),
    placeholder = 'Rechercher...',
    label = '',
    allowClear = true,
    clearLabel = 'Aucune sélection',
    id = undefined,
    disabled = false,
    class: className = '',
    onselect = undefined
  }: {
    items: ComboboxItem[];
    value?: string;
    placeholder?: string;
    label?: string;
    allowClear?: boolean;
    clearLabel?: string;
    id?: string;
    disabled?: boolean;
    class?: string;
    onselect?: (value: string, item?: ComboboxItem) => void;
  } = $props();

  const requete = creerIsMobile();

  /*
    Au doigt, un choix est une navigation.

    L'autocomplétion en place déroule un panneau sous un champ de saisie : le clavier
    logiciel s'ouvre avec lui et le recouvre aussitôt. `ChoicePicker` pousse à la place
    un écran plein cadre, avec sa propre recherche — c'est la forme qu'ont prise les
    autres formulaires de l'admin.
  */
  let pickerOuvert = $state(false);

  let isOpen = $state(false);
  let searchQuery = $state('');
  let highlightedIndex = $state(-1);
  let listboxContainer = $state<HTMLDivElement | null>(null);
  let inputElement = $state<HTMLInputElement | null>(null);

  function normalizeString(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  const selectedItem = $derived(items.find(i => String(i.value) === String(value)));

  const filteredItems = $derived.by(() => {
    const q = normalizeString(searchQuery.trim());
    if (!q) return items;
    return items.filter(item => {
      const l = normalizeString(item.label);
      const desc = normalizeString(item.description || '');
      const det = normalizeString(item.detail || '');
      const val = normalizeString(item.value);
      return l.includes(q) || desc.includes(q) || det.includes(q) || val.includes(q);
    });
  });

  // Number of total options in listbox (including clear option if allowed)
  const totalOptions = $derived(allowClear ? filteredItems.length + 1 : filteredItems.length);

  $effect(() => {
    if (!isOpen) {
      highlightedIndex = -1;
    }
  });

  function scrollOptionIntoView(index: number) {
    if (!listboxContainer) return;
    const option = listboxContainer.querySelector(`[data-index="${index}"]`) as HTMLElement;
    if (option) {
      option.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectOption(val: string, item?: ComboboxItem) {
    value = val;
    searchQuery = item ? item.label : '';
    isOpen = false;
    highlightedIndex = -1;
    if (onselect) {
      onselect(val, item);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        isOpen = true;
        highlightedIndex = 0;
        searchQuery = '';
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalOptions > 0) {
        highlightedIndex = (highlightedIndex + 1) % totalOptions;
        scrollOptionIntoView(highlightedIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalOptions > 0) {
        highlightedIndex = (highlightedIndex - 1 + totalOptions) % totalOptions;
        scrollOptionIntoView(highlightedIndex);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allowClear && highlightedIndex === 0) {
        selectOption('');
      } else {
        const itemIdx = allowClear ? highlightedIndex - 1 : highlightedIndex;
        if (itemIdx >= 0 && itemIdx < filteredItems.length) {
          const item = filteredItems[itemIdx];
          selectOption(String(item.value), item);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      isOpen = false;
      highlightedIndex = -1;
    }
  }
</script>

{#if requete.current}
  <!--
    La rangée porte l'intitulé à gauche et la valeur à droite, suivie du chevron qui
    annonce l'écran de choix. Le libellé n'est donc plus posé au-dessus : il est porté
    par le champ lui-même, comme dans les autres formulaires repris.
  -->
  <button
    type="button"
    {id}
    {disabled}
    onclick={() => (pickerOuvert = true)}
    data-field-row
    class={cn(
      'border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50',
      className
    )}
  >
    {#if label}<span class="shrink-0 text-muted-foreground">{label}</span>{/if}
    <span class="flex min-w-0 items-center gap-1">
      <span class={cn('truncate', !selectedItem && 'text-muted-foreground')}>
        {selectedItem ? selectedItem.label : placeholder}
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
    </span>
  </button>

  <ChoicePicker
    bind:open={pickerOuvert}
    title={label || placeholder}
    value={String(value ?? '')}
    options={[
      ...(allowClear ? [{ value: '', label: clearLabel }] : []),
      ...items.map((item) => ({ value: String(item.value), label: item.label, hint: item.detail }))
    ]}
    searchable
    searchPlaceholder={placeholder}
    onChoose={(v) => selectOption(v)}
  />
{:else}
<div class={cn("space-y-1.5 relative w-full", className)}>
  {#if label}
    <label for={id} class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {label}
    </label>
  {/if}

  <div class="relative flex items-center">
    <input
      {id}
      bind:this={inputElement}
      type="text"
      role="combobox"
      autocomplete="off"
      aria-expanded={isOpen}
      aria-controls={id ? `${id}-listbox` : 'combobox-listbox'}
      aria-activedescendant={highlightedIndex >= 0 ? `${id || 'combobox'}-option-${highlightedIndex}` : undefined}
      {disabled}
      {placeholder}
      value={isOpen ? searchQuery : (selectedItem ? selectedItem.label : '')}
      oninput={(e) => {
        searchQuery = (e.target as HTMLInputElement).value;
        isOpen = true;
        highlightedIndex = allowClear ? 1 : 0;
      }}
      onfocus={() => {
        if (!disabled) {
          isOpen = true;
          searchQuery = '';
          highlightedIndex = allowClear ? 1 : 0;
        }
      }}
      onblur={() => {
        setTimeout(() => {
          isOpen = false;
        }, 150);
      }}
      onkeydown={handleKeyDown}
      class="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    />

    {#if value && allowClear && !disabled}
      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation();
          selectOption('');
        }}
        class="absolute right-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-1"
        title="Effacer la sélection"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    {:else}
      <ChevronDown class="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
    {/if}
  </div>

  {#if isOpen && !disabled}
    <div
      bind:this={listboxContainer}
      role="listbox"
      class="absolute z-50 w-full mt-1 bg-popover border border-border text-popover-foreground rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 space-y-0.5"
    >
      {#if allowClear}
        <button
          type="button"
          role="option"
          data-index="0"
          aria-selected={!value}
          onmousedown={() => selectOption('')}
          class={cn(
            "w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground font-medium cursor-pointer transition-colors border-0",
            highlightedIndex === 0 ? "bg-primary/10 text-primary" : "hover:bg-muted"
          )}
        >
          {clearLabel}
        </button>
      {/if}

      {#if filteredItems.length === 0}
        <div class="px-2 py-2 text-xs text-muted-foreground italic text-center">
          Aucun résultat trouvé
        </div>
      {:else}
        {#each filteredItems as item, idx}
          {@const optionIndex = allowClear ? idx + 1 : idx}
          <button
            type="button"
            role="option"
            data-index={optionIndex}
            aria-selected={String(value) === String(item.value)}
            onmousedown={() => selectOption(String(item.value), item)}
            class={cn(
              "w-full text-left px-2 py-1.5 rounded text-xs truncate flex justify-between items-center text-foreground cursor-pointer transition-colors border-0",
              optionIndex === highlightedIndex ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
            )}
          >
            <span>{item.label}</span>
            {#if item.detail}
              <span class="text-[10px] text-muted-foreground font-mono ml-2">{item.detail}</span>
            {:else if item.description}
              <span class="text-[10px] text-muted-foreground ml-2">{item.description}</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
{/if}
