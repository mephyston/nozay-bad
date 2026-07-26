<script lang="ts">
  import { FileText } from '@lucide/svelte';
  import { Card, Table } from '@nba/ui';
  import type { Invoice } from './invoices-types';
  import InvoiceRow from './InvoiceRow.svelte';

  let {
    filteredInvoices = [],
    isClosed = false,
    onPrint,
    onEdit,
    onStatusChange,
    onDelete
  }: {
    filteredInvoices: Invoice[];
    isClosed?: boolean;
    onPrint: (id: number) => void;
    onEdit: (inv: Invoice) => void;
    onStatusChange: (id: number, status: 'sent' | 'cancelled') => void;
    onDelete: (id: number, invoiceNumber: string) => void;
  } = $props();


</script>

{#if filteredInvoices.length === 0}
  <Card.Root class="text-center py-16">
    <Card.Content>
      <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
      <h3 class="text-lg font-bold text-foreground">Aucune facture trouvée</h3>
      <p class="text-sm text-muted-foreground mt-1">Aucune facture ne correspond aux critères sélectionnés.</p>
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root class="overflow-hidden shadow-sm">
    <Card.Content class="p-0">
      <div class="overflow-x-auto min-h-[240px]">
        <Table.Root class="w-full text-left border-collapse text-sm">
          <Table.Header>
            <Table.Row>
              <Table.Head>N° Facture</Table.Head>
              <Table.Head>Client</Table.Head>
              <Table.Head>Objet</Table.Head>
              <Table.Head>Date</Table.Head>
              <Table.Head>Échéance</Table.Head>
              <Table.Head class="text-right">Montant</Table.Head>
              <Table.Head class="text-center">Statut</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredInvoices as inv (inv.id)}
              <InvoiceRow
                {inv}
                {isClosed}
                {onPrint}
                {onEdit}
                {onStatusChange}
                {onDelete}
              />
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    </Card.Content>
  </Card.Root>
{/if}
