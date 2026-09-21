<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';
  import { Input } from '../ui/input/index.js';

  /**
   * Une date ou une heure, dans la rangée d'iOS : intitulé à gauche, valeur à
   * droite dans une pastille teintée.
   *
   * **Le sélecteur est celui du système, et c'est délibéré.** Sur iOS,
   * `<input type="date">` ouvre le calendrier d'Apple et `type="time"` sa molette
   * heure/minute — les contrôles mêmes que décrit l'application Calendrier. En
   * refaire un à la main donnerait une copie sans retour haptique, sans VoiceOver
   * à parité, sans gestion des locales ni des fuseaux, et qu'il faudrait suivre à
   * chaque version d'iOS. La rangée est à nous, le sélecteur reste au système.
   */
  let {
    label,
    id,
    type = 'date',
    value = $bindable(''),
    min,
    max,
    step,
    disabled = false,
    required = false
  }: {
    label: string;
    id: string;
    type?: 'date' | 'time' | 'datetime-local';
    value?: string;
    min?: string;
    max?: string;
    step?: number;
    disabled?: boolean;
    required?: boolean;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
  const enRangee = $derived(!!champ && champ.absorbable && requete.current);

  $effect(() => {
    if (enRangee) champ!.absorberLabel();
  });
</script>

{#if enRangee}
  <div
    class="border-input dark:bg-input/30 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border bg-transparent px-3"
  >
    <label for={id} class="shrink-0 text-base text-muted-foreground">{label}</label>
    <!--
      Aucun fond propre : une rangée ne porte qu'une surface, la sienne. Une
      pastille teintée à l'intérieur donnait au champ une couleur que n'avait
      aucun autre. Le contrôle natif reste la cible — c'est lui qui ouvre le
      calendrier ou la molette.
    -->
    <input
      {id}
      {type}
      {min}
      {max}
      {step}
      {disabled}
      {required}
      bind:value
      class={cn(
        'min-w-0 bg-transparent py-1 text-right text-base text-foreground outline-none',
        'appearance-none rounded-md focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
      )}
    />
  </div>
{:else}
  <Input {id} {type} {min} {max} {step} {disabled} {required} bind:value />
{/if}
