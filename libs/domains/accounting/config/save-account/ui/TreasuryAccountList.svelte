<script lang="ts">
  import { Pencil, Power } from '@lucide/svelte';
  import { Badge, ListRow, ListView, type SwipeAction } from '@nba/ui';
  import type { TreasuryAccountRow } from './treasury-types';

  /**
   * Les comptes de trésorerie en liste, au doigt.
   *
   * La carte portait le nom, le code et la classe en petites capitales, une pastille de
   * nature, puis deux boutons — « Désactiver » et « Modifier » — sur une rangée qui se
   * repliait.
   *
   * À droite, le **numéro sur les relevés**, et non le code : celui-ci est un
   * identifiant interne — « current », « cash » — que rien ne rapproche d'un relevé
   * bancaire, alors que le numéro, lui, est ce qu'on y lit.
   *
   * Un compte de tiers ne se modifie pas : il est créé et tenu par la comptabilité
   * elle-même. Il n'offre donc aucun geste, plutôt que des boutons qui refuseraient.
   */
  let {
    accounts = [],
    libelleDeNature,
    canWrite = false,
    onEdit,
    onToggleActive
  }: {
    accounts?: TreasuryAccountRow[];
    /** Le catalogue des natures vit dans l'écran : il sert aussi à son formulaire. */
    libelleDeNature: (kind: TreasuryAccountRow['kind']) => string;
    canWrite?: boolean;
    onEdit: (account: TreasuryAccountRow) => void;
    onToggleActive: (account: TreasuryAccountRow) => void;
  } = $props();

  const modifiable = (a: TreasuryAccountRow) => canWrite && a.kind !== 'third_party';

  const gestes = (a: TreasuryAccountRow): SwipeAction<TreasuryAccountRow>[] =>
    modifiable(a)
      ? [
          {
            id: 'activer',
            label: a.active ? 'Désactiver' : 'Réactiver',
            icon: Power,
            run: () => onToggleActive(a)
          }
        ]
      : [];
</script>

<ListView
  items={accounts}
  emptyTitle="Aucun compte"
  emptyDescription="Créez le compte bancaire du club pour ouvrir la comptabilité."
>
  {#snippet listRow(account)}
    <ListRow
      item={account}
      onclick={modifiable(account) ? () => onEdit(account) : undefined}
      title={account.label}
      subtitle={`${libelleDeNature(account.kind)} · classe ${account.classCode}`}
      value={account.statementAccountNumber ?? '—'}
      valueTone={account.statementAccountNumber && account.active ? 'foreground' : 'muted'}
      valueCaption={account.statementAccountNumber ? 'sur les relevés' : 'aucun numéro'}
      actions={gestes(account)}
      class={account.active ? undefined : 'opacity-60'}
    >
      {#snippet badge()}
        {#if !account.active}
          <!-- Seule exception badgée : un compte inactif ne reçoit plus d'écriture. -->
          <Badge variant="secondary" size="xs">Inactif</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
