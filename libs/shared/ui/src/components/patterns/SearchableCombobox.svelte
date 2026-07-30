<script lang="ts">
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
  import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
  import { Button } from '../ui/button';
  import { ChevronsUpDown } from '@lucide/svelte';
  
  let {
    items = [],
    placeholder = 'Rechercher...',
    value = $bindable()
  }: {
    items: { label: string; value: string }[];
    placeholder?: string;
    value?: string;
  } = $props();

  let open = $state(false);

  const selectedLabel = $derived(
    items.find((item) => String(item.value) === String(value))?.label ?? placeholder
  );
</script>

<Popover bind:open>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="w-full justify-between"
        {...props}
      >
        {selectedLabel}
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </PopoverTrigger>
  <PopoverContent class="w-full p-0">
    <Command>
      <CommandInput {placeholder} />
      <CommandEmpty>Aucun résultat.</CommandEmpty>
      <CommandGroup>
        <CommandList>
          {#each items as item}
            <CommandItem
              value={item.value}
              onSelect={() => {
                value = item.value;
                open = false;
              }}
            >
              {item.label}
            </CommandItem>
          {/each}
        </CommandList>
      </CommandGroup>
    </Command>
  </PopoverContent>
</Popover>
