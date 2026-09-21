<script lang="ts" module>
  const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

  /** `2026-09-21` → `Date` locale, sans passer par l'UTC d'un `new Date(iso)`. */
  export function depuisIso(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  export function versIso(d: Date): string {
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mois}-${jour}`;
  }
</script>

<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { cn } from '../../lib/utils.js';

  /**
   * Le calendrier qui se déplie sous une date, comme dans l'application Calendrier.
   *
   * Semaine commençant le lundi, mois glissant par les deux chevrons, jour retenu
   * en pastille pleine. Écrit ici plutôt que tiré d'une bibliothèque : il ne fait
   * qu'une grille de sept colonnes, et une dépendance de calendrier coûterait plus
   * en poids et en surface d'API qu'elle ne rendrait.
   */
  let {
    value = '',
    onChoose,
    min,
    max
  }: {
    value?: string;
    onChoose: (iso: string) => void;
    min?: string;
    max?: string;
  } = $props();

  const retenu = $derived(depuisIso(value));
  let curseur = $state(retenu ?? new Date());

  // Le mois affiché suit la valeur choisie ailleurs (saisie au clavier, réouverture).
  $effect(() => {
    const d = depuisIso(value);
    if (d) curseur = new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const titre = $derived(
    new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(curseur)
  );

  /** Les cases du mois, précédées des vides qui calent le premier jour sur son lundi. */
  const cases = $derived.by(() => {
    const premier = new Date(curseur.getFullYear(), curseur.getMonth(), 1);
    const decalage = (premier.getDay() + 6) % 7;
    const jours = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: decalage }, () => null),
      ...Array.from({ length: jours }, (_, i) => new Date(curseur.getFullYear(), curseur.getMonth(), i + 1)),
    ];
  });

  const horsBornes = (d: Date) => {
    const iso = versIso(d);
    return (min !== undefined && iso < min) || (max !== undefined && iso > max);
  };

  const glisser = (pas: number) => {
    curseur = new Date(curseur.getFullYear(), curseur.getMonth() + pas, 1);
  };
</script>

<div class="px-3 pb-3 pt-2">
  <div class="flex items-center justify-between">
    <span class="text-base font-semibold first-letter:uppercase">{titre}</span>
    <div class="flex items-center gap-1">
      <button
        type="button"
        onclick={() => glisser(-1)}
        aria-label="Mois précédent"
        class="flex size-9 items-center justify-center rounded-full text-primary hover:bg-muted"
      >
        <ChevronLeft class="size-5" />
      </button>
      <button
        type="button"
        onclick={() => glisser(1)}
        aria-label="Mois suivant"
        class="flex size-9 items-center justify-center rounded-full text-primary hover:bg-muted"
      >
        <ChevronRight class="size-5" />
      </button>
    </div>
  </div>

  <div class="mt-2 grid grid-cols-7 gap-y-1 text-center">
    {#each JOURS as jour (jour)}
      <span class="text-xs font-medium uppercase text-muted-foreground">{jour}</span>
    {/each}

    {#each cases as jour, index (index)}
      {#if jour === null}
        <span></span>
      {:else}
        {@const choisi = !!retenu && versIso(jour) === versIso(retenu)}
        <button
          type="button"
          disabled={horsBornes(jour)}
          aria-current={choisi ? 'date' : undefined}
          onclick={() => onChoose(versIso(jour))}
          class={cn(
            'mx-auto flex size-10 items-center justify-center rounded-full text-base',
            choisi ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-muted',
            'disabled:pointer-events-none disabled:opacity-30'
          )}
        >
          {jour.getDate()}
        </button>
      {/if}
    {/each}
  </div>
</div>
