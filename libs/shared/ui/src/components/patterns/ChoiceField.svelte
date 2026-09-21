<script lang="ts">
  import { getContext } from 'svelte';
  import { ChevronRight } from '@lucide/svelte';
  import { Select } from '../ui/select/index.js';
  import ChoicePicker from './ChoicePicker.svelte';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';

  /**
   * Un choix parmi plusieurs.
   *
   * Sur ordinateur, la liste déroulante native : rien ne la bat à la souris.
   *
   * Sur téléphone, la disposition iOS : une ligne qui porte l'intitulé à gauche, la
   * valeur choisie à droite et un chevron, puis un écran qui entre par la droite
   * avec toutes les options — et la place d'expliquer ce qu'on attend, ce qu'une
   * liste déroulante ne permet jamais. On en revient par le chevron de retour.
   */
  let {
    label,
    id,
    value = $bindable(''),
    options,
    placeholder = 'Choisir…',
    description,
    disabled = false
  }: {
    label: string;
    id: string;
    value?: string;
    /** `hint` s'affiche sous l'option, dans l'écran de choix. */
    options: { value: string; label: string; hint?: string }[];
    placeholder?: string;
    /** Ce qu'on attend, affiché en tête de l'écran de choix. */
    description?: string;
    disabled?: boolean;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);

  // La ligne porte l'intitulé : le bloc n'a plus à l'afficher au-dessus.
  $effect(() => {
    if (requete.current && champ) champ.absorberLabel();
  });

  let ouvert = $state(false);
  const choisi = $derived(options.find((o) => o.value === value));

  function choisir(v: string) {
    value = v;
  }
</script>

{#if requete.current}
  <button
    type="button"
    {id}
    {disabled}
    onclick={() => (ouvert = true)}
    class="border-input flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3 text-base disabled:pointer-events-none disabled:opacity-50"
  >
    <span class="shrink-0 text-muted-foreground">{label}</span>
    <span class="flex min-w-0 items-center gap-1">
      <span class={cn('truncate', !choisi && 'text-muted-foreground')}>
        {choisi?.label ?? placeholder}
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
    </span>
  </button>

  <ChoicePicker
    bind:open={ouvert}
    title={label}
    {description}
    {value}
    {options}
    onChoose={choisir}
  />
{:else}
  <Select {id} bind:value {disabled}>
    <option value="">{placeholder}</option>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </Select>
{/if}
