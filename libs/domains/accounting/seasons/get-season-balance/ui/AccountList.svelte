<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import type { AccountEntry } from './account-types';
  import type { AccountLike } from '../../../shared/account-labels';
  import { gestesDeMouvement, ligneDeCompte } from './account-row-model';

  /**
   * Les mouvements d'un compte, au doigt.
   *
   * La table masquait la date sous 768 px et la catégorie sous 640 : il ne restait que
   * la description et le montant, et le menu d'actions au bout d'une colonne étroite.
   * La rangée dit tout en deux lignes, et les gestes passent au balayage.
   */
  let {
    transactions = [],
    accounts = [],
    isClosed = false,
    canWrite = true,
    canDelete = true,
    onEdit,
    onDelete
  }: {
    transactions?: AccountEntry[];
    accounts?: AccountLike[];
    isClosed?: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
    onEdit?: (tx: AccountEntry) => void;
    onDelete: (id: number) => void;
  } = $props();
</script>

<ListView
  items={transactions}
  emptyTitle="Aucun mouvement"
  emptyDescription="Aucun mouvement sur ce compte pour cette saison."
>
  {#snippet listRow(tx)}
    {@const l = ligneDeCompte(tx, accounts)}
    <ListRow
      item={tx}
      onclick={isClosed || !onEdit || !canWrite ? undefined : () => onEdit(tx)}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      actions={gestesDeMouvement(tx, { isClosed, canWrite, canDelete, onEdit, onDelete })}
    >
      <!--
        Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
        propriété au composant. C'est son contenu qui est conditionnel.
      -->
      {#snippet badge()}
        {#if tx.memberName}
          <Badge variant="primary-soft" size="xs">{tx.memberName}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
