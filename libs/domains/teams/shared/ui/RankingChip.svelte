<script lang="ts">
  import { RANKING_SERIES_COLORS, rankingSeries } from '../ranking';

  /**
   * Un classement fédéral, dans la couleur de sa série : rouge N, bleu R, vert D, jaune P.
   *
   * Une pastille plutôt qu'une lettre colorée : du texte jaune sur fond blanc ne se lit
   * pas, alors qu'un fond jaune sous un texte sombre se lit très bien. La série est aussi
   * nommée pour le lecteur d'écran — la couleur ne doit pas être seule à la porter.
   *
   * `NC` reste neutre (ce n'est pas une série), une case vide devient un tiret.
   */
  let { ranking = null, class: className = '' } = $props<{
    ranking?: string | null;
    class?: string;
  }>();

  const serie = $derived(rankingSeries(ranking));
  const couleurs = $derived(serie ? RANKING_SERIES_COLORS[serie] : null);
</script>

{#if !ranking}
  <span class="text-muted-foreground {className}">—</span>
{:else if couleurs}
  <span
    class="inline-flex min-w-[2.25em] justify-center rounded px-1 font-semibold tabular-nums leading-snug {className}"
    style="background-color: {couleurs.fond}; color: {couleurs.texte}"
    title={`Série ${couleurs.nom}`}
  >
    {ranking}<span class="sr-only"> (série {couleurs.nom})</span>
  </span>
{:else}
  <span
    class="inline-flex min-w-[2.25em] justify-center rounded border border-border px-1 font-semibold tabular-nums leading-snug text-muted-foreground {className}"
  >
    {ranking}
  </span>
{/if}
