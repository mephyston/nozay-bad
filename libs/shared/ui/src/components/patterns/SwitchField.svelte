<script lang="ts">
  import { getContext } from 'svelte';
  import { Switch } from '../ui/switch/index.js';
  import { cn } from '../../lib/utils.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';

  /**
   * Un réglage : son intitulé à gauche, son interrupteur à droite.
   *
   * La disposition iOS — et la bonne, parce qu'elle met l'état au même endroit sur
   * toutes les lignes d'un formulaire, là où des cases à cocher le placent après
   * des libellés de longueurs différentes.
   *
   * À réserver aux **réglages**. Une case qui sélectionne un élément dans une liste
   * — des chèques à remettre, des créneaux à retenir — reste une case : elle
   * répond à « lequel ? », pas à « est-ce actif ? ».
   */
  let {
    label,
    id,
    checked = $bindable(false),
    hint,
    disabled = false,
    class: className
  }: {
    label: string;
    id: string;
    checked?: boolean;
    /** Ce que le réglage change, en une phrase. */
    hint?: string;
    disabled?: boolean;
    class?: string;
  } = $props();

  /*
    La rangée porte son intitulé à gauche : le bloc qui l'entoure ne doit pas
    l'afficher une seconde fois au-dessus. Absorbé à toute largeur, et non
    seulement sur téléphone — un réglage porte son nom partout.
  */
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);

  $effect(() => {
    if (champ?.absorbable) champ.absorberLabel();
  });
</script>

<!--
  La même enveloppe que les autres champs : bordure, rayon, hauteur. Un réglage est
  une rangée de formulaire comme une autre, et le laisser nu le faisait flotter
  entre des champs cerclés.
-->
<div
  data-field-row
  class={cn(
    'border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-4 rounded-lg border bg-transparent px-3 py-2',
    className
  )}
>
  <div class="min-w-0 flex-1">
    <label for={id} class="block text-base">{label}</label>
    {#if hint}
      <p class="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    {/if}
  </div>
  <Switch {id} bind:checked {disabled} />
</div>
