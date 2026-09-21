<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';
  import { Input } from '../ui/input/index.js';
  import InlineCalendar, { depuisIso } from './InlineCalendar.svelte';

  /**
   * Une date ou une heure, dans la rangée d'iOS : intitulé à gauche, valeur à
   * droite dans une pastille teintée.
   *
   * **La date déplie un calendrier dans la carte**, comme l'application Calendrier,
   * plutôt que d'appeler le sélecteur du système : à l'intérieur d'une feuille, un
   * second panneau natif viendrait recouvrir le formulaire qu'on est en train de
   * remplir, et l'on perdrait de vue ce à quoi la date se rapporte.
   *
   * **L'heure, elle, reste au système** : `<input type="time">` ouvre sur iOS la
   * molette heure/minute d'Apple. En refaire une donnerait une copie sans retour
   * haptique ni VoiceOver à parité, pour un gain nul.
   */
  let {
    label,
    id,
    type = 'date',
    value = $bindable(''),
    min,
    max,
    step,
    icon: Icone,
    disabled = false,
    required = false
  }: {
    label: string;
    id: string;
    type?: 'date' | 'time';
    value?: string;
    min?: string;
    max?: string;
    step?: number;
    /** Icône de tête, comme les rangées de Rappels et de Calendrier. */
    icon?: unknown;
    disabled?: boolean;
    required?: boolean;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
  const enRangee = $derived(!!champ && champ.absorbable && requete.current);

  $effect(() => {
    if (enRangee) champ!.absorberLabel();
  });

  let calendrierOuvert = $state(false);

  const dateLisible = $derived.by(() => {
    const d = depuisIso(value);
    if (!d) return 'Choisir';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  });

  const PASTILLE =
    'rounded-lg bg-accent px-2.5 py-1 text-base text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
</script>

{#if enRangee}
  <div>
    <div data-field-row class="flex min-h-11 w-full items-center justify-between gap-3 px-3">
      {#if Icone}
        {@const I = Icone as any}
        <I class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {/if}
      <label for={id} class="min-w-0 flex-1 truncate text-base">{label}</label>

      {#if type === 'date'}
        <button
          type="button"
          {id}
          {disabled}
          aria-expanded={calendrierOuvert}
          onclick={() => (calendrierOuvert = !calendrierOuvert)}
          class={cn(PASTILLE, 'shrink-0')}
        >
          {dateLisible}
        </button>
      {:else}
        <!-- L'heure garde le contrôle natif : sur iOS, c'est la molette d'Apple. -->
        <input
          {id}
          type="time"
          {min}
          {max}
          {step}
          {disabled}
          {required}
          bind:value
          class={cn(PASTILLE, 'shrink-0 appearance-none text-right')}
        />
      {/if}
    </div>

    {#if type === 'date' && calendrierOuvert}
      <div class="border-t border-border">
        <InlineCalendar
          {value}
          {min}
          {max}
          onChoose={(iso) => {
            value = iso;
            calendrierOuvert = false;
          }}
        />
      </div>
    {/if}
  </div>
{:else}
  <Input {id} {type} {min} {max} {step} {disabled} {required} bind:value />
{/if}
