<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';
  import { Input } from '../ui/input/index.js';
  import InlineCalendar, { depuisIso } from './InlineCalendar.svelte';
  import { composerDateHeure, partieDate, partieHeure } from '../../lib/date-heure.js';

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
   *
   * **`datetime-local` rend les deux, l'une sous l'autre** — la date puis l'heure,
   * comme dans Calendrier. Le contrôle natif unique tient sur une rangée à la
   * souris, mais sur un téléphone il n'affiche qu'un `jj/mm/aaaa --:--` minuscule
   * dont chaque moitié se vise au pixel.
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
    onChange,
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
    /** Icône de tête, comme les rangées de Rappels et de Calendrier. */
    icon?: unknown;
    /**
     * Prévenu après chaque saisie, pour les écrans qui en déduisent autre chose — la
     * fin d'un événement qui suit son début, par exemple. Le pendant de `onChange` sur
     * {@link ChoiceField} : sans lui, il faudrait un effet qui se déclencherait aussi
     * à l'ouverture du formulaire, et décalerait la fin sans qu'on ait rien touché.
     */
    onChange?: (valeur: string) => void;
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

  /*
    Un `datetime-local` s'écrit « AAAA-MM-JJTHH:MM ». On le scinde pour l'afficher en
    deux rangées et on le recompose à chaque saisie : la valeur que l'appelant lie ne
    change jamais de forme, et son `min`/`max` reste comparable tel quel.
  */
  const estCouple = $derived(type === 'datetime-local');
  const jour = $derived(partieDate(value));
  const heure = $derived(partieHeure(value));
  const borneDate = (borne?: string) => partieDate(borne) || undefined;

  function poser(v: string) {
    value = v;
    onChange?.(v);
  }

  const poserDate = (v: string) => poser(composerDateHeure(v, heure));
  const poserHeure = (v: string) => poser(composerDateHeure(jour, v));

  const dateLisible = $derived.by(() => {
    const d = depuisIso(type === 'datetime-local' ? partieDate(value) : value);
    if (!d) return 'Choisir';
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  });

  const PASTILLE =
    'rounded-lg bg-accent px-2.5 py-1 text-base text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
</script>

{#if enRangee && estCouple}
  <!--
    Deux rangées, une seule valeur : la date ouvre le calendrier, l'heure garde la
    molette du système.

    Le cadre est porté ici, comme les autres champs en rangée le portent : sans lui,
    ces rangées flottaient entre des champs cerclés. `FieldGroup` le retire de
    lui-même quand plusieurs champs partagent une même carte.
  -->
  <div class="border-input dark:bg-input/30 divide-y divide-border overflow-hidden rounded-lg border bg-transparent">
    <div data-field-row class="flex min-h-11 w-full items-center justify-between gap-3 px-3">
      {#if Icone}
        {@const I = Icone as any}
        <I class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {/if}
      <label for={id} class="min-w-0 flex-1 truncate text-base">{label}</label>
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
    </div>

    {#if calendrierOuvert}
      <div>
        <InlineCalendar
          value={jour}
          min={borneDate(min)}
          max={borneDate(max)}
          onChoose={(iso) => {
            poserDate(iso);
            calendrierOuvert = false;
          }}
        />
      </div>
    {/if}

    <div data-field-row class="flex min-h-11 w-full items-center justify-between gap-3 px-3">
      <label for={`${id}-heure`} class="min-w-0 flex-1 truncate text-base text-muted-foreground">
        Heure
      </label>
      <input
        id={`${id}-heure`}
        type="time"
        {step}
        {disabled}
        {required}
        value={heure}
        onchange={(e) => poserHeure((e.currentTarget as HTMLInputElement).value)}
        class={cn(PASTILLE, 'shrink-0 appearance-none text-right')}
      />
    </div>
  </div>
{:else if enRangee}
  <div class="border-input dark:bg-input/30 divide-y divide-border overflow-hidden rounded-lg border bg-transparent">
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
          {value}
          onchange={(e) => poser((e.currentTarget as HTMLInputElement).value)}
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
            poser(iso);
            calendrierOuvert = false;
          }}
        />
      </div>
    {/if}
  </div>
{:else}
  <Input
    {id}
    {type}
    {min}
    {max}
    {step}
    {disabled}
    {required}
    {value}
    onchange={(e) => poser((e.currentTarget as HTMLInputElement).value)}
  />
{/if}
