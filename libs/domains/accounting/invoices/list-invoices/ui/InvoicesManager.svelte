<script lang="ts">
  import { Check, AlertCircle } from '@lucide/svelte';
  import { Alert } from '@nba/ui';
  import type { Invoice, Season } from './invoices-types';
  import { InvoiceFormState } from './invoices-form-state.svelte';
  import * as api from './invoices-api';
  import InvoiceFilters from './InvoiceFilters.svelte';
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
      const p = parseFloat(item.unitPriceStr) || 0;
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

  async function handleStatusChange(id: number, newStatus: 'sent' | 'cancelled') {
    const confirmMsg = newStatus === 'cancelled' 
      ? "Êtes-vous sûr de vouloir annuler cette facture ?" 
      : "Êtes-vous sûr de vouloir marquer cette facture comme envoyée ?";
    if (!confirm(confirmMsg)) return;

    try {
      successMsg = await api.updateInvoiceStatus(id, newStatus);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      errorMsg = (err as Error).message || "Erreur serveur.";
    }
  }

  async function handleDelete(id: number, num: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la facture ${num} ?`)) return;

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
  <InvoiceFilters
    bind:searchTerm
    bind:statusFilter
    {isClosed}
    onOpenCreateModal={openCreateModal}
  />

  {#if successMsg}
    <Alert.Root class="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
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
  />
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
