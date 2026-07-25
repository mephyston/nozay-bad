<script lang="ts">
  import { Edit, Trash2, Printer, Send, Ban, MoreVertical } from '@lucide/svelte';
  import { Button, Table, Badge, Amount } from '@nba/ui';
  import type { Invoice } from './invoices-types';

  let {
    inv,
    isClosed = false,
    openMenuId = $bindable(null),
    onPrint,
    onEdit,
    onStatusChange,
    onDelete
  }: {
    inv: Invoice;
    isClosed?: boolean;
    openMenuId: number | null;
    onPrint: (id: number) => void;
    onEdit: (inv: Invoice) => void;
    onStatusChange: (id: number, status: 'sent' | 'cancelled') => void;
    onDelete: (id: number, invoiceNumber: string) => void;
  } = $props();

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground border-transparent',
    sent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent',
    paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent',
    cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-transparent'
  };

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    paid: 'Payée',
    cancelled: 'Annulée'
  };

  function toggleMenu(id: number, e: MouseEvent) {
    e.stopPropagation();
    openMenuId = openMenuId === id ? null : id;
  }
</script>

<Table.Row class="hover:bg-muted/50 transition-colors">
  <Table.Cell class="p-4 font-semibold text-foreground">{inv.invoiceNumber}</Table.Cell>
  <Table.Cell class="p-4 font-medium text-foreground">{inv.clientName}</Table.Cell>
  <Table.Cell class="p-4 text-muted-foreground max-w-xs truncate">{inv.subject || '—'}</Table.Cell>
  <Table.Cell class="p-4 text-muted-foreground">{inv.date}</Table.Cell>
  <Table.Cell class="p-4 text-muted-foreground">{inv.dueDate}</Table.Cell>
  <Table.Cell class="p-4 text-right font-bold text-foreground">
    <Amount cents={(inv as any).totalAmountCents ?? inv.totalAmount} />
  </Table.Cell>
  <Table.Cell class="p-4 text-center">
    <Badge variant="outline" class={statusColors[inv.status]}>
      {statusLabels[inv.status]}
    </Badge>
  </Table.Cell>
  <Table.Cell class="p-4 text-right relative">
    <div class="inline-flex items-center justify-end gap-1.5">
      <Button variant="ghost" size="icon" onclick={() => onPrint(inv.id)} title="Imprimer" class="p-1.5">
        <Printer class="w-4 h-4" />
      </Button>
      {#if !isClosed}
        <div class="relative inline-block">
          <Button variant="ghost" size="icon" onclick={(e) => toggleMenu(inv.id, e)} class="p-1.5">
            <MoreVertical class="w-4 h-4" />
          </Button>
          {#if openMenuId === inv.id}
            <div class="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden text-left animate-in fade-in duration-200">
              {#if inv.status === 'draft'}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => { openMenuId = null; onEdit(inv); }}
                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                >
                  <Edit class="w-3.5 h-3.5" /> Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => { openMenuId = null; onStatusChange(inv.id, 'sent'); }}
                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                >
                  <Send class="w-3.5 h-3.5" /> Marquer envoyée
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => { openMenuId = null; onStatusChange(inv.id, 'cancelled'); }}
                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                >
                  <Ban class="w-3.5 h-3.5" /> Annuler la facture
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => { openMenuId = null; onDelete(inv.id, inv.invoiceNumber); }}
                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" /> Supprimer
                </Button>
              {/if}
              {#if inv.status === 'sent'}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => { openMenuId = null; onStatusChange(inv.id, 'cancelled'); }}
                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                >
                  <Ban class="w-3.5 h-3.5" /> Annuler la facture
                </Button>
              {/if}
              {#if inv.status === 'cancelled'}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => { openMenuId = null; onDelete(inv.id, inv.invoiceNumber); }}
                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" /> Supprimer
                </Button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </Table.Cell>
</Table.Row>
