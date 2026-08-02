<script lang="ts">
  import { Edit, Trash2, Printer, Send, Ban, CheckCircle2 } from '@lucide/svelte';
  import { Button, Table, Badge, Amount, DropdownMenu, DataTableRowActions } from '@nba/ui';
  import type { Invoice } from './invoices-types';

  let {
    inv,
    isClosed = false,

    onPrint,
    onEdit,
    onStatusChange,
    onDelete
  }: {
    inv: Invoice;
    isClosed?: boolean;

    onPrint: (id: number) => void;
    onEdit: (inv: Invoice) => void;
    onStatusChange: (id: number, status: 'sent' | 'paid' | 'cancelled') => void;
    onDelete: (id: number, invoiceNumber: string) => void;
  } = $props();

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground border-transparent',
    sent:'bg-info/10 text-info border-transparent',
    paid:'bg-success/10 text-success border-transparent',
    cancelled:'bg-destructive/10 text-destructive border-transparent'
  };

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'En attente de règlement',
    paid: 'Payée',
    cancelled: 'Annulée'
  };


</script>

<Table.Row>
  <Table.Cell class="font-semibold text-foreground">{inv.invoiceNumber}</Table.Cell>
  <Table.Cell class="font-medium text-foreground">{inv.clientName}</Table.Cell>
  <Table.Cell class="text-muted-foreground">{inv.date}</Table.Cell>
  <Table.Cell class="text-right font-bold text-foreground">
    <Amount cents={(inv as any).totalAmountCents ?? inv.totalAmount} />
  </Table.Cell>
  <Table.Cell class="text-center">
    <Badge variant="outline" class={statusColors[inv.status]}>
      {statusLabels[inv.status]}
    </Badge>
  </Table.Cell>
  <Table.Cell class="text-right relative">
    <div class="inline-flex items-center justify-end gap-1.5">
      <Button variant="ghost" size="icon" onclick={() => onPrint(inv.id)} title="Imprimer" class="p-1.5">
        <Printer class="w-4 h-4" />
      </Button>
      {#if !isClosed}
        <DataTableRowActions>
          {#if inv.status === 'draft'}
            <DropdownMenu.Item
              onclick={() => { onEdit(inv); }}
              class="cursor-pointer"
            >
              <Edit class="w-3.5 h-3.5 mr-2" /> Modifier
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => { onStatusChange(inv.id, 'sent'); }}
              class="text-info focus:text-info cursor-pointer"
            >
              <Send class="w-3.5 h-3.5 mr-2" /> Marquer en attente de règlement
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => { onStatusChange(inv.id, 'cancelled'); }}
              class="text-destructive focus:text-destructive cursor-pointer"
            >
              <Ban class="w-3.5 h-3.5 mr-2" /> Annuler la facture
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => { onDelete(inv.id, inv.invoiceNumber); }}
              class="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5 mr-2" /> Supprimer
            </DropdownMenu.Item>
          {/if}
          {#if inv.status === 'sent'}
            <DropdownMenu.Item
              onclick={() => { onStatusChange(inv.id, 'paid'); }}
              class="text-success focus:text-success cursor-pointer"
            >
              <CheckCircle2 class="w-3.5 h-3.5 mr-2" /> Marquer comme payée
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onclick={() => { onStatusChange(inv.id, 'cancelled'); }}
              class="text-destructive focus:text-destructive cursor-pointer"
            >
              <Ban class="w-3.5 h-3.5 mr-2" /> Annuler la facture
            </DropdownMenu.Item>
          {/if}
          {#if inv.status === 'cancelled'}
            <DropdownMenu.Item
              onclick={() => { onDelete(inv.id, inv.invoiceNumber); }}
              class="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5 mr-2" /> Supprimer
            </DropdownMenu.Item>
          {/if}
        </DataTableRowActions>
      {/if}
    </div>
  </Table.Cell>
</Table.Row>
