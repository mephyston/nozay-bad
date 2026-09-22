<script lang="ts">
  import { getContext } from 'svelte';
  import { ChevronRight } from '@lucide/svelte';
  import { Checkbox } from '../ui/checkbox/index.js';
  import { Label } from '../ui/label/index.js';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';
  import ChoicePicker from './ChoicePicker.svelte';

  /**
   * Plusieurs réponses parmi quelques options connues.
   *
   * Le pendant multiple de {@link ChoiceField}. Au doigt, une rangée qui dit ce
   * qui est retenu et mène à l'écran de choix — chevron simple, donc : on part
   * ailleurs. Une grille de cases à cocher, elle, donne des cibles de 16 px
   * disposées en colonnes irrégulières, et occupe autant de lignes qu'il y a
   * d'options alors qu'on n'en coche presque jamais plus d'une ou deux.
   *
   * À la souris, la grille reste : le curseur vise au pixel, et voir les six
   * options d'un coup vaut mieux qu'une navigation.
   */
  let {
    label,
    id,
    values = $bindable([]),
    options,
    placeholder = 'Aucune',
    title,
    description,
    onChange,
    disabled = false
  }: {
    label: string;
    id: string;
    values?: string[];
    options: { value: string; label: string; hint?: string }[];
    /** Ce qu'affiche la rangée quand rien n'est retenu. */
    placeholder?: string;
    /** Titre de l'écran de choix ; l'intitulé du champ à défaut. */
    title?: string;
    description?: string;
    onChange?: (valeurs: string[]) => void;
    disabled?: boolean;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
  const absorbable = $derived(!!champ && champ.absorbable && requete.current);

  $effect(() => {
    if (absorbable) champ!.absorberLabel();
  });

  let ouvert = $state(false);

  /* Dans l'ordre des options, et non dans celui des appuis : la rangée doit se lire
     pareil d'une visite à l'autre. */
  const retenus = $derived(options.filter((o) => values.includes(o.value)));
  const resume = $derived(retenus.map((o) => o.label).join(', '));

  function basculer(v: string) {
    values = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    onChange?.(values);
  }
</script>

{#if requete.current}
  <button
    type="button"
    {id}
    {disabled}
    onclick={() => (ouvert = true)}
    data-field-row
    class="border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50"
  >
    {#if absorbable}
      <span class="shrink-0 text-muted-foreground">{label}</span>
    {/if}
    <span class="flex min-w-0 items-center gap-1.5 {absorbable ? '' : 'flex-1'}">
      <span class={cn('truncate', retenus.length === 0 && 'text-muted-foreground')}>
        {resume || placeholder}
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
    </span>
  </button>

  <ChoicePicker
    bind:open={ouvert}
    title={title ?? label}
    {description}
    {options}
    {values}
    multiple
    onChoose={basculer}
  />
{:else}
  <div class="flex flex-wrap gap-x-4 gap-y-2 pt-1">
    {#each options as option (option.value)}
      <div class="flex items-center gap-2">
        <Checkbox
          id={`${id}-${option.value}`}
          checked={values.includes(option.value)}
          {disabled}
          onCheckedChange={() => basculer(option.value)}
        />
        <Label for={`${id}-${option.value}`} class="cursor-pointer font-normal">{option.label}</Label>
      </div>
    {/each}
  </div>
{/if}
