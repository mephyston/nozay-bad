<script lang="ts">
  import { Check, AlertCircle } from '@lucide/svelte';
  import { Plus } from '@lucide/svelte';
  import { Alert, AlertDialog, Button, DataTableToolbar, FormField } from '@nba/ui';
  import type { Invoice, Season } from './invoices-types';
  import { InvoiceFormState } from './invoices-form-state.svelte';
  import * as api from './invoices-api';
  import InvoiceListTable from './InvoiceListTable.svelte';
  import InvoiceFormModal from './InvoiceFormModal.svelte';

  let {
    invoices = [],
    seasonId,
    seasons = []
  }: {
    invoices: Invoice[];
    seasonId: string;
    seasons?: Season[];
  } = $props();

  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);
  
  let searchTerm = $state('');
  let statusFilter = $state<'all' | 'draft' | 'sent' | 'paid' | 'cancelled'>('all');
  
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');
  
  const form = new InvoiceFormState();

  const filteredInvoices = $derived(
    invoices
      .filter(inv => statusFilter === 'all' || inv.status === statusFilter)
      .filter(inv => {
        const term = searchTerm.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(term) ||
          inv.clientName.toLowerCase().includes(term) ||
          (inv.subject || '').toLowerCase().includes(term) ||
          (inv.totalAmount / 100).toFixed(2).includes(term)
        );
      })
  );

  const itemsTotal = $derived(
    form.items.reduce((sum, item) => {
      const q = item.quantity || 0;
      const p = parseFloat(item.unitPriceStr.replace(',', '.')) || 0;
      return sum + (q * Math.round(p * 100));
    }, 0)
  );

  function openCreateModal() {
    errorMsg = '';
    successMsg = '';
    form.openCreateModal();
  }

  async function openEditModal(invoice: Invoice) {
    errorMsg = '';
    successMsg = '';
    try {
      const fetchedItems = await api.fetchInvoiceDetails(invoice.id);
      form.openEditModal(invoice, fetchedItems);
    } catch (err: unknown) {
      errorMsg = (err as Error).message || "Erreur de chargement des détails.";
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    
    const err = form.validate();
    if (err) {
      errorMsg = err;
      return;
    }

    isSubmitting = true;

    try {
      successMsg = await api.saveInvoice({
        editingId: form.editingId,
        seasonId,
        clientName: form.clientName,
        clientAddress: form.clientAddress,
        clientEmail: form.clientEmail,
        subject: form.subject,
        location: form.location,
        period: form.period,
        attendees: form.attendees,
        date: form.date,
        dueDate: form.dueDate,
        itemsTotal,
        items: form.items
      });
      setTimeout(() => {
        form.showModal = false;
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      errorMsg = (err as Error).message || "Erreur de communication avec le serveur.";
    } finally {
      isSubmitting = false;
    }
  }

  let statusDialogData = $state<{ id: number; newStatus: 'sent' | 'cancelled'; msg: string } | null>(null);
  let deleteDialogData = $state<{ id: number; msg: string } | null>(null);

  function handleStatusChange(id: number, newStatus: 'sent' | 'cancelled') {
    const confirmMsg = newStatus === 'cancelled' 
      ? "Êtes-vous sûr de vouloir annuler cette facture ?" 
      : "Êtes-vous sûr de vouloir marquer cette facture comme envoyée ?";
    statusDialogData = { id, newStatus, msg: confirmMsg };
  }

  async function confirmStatusChange() {
    if (!statusDialogData) return;
    const { id, newStatus } = statusDialogData;
    statusDialogData = null;
    try {
      successMsg = await api.updateInvoiceStatus(id, newStatus);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      errorMsg = (err as Error).message || "Erreur serveur.";
    }
  }

  function handleDelete(id: number, num: string) {
    deleteDialogData = { id, msg: `Êtes-vous sûr de vouloir supprimer définitivement la facture ${num} ?` };
  }

  async function confirmDelete() {
    if (!deleteDialogData) return;
    const { id } = deleteDialogData;
    deleteDialogData = null;
    try {
      successMsg = await api.deleteInvoice(id);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      errorMsg = (err as Error).message || "Erreur serveur.";
    }
  }

  function handlePrint(id: number) {
    window.open(`/admin/accounting/invoices/${id}`, '_blank');
  }
</script>

<div class="space-y-6">


  {#if successMsg}
    <Alert.Root variant="success">
      <Check class="w-4 h-4" />
      <Alert.Description>{successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4 font-bold shrink-0" />
      <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <InvoiceListTable
    {filteredInvoices}
    {isClosed}
    onPrint={handlePrint}
    onEdit={openEditModal}
    onStatusChange={handleStatusChange}
    onDelete={handleDelete}
  >
    {#snippet toolbar()}
      <DataTableToolbar
        bind:searchValue={searchTerm}
        searchPlaceholder="Rechercher une facture..."
        hasFilters={true}
        filtersActive={statusFilter !== 'all' || (seasonId && seasons.length > 0)}
      >
        {#snippet filters()}
            <FormField id="filter-season" label="Saison">
            <select
              id="filter-season"
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              value={seasonId}
              onchange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                const params = new URLSearchParams(window.location.search);
                params.set('season', val);
                window.location.href = `/admin/accounting/invoices?${params.toString()}`;
              }}
            >
              {#each seasons as season}
                <option value={season.code || season.id}>{season.name}</option>
              {/each}
              {#if seasons.length === 0}
                <option value="25-26">Saison 2025-2026</option>
              {/if}
            </select>
          </FormField>

            <FormField id="filter-status" label="Statut">
            <select
              id="filter-status"
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              bind:value={statusFilter}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="paid">Payée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </FormField>
        {/snippet}

        {#snippet actions()}
          {#if !isClosed}
            <Button 
              onclick={openCreateModal}
              class="inline-flex items-center justify-center gap-2 h-9 w-full sm:w-auto"
            >
              <Plus class="w-4 h-4" /> Nouvelle facture
            </Button>
          {/if}
        {/snippet}
      </DataTableToolbar>
    {/snippet}
  </InvoiceListTable>
</div>

<InvoiceFormModal
  bind:showModal={form.showModal}
  editingId={form.editingId}
  {isClosed}
  {isSubmitting}
  bind:clientName={form.clientName}
  bind:clientAddress={form.clientAddress}
  bind:clientEmail={form.clientEmail}
  bind:subject={form.subject}
  bind:location={form.location}
  bind:period={form.period}
  bind:attendees={form.attendees}
  bind:date={form.date}
  bind:dueDate={form.dueDate}
  bind:items={form.items}
  {itemsTotal}
  onSubmit={handleSubmit}
/>

<AlertDialog.Root open={!!statusDialogData} onOpenChange={(o) => { if(!o) statusDialogData = null; }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmation</AlertDialog.Title>
      <AlertDialog.Description>
        {statusDialogData?.msg}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmStatusChange} class="bg-primary text-primary-foreground hover:bg-primary/90">
        Confirmer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root open={!!deleteDialogData} onOpenChange={(o) => { if(!o) deleteDialogData = null; }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Suppression</AlertDialog.Title>
      <AlertDialog.Description>
        {deleteDialogData?.msg}
        <br/><br/>
        Cette action est irréversible.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmDelete} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Supprimer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
