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
   * `onBrowse` détourne cet appui vers un choix maison — la médiathèque du site,
   * où une image déjà déposée se réemploie d'un article à l'autre. La rangée, la
   * vignette et le retrait ne changent pas : choisir une image doit se présenter
   * pareil partout, que le fichier vienne du téléphone ou de la bibliothèque.
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
    max = Infinity,
    hint,
    disabled = false,
    names,
    onSelect,
    onBrowse,
    onClear
  }: {
    label: string;
    id: string;
    /** Adresse de l'aperçu courant, ou la liste des aperçus. */
    preview?: string | string[] | null;
    accept?: string;
    /**
     * Combien d'images le champ admet.
     *
     * Au-delà, l'appui **remplace** — et le dit. Une couverture d'article ou la
     * photo d'un produit n'en admettent qu'une : leur rangée proposait pourtant
     * « Ajouter une image… », alors que la suivante chassait la précédente.
     */
    max?: number;
    hint?: string;
    disabled?: boolean;
    /** Le nom de chaque aperçu ; « Image » à défaut. */
    names?: string[];
    /** Dépôt depuis l'appareil. Ignoré quand `onBrowse` prend la main. */
    onSelect?: (file: File) => void;
    /** Choix dans une bibliothèque : remplace le sélecteur du système. */
    onBrowse?: () => void;
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

  /** Le nom affiché d'une image : celui que l'écran donne, « Image » à défaut. */
  const noms = $derived(
    apercus.map((_, i) => names?.[i] || (apercus.length > 1 ? `Image ${i + 1}` : 'Image'))
  );

  const ouvrir = () => (onBrowse ? onBrowse() : saisie?.click());

  /* Au complet, l'appui remplace : le dire évite de chercher d'abord à retirer. */
  const verbe = $derived(apercus.length >= max ? 'Remplacer l’image' : 'Ajouter une image');
  const invite = $derived(apercus.length === 0 ? label : verbe);
  const inviteBouton = $derived(apercus.length === 0 ? 'Choisir une image' : verbe);

  let saisie = $state<HTMLInputElement | null>(null);

  function choisir(event: Event) {
    const fichier = (event.currentTarget as HTMLInputElement).files?.[0];
    if (fichier) onSelect?.(fichier);
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
        onclick={ouvrir}
        class="flex min-h-11 w-full items-center gap-3 px-3 text-left text-base disabled:pointer-events-none disabled:opacity-50"
      >
        <ImagePlus class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-muted-foreground">{invite}…</span>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
      </button>
    {:else}
      <Button type="button" variant="outline" {disabled} onclick={ouvrir} class="gap-1.5">
        <ImagePlus class="size-4" />
        {inviteBouton}
      </Button>
    {/if}

    {@render lignesImages()}
  </div>

  {#if hint}
    <p class={cn('text-xs text-muted-foreground', enRangee ? 'px-4 pt-2' : 'pt-3')}>{hint}</p>
  {/if}
</div>
