<script lang="ts">
  import { Badge, Button, ListView, ListRow } from '@nba/ui';
  import {
    gestesDeRedirection,
    ligneDeRedirection,
    signalementsDeRedirection,
    type GestesDeRedirection,
    type RedirectionLike
  } from './redirects-row-model';

  /**
   * Les redirections en liste, au doigt.
   *
   * Sept colonnes devenaient une carte portant deux boutons pleine largeur **et** un
   * bouton de dépliage pour lire l'adresse en entier — trois affordances par rangée.
   * L'ancienne adresse identifie, la cible situe, le nombre de visites tient la droite,
   * et les deux gestes passent au balayage.
   */
  let {
    redirections = [],
    emptyTitle,
    emptyDescription,
    ...gestes
  }: {
    redirections?: RedirectionLike[];
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeRedirection = $props();

  /*
    Par tranches, et non par pages numérotées : une pagination à numéros demande de
    viser un chiffre de huit pixels, là où le pouce ne sait que pousser vers le bas.
  */
  const PAR_TRANCHE = 20;
  let visibles = $state(PAR_TRANCHE);

  /* Un changement de critère repart du début : la tranche d'une autre liste n'a pas de sens. */
  $effect(() => {
    void redirections;
    visibles = PAR_TRANCHE;
  });

  const rangees = $derived(redirections.slice(0, visibles));
  const reste = $derived(Math.max(redirections.length - rangees.length, 0));
</script>

<ListView items={rangees} {emptyTitle} {emptyDescription}>
  {#snippet listRow(r)}
    {@const l = ligneDeRedirection(r)}
    <ListRow
      item={r}
      onclick={gestes.canWrite ? () => gestes.onEdit(r) : undefined}
      chevron={gestes.canWrite ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption={l.legende}
      actions={gestesDeRedirection(r, gestes)}
    >
      {#snippet badge()}
        {#each signalementsDeRedirection(r) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>

{#if reste > 0}
  <div class="space-y-2 px-4 py-3">
    <p class="text-center text-xs text-muted-foreground">{rangees.length} sur {redirections.length}</p>
    <Button variant="outline" class="w-full" onclick={() => (visibles += PAR_TRANCHE)}>
      Afficher les {Math.min(reste, PAR_TRANCHE)} suivantes
    </Button>
  </div>
{/if}
