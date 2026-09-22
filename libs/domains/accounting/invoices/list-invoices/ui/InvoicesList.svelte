<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import type { Invoice } from './invoices-types';
  import { gestesDeFacture, ligneDeFacture, statutDeFacture, type GestesDeFacture } from './invoices-row-model';

  /**
   * Les factures en liste, au doigt.
   *
   * Cette table n'avait **aucune** vue mobile : six colonnes défilaient
   * horizontalement, ce que la doctrine interdit — et le menu d'actions se trouvait
   * au bout de ce défilement, donc hors d'atteinte sans le chercher.
   */
  let {
    invoices = [],
    isClosed = false,
    onPrint,
    onEdit,
    onStatusChange,
    onDelete
  }: { invoices?: Invoice[] } & GestesDeFacture = $props();

  const gestes = $derived({ isClosed, onPrint, onEdit, onStatusChange, onDelete });
</script>

<ListView
  items={invoices}
  emptyTitle="Aucune facture trouvée"
  emptyDescription="Aucune facture ne correspond aux critères sélectionnés."
>
  {#snippet listRow(inv)}
    {@const l = ligneDeFacture(inv)}
    {@const statut = statutDeFacture(inv)}
    <ListRow
      item={inv}
      onclick={isClosed || inv.status !== 'draft' ? undefined : () => onEdit(inv)}
      chevron={isClosed || inv.status !== 'draft' ? 'none' : true}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      actions={gestesDeFacture(inv, gestes)}
    >
      <!--
        Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
        propriété au composant. Les quatre statuts comptent ici — aucun n'est assez
        courant pour que son badge cesse d'être un signal.
      -->
      {#snippet badge()}
        <Badge variant={statut.variant as 'outline'} size="xs">{statut.label}</Badge>
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
