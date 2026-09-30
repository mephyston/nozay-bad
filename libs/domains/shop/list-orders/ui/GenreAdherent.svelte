<script lang="ts">
  import { Mars, Venus } from '@lucide/svelte';

  /**
   * Le sexe de l'adhérent, en symbole à côté de son nom.
   *
   * Les maillots existent en coupe homme et en coupe femme : le symbole permet de
   * repérer d'un coup d'œil une commande qui ne correspond pas à la personne. Rien
   * quand le sexe est inconnu, plutôt qu'un symbole au hasard.
   */
  let { gender, class: className = '' }: { gender?: 'M' | 'F' | null; class?: string } = $props();

  const libelle = $derived(gender === 'F' ? 'Femme' : 'Homme');
</script>

{#if gender === 'M' || gender === 'F'}
  <span class="inline-flex shrink-0 text-muted-foreground {className}" title={libelle}>
    {#if gender === 'F'}
      <Venus class="size-3.5" aria-hidden="true" />
    {:else}
      <Mars class="size-3.5" aria-hidden="true" />
    {/if}
    <span class="sr-only">{libelle}</span>
  </span>
{/if}
