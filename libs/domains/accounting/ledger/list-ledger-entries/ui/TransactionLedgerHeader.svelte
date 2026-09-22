<script lang="ts">
  import { Badge, PageHeader } from '@nba/ui';

  /**
   * Le titre du journal, et la seule chose qui doive l'accompagner : l'état de la
   * saison.
   *
   * Il portait aussi une bande de jetons pour les critères posés par un lien de
   * rapport — catégorie, classe, régularisation — qui ne se retiraient que d'un bloc,
   * et qui vivaient loin des autres critères. Ils sont désormais au-dessus de la
   * liste, avec ceux de la barre d'outils, et se retirent un à un.
   */
  let { isClosed = false }: { isClosed?: boolean } = $props();
</script>

<PageHeader title="Journal des écritures">
  {#snippet actions()}
    {#if isClosed}
      <Badge variant="secondary" size="lg" shape="square">Saison clôturée (Lecture seule)</Badge>
    {/if}
  {/snippet}
</PageHeader>
