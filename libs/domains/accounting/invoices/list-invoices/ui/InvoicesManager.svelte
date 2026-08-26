<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { AlertDialog, Button, DataTableToolbar, FormField, SearchableCombobox, softNavigate, submitForm, toast } from '@nba/ui';
  import type { Invoice, Season } from './invoices-types';
  import { InvoiceFormState } from './invoices-form-state.svelte';
  import * as api from './invoices-api';
  import InvoiceListTable from './InvoiceListTable.svelte';
  import InvoiceFormModal from './InvoiceFormModal.svelte';

  let {
    invoices = [],
    seasonId,
    seasons = [],
    categories = []
  }: {
    invoices: Invoice[];
    seasonId: string;
    seasons?: Season[];
    /** Nomenclature comptable : chaque ligne de facture y choisit son imputation. */
    categories?: { id: number | string; adminLabel?: string; name?: string; active?: boolean }[];
  } = $props();

  /* Le même façonnage que l'écran de rapprochement, pour que les deux nomment les catégories
     à l'identique. */
  const categoryOptions = $derived(
    categories
      .filter((c) => c.active !== false)
      .map((c) => ({ value: String(c.id), label: c.adminLabel ?? c.name ?? `Catégorie #${c.id}` }))
  );

  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);
  
  let searchTerm = $state('');
  let statusFilter = $state<'all' | 'draft' | 'sent' | 'paid' | 'cancelled'>('all');
  
  let isSubmitting = $state(false);

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
    form.openCreateModal();
  }

  async function openEditModal(invoice: Invoice) {
    try {
      const fetchedItems = await api.fetchInvoiceDetails(invoice.id);
      form.openEditModal(invoice, fetchedItems);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erreur de chargement des détails.");
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isSubmitting = true;

    // Erreurs en toast et non dans l'`<Alert>` de la page : celle-ci est rendue derrière
    // le sheet, un refus du serveur y passerait inaperçu.
    await submitForm({
      validate: () => form.validate(),
      submit: () => api.saveInvoice({
        editingId: form.editingId,
        seasonId,
        clientName: form.clientName,
        clientAddress: form.clientAddress,
        clientEmail: form.clientEmail,
        date: form.date,
        itemsTotal,
        items: form.items
      }),
      success: (message) => message,
      close: () => { form.showModal = false; }
    });

    isSubmitting = false;
  }

  let statusDialogData = $state<{ id: number; newStatus: 'sent' | 'paid' | 'cancelled'; msg: string } | null>(null);
  let deleteDialogData = $state<{ id: number; msg: string } | null>(null);

  function handleStatusChange(id: number, newStatus: 'sent' | 'paid' | 'cancelled') {
    const confirmMsg =
      newStatus === 'cancelled'
        ? "Êtes-vous sûr de vouloir annuler cette facture ?"
        : newStatus === 'paid'
          ? "Êtes-vous sûr de vouloir marquer cette facture comme payée ?"
          : "Êtes-vous sûr de vouloir marquer cette facture comme en attente de règlement ?";
    statusDialogData = { id, newStatus, msg: confirmMsg };
  }

  async function confirmStatusChange() {
    if (!statusDialogData) return;
    const { id, newStatus } = statusDialogData;
    statusDialogData = null;
    await submitForm({
      submit: () => api.updateInvoiceStatus(id, newStatus),
      success: (message) => message
    });
  }

  function handleDelete(id: number, num: string) {
    deleteDialogData = { id, msg: `Êtes-vous sûr de vouloir supprimer définitivement la facture ${num} ?` };
  }

  async function confirmDelete() {
    if (!deleteDialogData) return;
    const { id } = deleteDialogData;
    deleteDialogData = null;
    await submitForm({
      submit: () => api.deleteInvoice(id),
      success: (message) => message
    });
  }

  function handlePrint(id: number) {
    window.open(`/admin/accounting/invoices/${id}`, '_blank');
  }
</script>

<div class="space-y-6">
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
            <SearchableCombobox
              id="filter-season"
              items={seasons.length > 0 ? seasons.map((s) => ({ label: s.name, value: String(s.code || s.id) })) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
              value={seasonId}
              onValueChange={(v) => { const val = String(v); const params = new URLSearchParams(window.location.search); params.set('season', val); softNavigate(`/admin/accounting/invoices?${params.toString()}`); }}
            />
          </FormField>

            <FormField id="filter-status" label="Statut">
            <SearchableCombobox
              id="filter-status"
              items={[{ label: 'Tous les statuts', value: 'all' }, { label: 'Brouillon', value: 'draft' }, { label: 'En attente de règlement', value: 'sent' }, { label: 'Payée', value: 'paid' }, { label: 'Annulée', value: 'cancelled' }]}
              bind:value={statusFilter}
            />
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
          <Button href={`/admin/accounting/reports?season=${seasonId}&export=invoices`} class="h-9 gap-2 w-full sm:w-auto" variant="secondary" target="_blank" download>
            Exporter (ZIP)
          </Button>
        {/snippet}
      </DataTableToolbar>
    {/snippet}
  </InvoiceListTable>
</div>

<InvoiceFormModal
  bind:showModal={form.showModal}
  editingId={form.editingId}
  categories={categoryOptions}
  {isClosed}
  {isSubmitting}
  bind:clientName={form.clientName}
  bind:clientAddress={form.clientAddress}
  bind:clientEmail={form.clientEmail}
  bind:date={form.date}
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
