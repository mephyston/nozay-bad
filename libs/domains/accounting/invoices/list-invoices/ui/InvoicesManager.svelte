<script lang="ts">
  import { Download, Plus } from '@lucide/svelte';
  import {
    Button,
    ChoiceField,
    DataTableToolbar,
    FilterSheet,
    FormField,
    dockDePage,
    softNavigate,
    openDocument,
    submitForm,
    toSeasonOptions,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
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
  let filtresOuverts = $state(false);

  const STATUTS = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'sent', label: 'En attente de règlement' },
    { value: 'paid', label: 'Payée' },
    { value: 'cancelled', label: 'Annulée' }
  ];

  const seasonItems = $derived(
    (seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]).map(
      (o) => ({ value: String(o.value), label: o.label })
    )
  );

  const exportHref = $derived(
    `/admin/api/accounting/download?doc=export&type=invoices&season=${seasonId}`
  );

  /* Seul le statut réduit la liste : la saison en fixe le périmètre. */
  const filtreActif = $derived(statusFilter !== 'all');

  const criteres = $derived(
    filtreActif
      ? [
          {
            id: 'statut',
            label: STATUTS.find((s) => s.value === statusFilter)?.label ?? statusFilter,
            onRemove: () => (statusFilter = 'all')
          }
        ]
      : []
  );

  function changerSaison(code: string) {
    const params = new URLSearchParams(window.location.search);
    params.set('season', code);
    softNavigate(`/admin/accounting/invoices?${params.toString()}`);
  }

  /*
    Créer et exporter descendent dans la barre du bas : ce sont les deux actions de
    l'écran, et elles vivaient en haut d'une barre d'outils qui défile.
  */
  $effect(() => {
    const actions: SwipeAction[] = [];
    if (!isClosed) {
      actions.push({ id: 'creer', label: 'Nouvelle facture', icon: Plus, run: openCreateModal });
    }
    actions.push({
      id: 'export',
      label: 'Exporter (ZIP)',
      icon: Download,
      run: () => {
        window.location.href = exportHref;
      }
    });
    return dockDePage.declarerActions(actions);
  });

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
      uiAlert((err as Error).message || "Erreur de chargement des détails.");
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

  /*
    Les questions sont portées par les actions de ligne — la même pour le balayage, le
    menu de la liste et celui du tableau. Elles remplacent deux boîtes de dialogue que
    cet écran portait à la main, et qui demandaient confirmation même pour avancer une
    facture d'un cran, geste qui se défait.
  */
  async function handleStatusChange(id: number, newStatus: 'sent' | 'paid' | 'cancelled') {
    await submitForm({
      submit: () => api.updateInvoiceStatus(id, newStatus),
      success: (message) => message
    });
  }

  async function handleDelete(id: number) {
    await submitForm({
      submit: () => api.deleteInvoice(id),
      success: (message) => message
    });
  }

  function handlePrint(id: number) {
    openDocument(`/admin/accounting/invoices/${id}`);
  }
</script>

{#snippet criteresDeListe()}
  <FormField id="filter-season" label="Saison">
    <ChoiceField
      id="filter-season"
      label="Saison"
      options={seasonItems}
      value={seasonId}
      onChange={changerSaison}
    />
  </FormField>

  <FormField id="filter-status" label="Statut">
    <ChoiceField id="filter-status" label="Statut" options={STATUTS} bind:value={statusFilter} />
  </FormField>
{/snippet}

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
        searchPlaceholder="Rechercher une facture (client, numéro…)"
        dockSearch
        hasFilters={true}
        filtersActive={filtreActif}
        activeFilters={criteres}
        onOpenFilters={() => (filtresOuverts = true)}
      >
        {#snippet filters()}
          <h4 class="border-b border-border pb-2 text-sm font-semibold">Options de filtrage</h4>
          <div class="space-y-4 pt-2">
            {@render criteresDeListe()}
          </div>
        {/snippet}

        {#snippet actions()}
          <!-- Sur téléphone, ces deux actions vivent dans la barre du bas. -->
          {#if !isClosed}
            <Button onclick={openCreateModal} class="hidden h-9 gap-2 md:inline-flex">
              <Plus class="h-4 w-4" />
              Nouvelle facture
            </Button>
          {/if}
          <Button href={exportHref} variant="secondary" target="_blank" download class="hidden h-9 gap-2 md:inline-flex">
            <Download class="h-4 w-4" />
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

<FilterSheet
  bind:open={filtresOuverts}
  description="Ces critères s'ajoutent à la recherche."
  resultCount={filteredInvoices.length}
  itemName="facture"
  hasActiveFilters={filtreActif}
  onReset={() => {
    statusFilter = 'all';
    filtresOuverts = false;
  }}
>
  {@render criteresDeListe()}
</FilterSheet>
