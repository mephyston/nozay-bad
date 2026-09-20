<script lang="ts">
  import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group/index.js';
  import { cn } from '../../lib/utils.js';

  /**
   * Un filtre d'état en segments soudés.
   *
   * Aucune primitive à écrire : `ToggleGroup` porte déjà `spacing={0}`, qui soude
   * les segments et n'arrondit que les extrémités. Ce pattern n'en fixe que la
   * forme, et remplace les `<Select>` d'état dans les barres d'outils sur
   * téléphone — un menu déroulant cache ses options, des segments les montrent.
   */
  let {
    value = $bindable(''),
    options,
    onChange,
    class: className
  }: {
    value?: string;
    options: { value: string; label: string; count?: number }[];
    onChange?: (valeur: string) => void;
    class?: string;
  } = $props();
</script>

<!--
  Au-delà de quatre segments, la rangée défile plutôt que de comprimer les
  libellés jusqu'à l'illisible.
-->
<div class={cn('overflow-x-auto no-scrollbar', className)}>
  <ToggleGroup
    type="single"
    bind:value
    onValueChange={(v) => onChange?.(String(v ?? ''))}
    variant="outline"
    size="sm"
    spacing={0}
    class="w-full min-w-max"
  >
    {#each options as option (option.value)}
      <ToggleGroupItem value={option.value} class="h-9 flex-1 whitespace-nowrap px-3 text-xs">
        {option.label}
        {#if option.count !== undefined}
          <span class="ml-1.5 tabular-nums text-muted-foreground">{option.count}</span>
        {/if}
      </ToggleGroupItem>
    {/each}
  </ToggleGroup>
</div>
