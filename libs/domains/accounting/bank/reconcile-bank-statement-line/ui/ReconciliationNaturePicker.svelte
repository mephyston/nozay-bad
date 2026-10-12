<script lang="ts">
  import { Badge } from '@nba/ui';
  import type { NatureDeLigne, OptionDeNature } from './reconciliation-natures';

  /**
   * « Qu'est-ce que cette ligne ? », en tête du panneau.
   *
   * De vrais boutons radio, habillés en cartes : un seul choix, au clavier comme au doigt, et
   * annoncé comme tel. La nature proposée est cochée d'avance et le dit ; la description sous
   * chaque intitulé remplace les explications que portaient les anciens dialogues.
   */
  let {
    options,
    value,
    onChoose,
    name = 'nature-de-ligne',
    disabled = false
  }: {
    options: OptionDeNature[];
    value: NatureDeLigne;
    onChoose: (nature: NatureDeLigne) => void;
    /** Unique par panneau ouvert : deux groupes de même nom n'en feraient qu'un. */
    name?: string;
    disabled?: boolean;
  } = $props();
</script>

<fieldset class="space-y-2" {disabled}>
  <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    Qu'est-ce que cette ligne ?
  </legend>
  {#each options as option (option.nature)}
    {@const choisie = option.nature === value}
    <label
      class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors
        {choisie ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'}"
      data-nature={option.nature}
    >
      <input
        type="radio"
        {name}
        value={option.nature}
        checked={choisie}
        onchange={() => onChoose(option.nature)}
        class="size-4 shrink-0 accent-primary"
      />
      <span class="flex min-w-0 flex-col">
        <span class="text-sm font-medium text-foreground">{option.label}</span>
        <span class="text-xs text-muted-foreground">{option.description}</span>
      </span>
      {#if option.proposee}
        <Badge variant="ai" size="xs" class="ml-auto shrink-0">Proposée</Badge>
      {/if}
    </label>
  {/each}
</fieldset>
