<script lang="ts">
  import { 
    Plus, Edit, Trash2, Check, AlertCircle, Search, X, MoreVertical, 
    Printer, Send, Ban, FileText, Mail, MapPin, Calendar, Users, Info
  } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Card, Sheet, Alert, Textarea } from '@metacult/shared-ui';

  interface InvoiceItem {
    id?: number;
    invoiceId?: number;
    description: string;
    quantity: number;
    unitPrice: number; // in cents
    totalPrice?: number; // in cents
  }

  interface Invoice {
    id: number;
    invoiceNumber: string;
    seasonId: string;
    date: string; // YYYY-MM-DD
    dueDate: string; // YYYY-MM-DD
    clientName: string;
    clientAddress: string | null;
    clientEmail: string | null;
    subject: string | null;
    location: string | null;
    period: string | null;
    attendees: string | null;
    status: 'draft' | 'sent' | 'paid' | 'cancelled';
    totalAmount: number; // in cents
    createdAt: string;
    items?: InvoiceItem[];
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
    closed?: boolean;
  }

  let {
    invoices = [],
    seasonId,
    seasons = []
  }: {
    invoices: Invoice[];
    seasonId: string;
    seasons?: Season[];
  } = $props();

  // Local state
  const isClosed = $derived(seasons.find(s => s.id === seasonId)?.closed || false);
  
  let searchTerm = $state('');
  let statusFilter = $state<'all' | 'draft' | 'sent' | 'paid' | 'cancelled'>('all');
  
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');
  
  // Modal state
  let showModal = $state(false);
  let editingId = $state<number | null>(null);

  // Form fields
  let clientName = $state('');
  let clientAddress = $state('');
  let clientEmail = $state('');
  let subject = $state('');
  let location = $state('');
  let period = $state('');
  let attendees = $state('');
  let date = $state('');
  let dueDate = $state('');
  
  // Dynamic Items list state
  let items = $state<{ description: string; quantity: number; unitPriceStr: string }[]>([]);

  // Derived filtered invoices
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

  // Derived grand total of form items in cents
  const itemsTotal = $derived(
    items.reduce((sum, item) => {
      const q = item.quantity || 0;
      const p = parseFloat(item.unitPriceStr) || 0;
      return sum + (q * Math.round(p * 100));
    }, 0)
  );

  function getTodayString() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  function getFutureDateString(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }



  function openCreateModal() {
    editingId = null;
    clientName = '';
    clientAddress = '';
    clientEmail = '';
    subject = '';
    location = '';
    period = '';
    attendees = '';
    date = getTodayString();
    dueDate = getFutureDateString(30);
    items = [{ description: '', quantity: 1, unitPriceStr: '' }];
    errorMsg = '';
    successMsg = '';
    showModal = true;
  }

  async function openEditModal(invoice: Invoice) {
    editingId = invoice.id;
    clientName = invoice.clientName;
    clientAddress = invoice.clientAddress || '';
    clientEmail = invoice.clientEmail || '';
    subject = invoice.subject || '';
    location = invoice.location || '';
    period = invoice.period || '';
    attendees = invoice.attendees || '';
    date = invoice.date;
    dueDate = invoice.dueDate;
    items = [];
    errorMsg = '';
    successMsg = '';
    
    // Fetch details including items
    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-details', id: invoice.id })
      });
      if (!res.ok) {
        throw new Error("Impossible de récupérer les lignes de la facture.");
      }
      const json = await res.json() as any;
      if (!json.success) {
        throw new Error(json.error || "Impossible de récupérer les lignes de la facture.");
      }
      if (json.data && json.data.items) {
        items = json.data.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceStr: (item.unitPrice / 100).toString()
        }));
      }
      
      if (items.length === 0) {
        items = [{ description: '', quantity: 1, unitPriceStr: '' }];
      }
      showModal = true;
    } catch (err: any) {
      errorMsg = err.message || "Erreur de chargement des détails.";
    }
  }

  function addItem() {
    items = [...items, { description: '', quantity: 1, unitPriceStr: '' }];
  }

  function removeItem(index: number) {
    items = items.filter((_, i) => i !== index);
    if (items.length === 0) {
      items = [{ description: '', quantity: 1, unitPriceStr: '' }];
    }
  }

  function getErrorMessage(text: string, defaultMsg: string): string {
    if (!text) return defaultMsg;
    try {
      const parsed = JSON.parse(text);
      return parsed.error || parsed.message || defaultMsg;
    } catch (_) {
      return text;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    
    if (!clientName.trim()) {
      errorMsg = 'Le nom du client est requis.';
      return;
    }
    if (!date) {
      errorMsg = 'La date de facturation est requise.';
      return;
    }
    if (!dueDate) {
      errorMsg = 'La date d\'échéance est requise.';
      return;
    }
    if (dueDate < date) {
      errorMsg = "La date d'échéance ne peut pas être antérieure à la date de facturation.";
      return;
    }
    
    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description.trim()) {
        errorMsg = `La description de la ligne ${i + 1} est requise.`;
        return;
      }
      const q = item.quantity;
      if (isNaN(q) || q <= 0) {
        errorMsg = `La quantité de la ligne ${i + 1} doit être supérieure à 0.`;
        return;
      }
      const p = parseFloat(item.unitPriceStr);
      if (isNaN(p) || p < 0) {
        errorMsg = `Le prix unitaire de la ligne ${i + 1} doit être un nombre supérieur ou égal à 0.`;
        return;
      }
    }

    isSubmitting = true;

    try {
      const payload = {
        action: editingId ? 'update' : 'create',
        id: editingId,
        invoice: {
          seasonId: seasonId,
          clientName: clientName.trim(),
          clientAddress: clientAddress.trim() || null,
          clientEmail: clientEmail.trim() || null,
          subject: subject.trim() || null,
          location: location.trim() || null,
          period: period.trim() || null,
          attendees: attendees.trim() || null,
          date,
          dueDate,
          totalAmount: itemsTotal,
          items: items.map(item => ({
            description: item.description.trim(),
            quantity: item.quantity,
            unitPrice: Math.round(parseFloat(item.unitPriceStr) * 100)
          }))
        }
      };

      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessage(text, "Une erreur est survenue lors de l'enregistrement."));
      }

      successMsg = editingId ? "Facture mise à jour avec succès !" : "Facture créée avec succès !";
      setTimeout(() => {
        showModal = false;
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || "Erreur de communication avec le serveur.";
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
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', id, status: newStatus })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessage(text, "Erreur lors de la mise à jour du statut."));
      }

      successMsg = "Statut de la facture mis à jour avec succès !";
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || "Erreur serveur.";
    }
  }

  async function handleDelete(id: number, num: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement la facture ${num} ?`)) return;

    try {
      const res = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessage(text, "Erreur lors de la suppression de la facture."));
      }

      successMsg = "Facture supprimée avec succès !";
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      errorMsg = err.message || "Erreur serveur.";
    }
  }

  function handlePrint(id: number) {
    window.open(`/admin/accounting/invoices/${id}`, '_blank');
  }

  // Dropdown menu state
  let openMenuId = $state<number | null>(null);
  function toggleMenu(id: number, e: MouseEvent) {
    e.stopPropagation();
    openMenuId = openMenuId === id ? null : id;
  }

  $effect(() => {
    const handleOutsideClick = () => { openMenuId = null; };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  });

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
    sent: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
  };

  const statusLabels = {
    draft: 'Brouillon',
    sent: 'Envoyée',
    paid: 'Payée',
    cancelled: 'Annulée'
  };
</script>

<div class="space-y-6">
  <!-- Filters block -->
  <Card.Root>
    <Card.Content class="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4">
      <div class="flex flex-wrap items-center gap-3">
        {#if !isClosed}
          <Button 
            onclick={openCreateModal}
            class="inline-flex items-center gap-2"
          >
            <Plus class="w-4 h-4" /> Créer une facture
          </Button>
        {/if}
      </div>

      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
        <!-- Search input -->
        <div class="relative w-full sm:w-64">
          <Input
            type="text"
            placeholder="Rechercher..."
            bind:value={searchTerm}
            class="pl-9"
          />
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        <!-- Status selection dropdown -->
        <select
          bind:value={statusFilter}
          class="bg-background border border-border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground w-full sm:w-auto"
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillon</option>
          <option value="sent">Envoyée</option>
          <option value="paid">Payée</option>
          <option value="cancelled">Annulée</option>
        </select>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Messages -->
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

  <!-- Invoices List -->
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
            <Table.Header class="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <Table.Row>
                <Table.Head class="p-4">N° Facture</Table.Head>
                <Table.Head class="p-4">Client</Table.Head>
                <Table.Head class="p-4">Objet</Table.Head>
                <Table.Head class="p-4">Date</Table.Head>
                <Table.Head class="p-4">Échéance</Table.Head>
                <Table.Head class="p-4 text-right">Montant</Table.Head>
                <Table.Head class="p-4 text-center">Statut</Table.Head>
                <Table.Head class="p-4 text-right">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body class="divide-y divide-border">
              {#each filteredInvoices as inv (inv.id)}
                <Table.Row class="hover:bg-muted/10 transition-colors">
                  <Table.Cell class="p-4 font-mono font-bold text-foreground">{inv.invoiceNumber}</Table.Cell>
                  <Table.Cell class="p-4 font-semibold text-foreground">{inv.clientName}</Table.Cell>
                  <Table.Cell class="p-4 text-muted-foreground max-w-xs truncate">{inv.subject || '—'}</Table.Cell>
                  <Table.Cell class="p-4 text-muted-foreground">{inv.date}</Table.Cell>
                  <Table.Cell class="p-4 text-muted-foreground">{inv.dueDate}</Table.Cell>
                  <Table.Cell class="p-4 text-right font-bold text-foreground">{(inv.totalAmount / 100).toFixed(2)} €</Table.Cell>
                  <Table.Cell class="p-4 text-center">
                    <Badge variant="outline" class={statusColors[inv.status]}>
                      {statusLabels[inv.status]}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell class="p-4 text-right relative">
                    <div class="inline-flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onclick={() => handlePrint(inv.id)}
                        title="Imprimer"
                        class="p-1.5"
                      >
                        <Printer class="w-4 h-4" />
                      </Button>
                      {#if !isClosed}
                        <div class="relative inline-block">
                          <Button
                            variant="ghost"
                            size="icon"
                            onclick={(e) => toggleMenu(inv.id, e)}
                            class="p-1.5"
                          >
                            <MoreVertical class="w-4 h-4" />
                          </Button>
                          {#if openMenuId === inv.id}
                            <div class="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden text-left animate-in fade-in duration-200">
                              {#if inv.status === 'draft'}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onclick={() => openEditModal(inv)}
                                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                >
                                  <Edit class="w-3.5 h-3.5" /> Modifier
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onclick={() => handleStatusChange(inv.id, 'sent')}
                                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                >
                                  <Send class="w-3.5 h-3.5" /> Marquer envoyée
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onclick={() => handleStatusChange(inv.id, 'cancelled')}
                                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                >
                                  <Ban class="w-3.5 h-3.5" /> Annuler la facture
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onclick={() => handleDelete(inv.id, inv.invoiceNumber)}
                                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                >
                                  <Trash2 class="w-3.5 h-3.5" /> Supprimer
                                </Button>
                              {/if}
                              {#if inv.status === 'sent'}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onclick={() => handleStatusChange(inv.id, 'cancelled')}
                                  class="w-full justify-start rounded-none px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                >
                                  <Ban class="w-3.5 h-3.5" /> Annuler la facture
                                </Button>
                              {/if}
                              {#if inv.status === 'cancelled'}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onclick={() => handleDelete(inv.id, inv.invoiceNumber)}
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
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Modal Create / Edit -->
<Sheet.Root bind:open={showModal}>
  <Sheet.Content class="w-full sm:max-w-2xl flex flex-col h-full bg-card border-border overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title class="flex items-center gap-2">
        <FileText class="w-5 h-5 text-primary" />
        {editingId ? 'Modifier la facture' : 'Créer une facture'}
      </Sheet.Title>
      <Sheet.Description class="hidden">Création ou modification des factures NBA 91.</Sheet.Description>
    </Sheet.Header>

    <!-- Scrollable content -->
    <form onsubmit={handleSubmit} class="flex flex-col flex-1 overflow-hidden">
      <div class="p-6 overflow-y-auto space-y-6 flex-1">
        <!-- Client Information -->
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Informations Client</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="clientName" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Nom du Client *</label>
              <Input
                type="text"
                id="clientName"
                bind:value={clientName}
                placeholder="Ex: Mairie de Nozay ou Nom d'entreprise"
                required
              />
            </div>
            <div class="space-y-1.5">
              <label for="clientEmail" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Email du Client</label>
              <div class="relative">
                <Input
                  type="email"
                  id="clientEmail"
                  bind:value={clientEmail}
                  placeholder="client@domaine.com"
                  class="pl-9"
                />
                <Mail class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div class="space-y-1.5">
            <label for="clientAddress" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse du Client</label>
            <div class="relative">
              <Textarea
                id="clientAddress"
                bind:value={clientAddress}
                placeholder="Adresse complète..."
                rows={2}
                class="pl-9"
              />
              <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <!-- Invoice Details -->
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Détails de la Facture</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label for="date" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'émission *</label>
              <Input
                type="date"
                id="date"
                bind:value={date}
                required
              />
            </div>
            <div class="space-y-1.5">
              <label for="dueDate" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'échéance *</label>
              <Input
                type="date"
                id="dueDate"
                bind:value={dueDate}
                required
              />
            </div>
            <div class="space-y-1.5">
              <label for="subject" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Objet / Titre</label>
              <Input
                type="text"
                id="subject"
                bind:value={subject}
                placeholder="Ex: Subvention annuelle 2026"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label for="location" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Lieu de l'activité</label>
              <Input
                type="text"
                id="location"
                bind:value={location}
                placeholder="Ex: Halle des Sports"
              />
            </div>
            <div class="space-y-1.5">
              <label for="period" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Période concernée</label>
              <Input
                type="text"
                id="period"
                bind:value={period}
                placeholder="Ex: Juillet 2026"
              />
            </div>
            <div class="space-y-1.5">
              <label for="attendees" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Bénéficiaires / Personnes</label>
              <div class="relative">
                <Input
                  type="text"
                  id="attendees"
                  bind:value={attendees}
                  placeholder="Ex: 15 Joueurs Jeunes"
                  class="pl-9"
                />
                <Users class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="space-y-4">
          <div class="flex justify-between items-center border-b border-border pb-1">
            <h4 class="text-sm font-bold text-primary uppercase tracking-wider">Prestations / Lignes de facturation</h4>
            <Button
              variant="ghost"
              size="sm"
              onclick={addItem}
              class="px-2.5 py-1 text-xs bg-primary/10 text-primary font-bold hover:bg-primary/20 rounded transition-colors flex items-center gap-1 cursor-pointer border-0 animate-none"
            >
              <Plus class="w-3.5 h-3.5" /> Ajouter une ligne
            </Button>
          </div>

          <div class="space-y-3">
            {#each items as item, index}
              <div class="grid grid-cols-12 gap-3 items-end bg-muted/10 p-3 rounded-lg border border-border/60">
                <div class="col-span-12 sm:col-span-6 space-y-1">
                  <label for="item-desc-{index}" class="block text-[10px] font-bold text-muted-foreground uppercase">Description *</label>
                  <Input
                    type="text"
                    id="item-desc-{index}"
                    bind:value={item.description}
                    placeholder="Ex: Entraînements encadrés..."
                    required
                  />
                </div>
                <div class="col-span-4 sm:col-span-2 space-y-1">
                  <label for="item-qty-{index}" class="block text-[10px] font-bold text-muted-foreground uppercase">Qté *</label>
                  <Input
                    type="number"
                    id="item-qty-{index}"
                    bind:value={item.quantity}
                    min="1"
                    class="text-center"
                    required
                  />
                </div>
                <div class="col-span-5 sm:col-span-3 space-y-1">
                  <label for="item-price-{index}" class="block text-[10px] font-bold text-muted-foreground uppercase">Prix unitaire (€) *</label>
                  <Input
                    type="number"
                    id="item-price-{index}"
                    step="0.01"
                    min="0"
                    bind:value={item.unitPriceStr}
                    placeholder="0.00"
                    class="text-right"
                    required
                  />
                </div>
                <div class="col-span-3 sm:col-span-1 text-center pb-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onclick={() => removeItem(index)}
                    class="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer border-0 bg-transparent"
                    title="Supprimer la ligne"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <Sheet.Footer class="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div class="text-sm text-foreground flex items-center gap-2">
          <Info class="w-4 h-4 text-muted-foreground" />
          <span>Total calculé : <strong class="text-base text-primary">{(itemsTotal / 100).toFixed(2)} €</strong></span>
        </div>

        <div class="flex gap-3">
          <Button
            variant="outline"
            onclick={() => showModal = false}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {#if isSubmitting}
              Enregistrement...
            {:else}
              Enregistrer
            {/if}
          </Button>
        </div>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
