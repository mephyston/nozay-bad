<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import type { CheckDeposit } from './check-deposit-types';
  import { gestesDeRemise, ligneDeRemise, statutDeRemise, type GestesDeRemise } from './checks-row-model';

  /**
   * Les bordereaux de remise, au doigt.
   *
   * Une rangée dit la référence, sa date et son total ; son statut tient le badge, et
   * c'est lui qui porte l'état du rapprochement — « encaissée » **est** le
   * rapprochement, l'écrire une seconde fois en toutes lettres n'ajoutait rien.
   */
  let {
    deposits = [],
    isClosed = false,
    onConsulter,
    onConfirmer,
    onEncaisser,
    onSupprimer
  }: { deposits?: CheckDeposit[] } & GestesDeRemise = $props();

  const gestes = $derived({ isClosed, onConsulter, onConfirmer, onEncaisser, onSupprimer });
</script>

<ListView
  items={deposits}
  emptyTitle="Aucun bordereau"
  emptyDescription="Aucun bordereau de remise enregistré."
>
  {#snippet listRow(dep)}
    {@const l = ligneDeRemise(dep)}
    {@const statut = statutDeRemise(dep)}
    <ListRow
      item={dep}
      onclick={() => onConsulter(dep)}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      actions={gestesDeRemise(dep, gestes)}
    >
      {#snippet badge()}
        <Badge variant={statut.variant as 'success'} size="xs">{statut.label}</Badge>
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
