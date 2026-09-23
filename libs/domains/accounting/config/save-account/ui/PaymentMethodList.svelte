<script lang="ts">
  import { Power } from '@lucide/svelte';
  import { Badge, ListRow, ListView, type SwipeAction } from '@nba/ui';
  import type { PaymentMethodRow } from './treasury-types';

  /**
   * Les moyens de paiement en liste, au doigt.
   *
   * La carte empilait le nom, la nature et le compte crédité en petits caractères, une
   * pastille, puis deux boutons sur une rangée qui se repliait. Ce qu'on vient vérifier
   * ici est **où va l'argent** : le compte crédité tient donc la droite.
   *
   * Un moyen interne ne se modifie pas — il est posé par la comptabilité elle-même, pour
   * les virements entre comptes du club. Il n'offre donc aucun geste, plutôt que des
   * boutons qui refuseraient.
   */
  let {
    paymentMethods = [],
    libelleDeNature,
    libelleDeCompte,
    canWrite = false,
    onEdit,
    onToggleActive
  }: {
    paymentMethods?: PaymentMethodRow[];
    libelleDeNature: (kind: PaymentMethodRow['kind']) => string;
    libelleDeCompte: (code: string) => string;
    canWrite?: boolean;
    onEdit: (method: PaymentMethodRow) => void;
    onToggleActive: (method: PaymentMethodRow) => void;
  } = $props();

  const modifiable = (m: PaymentMethodRow) => canWrite && m.kind !== 'internal';

  const gestes = (m: PaymentMethodRow): SwipeAction<PaymentMethodRow>[] =>
    modifiable(m)
      ? [
          {
            id: 'activer',
            label: m.active ? 'Désactiver' : 'Réactiver',
            icon: Power,
            run: () => onToggleActive(m)
          }
        ]
      : [];
</script>

<ListView
  items={paymentMethods}
  emptyTitle="Aucun moyen de paiement"
  emptyDescription="Ajoutez ce que le club accepte comme règlement."
>
  {#snippet listRow(method)}
    <ListRow
      item={method}
      onclick={modifiable(method) ? () => onEdit(method) : undefined}
      title={method.label}
      subtitle={libelleDeNature(method.kind)}
      value={libelleDeCompte(method.defaultAccountCode)}
      valueTone={method.active ? 'foreground' : 'muted'}
      valueCaption="compte crédité"
      actions={gestes(method)}
      class={method.active ? undefined : 'opacity-60'}
    >
      {#snippet badge()}
        <!--
          Seules les exceptions : un moyen actif et proposé à la boutique est le cas
          courant, et le tableau le badgeait pourtant « Boutique » sur chaque ligne.
        -->
        {#if !method.active}
          <Badge variant="secondary" size="xs">Inactif</Badge>
        {:else if !method.storefront}
          <Badge variant="info" size="xs">Admin seulement</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
