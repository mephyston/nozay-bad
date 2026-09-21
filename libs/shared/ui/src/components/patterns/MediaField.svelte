<script lang="ts">
  import { getContext } from 'svelte';
  import { ChevronRight, ImagePlus, Minus } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import { cn } from '../../lib/utils.js';
  import { creerIsMobile } from '../../lib/hooks/is-mobile.svelte.js';
  import { CLE_CHAMP, type ContexteChamp } from './FormField.svelte';

  /**
   * Le choix d'une image, en rangée comme les autres champs.
   *
   * L'appui ouvre le sélecteur du système — et rien d'autre. Sur iOS, c'est lui qui
   * propose « Photothèque », « Prendre une photo » et « Choisir un fichier » : y
   * superposer notre propre menu ferait deux étapes au lieu d'une, et la troisième
   * entrée qu'on serait tenté d'y mettre, « Scanner un document », n'existe pas sur
   * le web — aucune interface ne la déclenche. Le chevron simple est donc juste :
   * on part ailleurs, chez le système.
   *
   * Chaque image retenue devient **sa propre rangée**, sous celle d'ajout : pastille
   * rouge au signe moins à gauche, vignette, puis le nom. C'est la forme qu'emploie
   * Rappels, et elle vaut mieux qu'une grille de vignettes — le retrait a sa cible
   * pleine hauteur, loin de celle qui ajoute.
   */
  let {
    label,
    id,
    preview = null,
    accept = 'image/png,image/jpeg,image/webp',
    hint,
    disabled = false,
    onSelect,
    onClear
  }: {
    label: string;
    id: string;
    /** Adresse de l'aperçu courant, ou la liste des aperçus. */
    preview?: string | string[] | null;
    accept?: string;
    hint?: string;
    disabled?: boolean;
    onSelect: (file: File) => void;
    /** Reçoit l'index de la vignette retirée ; `0` quand il n'y en a qu'une. */
    onClear?: (index: number) => void;
  } = $props();

  const requete = creerIsMobile();
  const champ = getContext<ContexteChamp | undefined>(CLE_CHAMP);
  const enRangee = $derived(!!champ && champ.absorbable && requete.current);

  $effect(() => {
    if (enRangee) champ!.absorberLabel();
  });

  const apercus = $derived(
    preview === null || preview === undefined ? [] : Array.isArray(preview) ? preview : [preview]
  );

  /** Le nom affiché d'une image : celui du fichier retenu, « Image » à défaut. */
  const noms = $derived(apercus.map((_, i) => (apercus.length > 1 ? `Image ${i + 1}` : 'Image')));

  let saisie = $state<HTMLInputElement | null>(null);

  function choisir(event: Event) {
    const fichier = (event.currentTarget as HTMLInputElement).files?.[0];
    if (fichier) onSelect(fichier);
  }
</script>

<!-- Le champ lui-même reste hors du flux : c'est la rangée qui le déclenche. -->
<input {id} bind:this={saisie} type="file" {accept} class="sr-only" onchange={choisir} {disabled} />

{#snippet lignesImages()}
  {#each apercus as apercu, index (apercu)}
    <div data-field-row class="flex min-h-11 items-center gap-3 px-3 py-2">
      {#if onClear}
        <!-- La pastille au signe moins d'iOS, en tête de la rangée qu'elle retire. -->
        <button
          type="button"
          onclick={() => onClear?.(index)}
          aria-label={`Retirer ${noms[index]}`}
          class="bg-destructive text-destructive-foreground flex size-6 shrink-0 items-center justify-center rounded-full"
        >
          <Minus class="size-4" aria-hidden="true" />
        </button>
      {/if}
      <img
        src={apercu}
        alt=""
        class="size-9 shrink-0 rounded-md border border-border bg-muted/30 object-contain"
      />
      <span class="min-w-0 flex-1 truncate text-base">{noms[index]}</span>
    </div>
  {/each}
{/snippet}

<div class="w-full">
  <div class={cn(enRangee ? 'divide-y divide-border overflow-hidden rounded-lg border border-input dark:bg-input/30' : 'space-y-3')}>
    {#if enRangee}
      <button
        type="button"
        {disabled}
        data-field-row
        onclick={() => saisie?.click()}
        class="flex min-h-11 w-full items-center gap-3 px-3 text-left text-base disabled:pointer-events-none disabled:opacity-50"
      >
        <ImagePlus class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-muted-foreground">
          {apercus.length > 0 ? 'Ajouter une image…' : `${label}…`}
        </span>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
      </button>
    {:else}
      <Button type="button" variant="outline" {disabled} onclick={() => saisie?.click()} class="gap-1.5">
        <ImagePlus class="size-4" />
        {apercus.length > 0 ? 'Ajouter une image' : 'Choisir une image'}
      </Button>
    {/if}

    {@render lignesImages()}
  </div>

  {#if hint}
    <p class={cn('text-xs text-muted-foreground', enRangee ? 'px-4 pt-2' : 'pt-3')}>{hint}</p>
  {/if}
</div>
