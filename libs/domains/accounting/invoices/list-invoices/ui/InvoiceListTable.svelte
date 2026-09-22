<script lang="ts">
  import { DataTable, DataTableColumnHeader } from '@nba/ui';
  import type { Invoice } from './invoices-types';
  import InvoiceRow from './InvoiceRow.svelte';
  import InvoicesList from './InvoicesList.svelte';

  let {
    filteredInvoices = [],
    isClosed = false,
    onPrint,
    onEdit,
    onStatusChange,
    onDelete,
    toolbar
  }: {
    filteredInvoices: Invoice[];
    isClosed?: boolean;
    onPrint: (id: number) => void;
    onEdit: (inv: Invoice) => void;
    onStatusChange: (id: number, status: 'sent' | 'paid' | 'cancelled') => void;
    onDelete: (id: number, invoiceNumber: string) => void;
    toolbar?: import('svelte').Snippet;
  } = $props();


</script>


<DataTable
  data={filteredInvoices}
  mobileSpacing="list"
  emptyTitle="Aucune facture trouvée"
  emptyDescription="Aucune facture ne correspond aux critères sélectionnés."
  {toolbar}
>
  {#snippet mobileView()}
    <InvoicesList
      invoices={filteredInvoices}
      {isClosed}
      {onPrint}
      {onEdit}
      {onStatusChange}
      {onDelete}
    />
  {/snippet}

  {#snippet header()}
    <DataTableColumnHeader title="N° Facture" />
    <DataTableColumnHeader title="Client" />
    <DataTableColumnHeader title="Date" />
    <DataTableColumnHeader title="Montant" class="text-right" />
    <DataTableColumnHeader title="Statut" class="text-center" />
    <DataTableColumnHeader title="Actions" class="text-right" />
  {/snippet}

  {#snippet row(inv)}
    <InvoiceRow
      {inv}
      {isClosed}
      {onPrint}
      {onEdit}
      {onStatusChange}
      {onDelete}
    />
  {/snippet}
</DataTable>
