<script lang="ts">
  import { Check as CheckIcon, Circle, Link } from '@lucide/svelte';
  import { Badge, ListView, ListRow } from '@nba/ui';
  import type { CheckDepositState } from './check-deposit-state.svelte';
  import type { Check } from './check-deposit-types';
  import { chequeDisponible, gestesDeCheque, ligneDeCheque, signalementDeCheque } from './checks-row-model';

  /**
   * Les chèques du coffre, au doigt.
   *
   * L'écran sert à **préparer une remise** : l'appui sur une rangée la retient ou la
   * relâche, et c'est le geste central. Une case à cocher posée dans la rangée aurait
   * demandé de viser un carré de 20 px à côté d'une zone qui, elle, fait 52 px de haut ;
   * la rangée entière est la cible, et son état s'annonce par `aria-pressed`.
   *
   * Modifier et supprimer passent au balayage. Un chèque déjà inscrit sur un bordereau
   * n'offre ni l'un ni l'autre, et ne se retient plus : il appartient à cette remise.
   */
  let {
    depositState,
    seasonId,
    onEditCheck,
    onDeleteCheck
  }: {
    depositState: CheckDepositState;
    seasonId: string;
    onEditCheck: (check: Check) => void;
    onDeleteCheck: (id: number) => void;
  } = $props();

  const basculer = (check: Check) => {
    if (!chequeDisponible(check, depositState.isClosed)) return;
    depositState.selectedCheckIds[check.id] = !depositState.selectedCheckIds[check.id];
  };
</script>

<ListView
  items={depositState.filteredChecks}
  emptyTitle="Aucun chèque"
  emptyDescription="Aucun chèque en attente pour cette saison."
>
  {#snippet listRow(check)}
    {@const l = ligneDeCheque(check)}
    {@const marque = signalementDeCheque(check)}
    {@const retenable = chequeDisponible(check, depositState.isClosed)}
    {@const retenu = !!depositState.selectedCheckIds[check.id]}
    <ListRow
      item={check}
      onclick={retenable ? () => basculer(check) : undefined}
      selected={retenable ? retenu : undefined}
      chevron="none"
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      actions={gestesDeCheque(check, {
        isClosed: depositState.isClosed,
        onEdit: onEditCheck,
        onDelete: onDeleteCheck
      })}
    >
      {#snippet leading()}
        {#if retenable}
          {#if retenu}
            <CheckIcon class="size-5 text-primary" aria-hidden="true" />
          {:else}
            <Circle class="size-5 text-muted-foreground/40" aria-hidden="true" />
          {/if}
        {:else}
          <span class="size-5" aria-hidden="true"></span>
        {/if}
      {/snippet}

      <!--
        Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
        propriété au composant. C'est son contenu qui est conditionnel.
      -->
      {#snippet badge()}
        {#if marque}
          <Badge variant={marque.variant} size="xs">{marque.label}</Badge>
        {:else if check.memberId && check.memberName}
          <Badge variant="primary-soft" size="xs">
            <Link class="size-2.5" aria-hidden="true" />
            {check.memberName}
          </Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
