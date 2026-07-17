<script lang="ts">
  import { Search, Plus, Trash2, ArrowLeftRight, Check, AlertCircle, ChevronLeft, ChevronRight, MoreVertical, Edit2 } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Card, Dialog, Popover, Label } from '@metacult/shared-ui';

  interface Transaction {
    id: number;
    seasonId: string;
    type: 'recette' | 'depense' | 'transfert';
    accountId: 'current' | 'savings' | 'cash';
    destinationAccountId: 'current' | 'savings' | 'cash' | null;
    category: string | null;
    amount: number;
    date: string;
    paymentMethod: string;
    description: string;
    reference: string | null;
    memberId?: number | null;
    bankTransactionId?: number | null;
    memberName?: string | null;
    memberLicence?: string | null;
  }

  interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  interface BalanceReport {
    accountId: 'current' | 'savings' | 'cash';
    initialBalance: number;
    finalBalance: number;
  }

  interface Season {
    id: string;
    name: string;
    active: boolean;
    closed?: boolean;
  }

  interface Category {
    id: string;
    adminLabel: string;
    adherentLabel: string;
    hideInExpenses: boolean;
  }

  interface AccountClass {
    code: string;
    label: string;
    type: 'recette' | 'depense';
  }

  let {
    transactions = [],
    pagination,
    seasonId,
    balances = [],
    seasons = [],
    categories = [],
    accountClasses = [],
    unreconciledChequesOnly = false
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    seasonId: string;
    balances: BalanceReport[];
    seasons?: Season[];
    categories?: Category[];
    accountClasses?: AccountClass[];
    unreconciledChequesOnly?: boolean;
  } = $props();

  import { onMount } from 'svelte';
  import { X } from 'lucide-svelte';

  function getPageRange(current: number, total: number) {
    if (total <= 0) return [];
    if (total === 1) return [1];

    const delta = 2;
    const pages = new Set<number>();

    // Always include page 1 and total page
    pages.add(1);
    pages.add(total);

    // Include page range around current
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    for (let i = start; i <= end; i++) {
      pages.add(i);
    }

    // Sort the pages
    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    const range: (number | string)[] = [];
    for (let i = 0; i < sortedPages.length; i++) {
      if (i > 0) {
        const prev = sortedPages[i - 1];
        const curr = sortedPages[i];
        const gap = curr - prev;
        if (gap === 2) {
          range.push(prev + 1);
        } else if (gap > 2) {
          range.push('...');
        }
      }
      range.push(sortedPages[i]);
    }

    return range;
  }

  let pageRange = $derived(getPageRange(pagination.page, pagination.totalPages));

  let filteredCategory = $state<string | null>(null);
  let filteredClassCode = $state<string | null>(null);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    filteredCategory = params.get('category');
    filteredClassCode = params.get('classCode');
  });

  function clearFilters() {
    const params = new URLSearchParams(window.location.search);
    params.delete('category');
    params.delete('classCode');
    params.set('page', '1');
    window.location.href = `/admin/accounting?${params.toString()}`;
  }

  // Saisie formulaire
  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let open = $state(false);
  $effect(() => {
    open = showPanel !== null;
  });
  $effect(() => {
    if (!open) {
      showPanel = null;
    }
  });
  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('1');
  let accountId = $state<'current' | 'savings' | 'cash'>('current');
  let destinationAccountId = $state<'current' | 'savings' | 'cash'>('cash');
  let paymentMethod = $state('virement');
  let description = $state('');
  let reference = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  // svelte-ignore state_referenced_locally
  let targetSeasonId = $state(seasonId);

  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);

  let editingId = $state<number | null>(null);

  function startEdit(tx: Transaction, e: MouseEvent) {
    e.stopPropagation();
    editingId = tx.id;
    amount = (tx.amount / 100).toFixed(2);
    date = tx.date;
    category = tx.category || '1';
    accountId = tx.accountId;
    destinationAccountId = tx.destinationAccountId || 'cash';
    paymentMethod = tx.paymentMethod;
    description = tx.description;
    reference = tx.reference || '';
    targetSeasonId = tx.seasonId;
    showPanel = tx.type;
  }



  const accountLabels = {
    current: 'Compte Courant',
    savings: 'Compte Livret',
    cash: 'Caisse Physique'
  };

  const methodLabels = {
    virement: 'Virement',
    cheque: 'Chèque',
    especes: 'Espèces',
    labaz: 'LABAZ',
    ancv: 'ANCV',
    pass_sport: "Pass'Sport",
    ticket_loisir: 'Ticket Loisir',
    up_loisir: 'Up & Loisir'
  };

  const fallbackCategories = [
    { id: '1', name: 'Adhésions & Inscriptions' },
    { id: '2', name: 'Sponsoring' },
    { id: '3', name: 'Subventions (aides publiques)' },
    { id: '4', name: 'Actions Jeunes (stages jeunes...)' },
    { id: '5', name: 'Tournois Senior' },
    { id: '6', name: 'Evénements & Buvettes' },
    { id: '7', name: 'Cordage (vente aux adhérents)' },
    { id: '8', name: 'Volants (vente ou achat)' },
    { id: '9', name: 'Salaires et Charges' },
    { id: '10', name: 'Matériel (hors cordages)' },
    { id: '11', name: 'Licences (versements fédération)' },
    { id: '12', name: 'Championnats (frais équipes)' },
    { id: '13', name: 'Stages & Formations' },
    { id: '14', name: 'Frais de fonctionnement & administratif' },
    { id: '15', name: 'Virements Internes (Transit)' }
  ];

  const activeCategories = $derived(
    categories && categories.length > 0
      ? categories.map(c => ({ id: String(c.id), name: c.adminLabel }))
      : fallbackCategories
  );

  function getAccountBalance(acc: 'current' | 'savings' | 'cash') {
    const match = balances.find(b => b.accountId === acc);
    return match ? (match.finalBalance / 100).toFixed(2) : '0.00';
  }

  async function handleAddTransaction(e: Event) {
    e.preventDefault();
    errorMsg = '';
    const floatAmount = parseFloat(amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      errorMsg = 'Le montant doit être un nombre positif.';
      return;
    }

    isSubmitting = true;
    try {
      const payload = editingId
        ? {
            action: 'update',
            id: editingId,
            updates: {
              seasonId: targetSeasonId,
              type: showPanel,
              accountId,
              destinationAccountId: showPanel === 'transfert' ? destinationAccountId : null,
              category: showPanel !== 'transfert' ? category : null,
              amount: Math.round(floatAmount * 100),
              date,
              paymentMethod,
              description,
              reference
            }
          }
        : {
            action: 'create',
            seasonId: targetSeasonId,
            type: showPanel,
            accountId,
            destinationAccountId: showPanel === 'transfert' ? destinationAccountId : null,
            category: showPanel !== 'transfert' ? category : null,
            amount: Math.round(floatAmount * 100), // conversion en centimes
            date,
            paymentMethod,
            description,
            reference
          };

      const res = await fetch('/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Impossible d\'enregistrer la transaction');
      }

      window.location.reload();
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;

    try {
      const res = await fetch('/admin/accounting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id })
      });
      if (!res.ok) throw new Error('Impossible de supprimer.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function changePage(newPage: number) {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    window.location.href = `/admin/accounting?${params.toString()}`;
  }

  function applySeasonChange() {
    const params = new URLSearchParams(window.location.search);
    params.set('season', selectedSeason);
    params.set('page', '1');
    window.location.href = `/admin/accounting?${params.toString()}`;
  }
</script>

<div class="space-y-6">
  <!-- Bandeau des Soldes -->
  <div class="grid gap-4 md:grid-cols-3">
    {#each Object.entries(accountLabels) as [key, label]}
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-sm font-medium text-muted-foreground">{label}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-3xl font-bold">{getAccountBalance(key as any)} €</div>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>

  <!-- Actions Bar -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <h2 class="text-xl font-bold tracking-tight">Journal des écritures</h2>
      <select
        class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
        bind:value={selectedSeason}
        onchange={applySeasonChange}
      >
        {#each seasons as season}
          <option value={season.id}>{season.name}</option>
        {/each}
        {#if seasons.length === 0}
          <option value="25-26">Saison 2025-2026</option>
        {/if}
      </select>
      {#if isClosed}
        <Badge variant="outline" class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
          Saison clôturée (Lecture seule)
        </Badge>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      {#if !isClosed}
        <Button
          onclick={() => { showPanel = 'recette'; amount = ''; description = ''; targetSeasonId = selectedSeason; editingId = null; }}
          class="bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow transition-colors cursor-pointer"
        >
          Saisir Recette
        </Button>
        <Button
          onclick={() => { showPanel = 'depense'; amount = ''; description = ''; targetSeasonId = selectedSeason; editingId = null; }}
          variant="destructive"
          class="text-sm font-medium rounded-md shadow transition-colors cursor-pointer"
        >
          Saisir Dépense
        </Button>
        <Button
          onclick={() => { showPanel = 'transfert'; amount = ''; description = ''; targetSeasonId = selectedSeason; editingId = null; }}
          class="text-sm font-medium rounded-md shadow transition-colors cursor-pointer"
        >
          Virement Interne
        </Button>
      {/if}
    </div>
  </div>

  {#if filteredCategory || filteredClassCode}
    <div class="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/80 w-fit no-print">
      <span class="text-muted-foreground">Filtre actif&nbsp;:</span>
      {#if filteredCategory}
        <Badge variant="outline" class="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold border-transparent">
          Catégorie : {categories.find(c => c.id.toString() === filteredCategory)?.adminLabel || filteredCategory}
        </Badge>
      {/if}
      {#if filteredClassCode}
        <Badge variant="outline" class="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold border-transparent">
          Classe : {accountClasses.find(ac => ac.code === filteredClassCode)?.label || filteredClassCode} ({filteredClassCode})
        </Badge>
      {/if}
      <Button 
        variant="ghost"
        size="icon-xs"
        onclick={clearFilters}
        class="text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-muted font-bold transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center ml-1"
        aria-label="Effacer le filtre"
      >
        <X class="w-3.5 h-3.5" />
      </Button>
    </div>
  {/if}

  <div class="flex flex-wrap gap-2 items-center no-print">
    <Button 
      variant={unreconciledChequesOnly ? 'default' : 'outline'}
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer"
      onclick={() => {
        const params = new URLSearchParams(window.location.search);
        if (unreconciledChequesOnly) {
          params.delete('unreconciledCheques');
        } else {
          params.set('unreconciledCheques', 'true');
        }
        params.set('page', '1');
        window.location.href = `/admin/accounting?${params.toString()}`;
      }}
    >
      <span>🎫</span> Chèques en circulation
    </Button>
  </div>

  <!-- Tableau -->
  <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
    <div class="overflow-x-auto min-h-[180px]">
      <Table.Root class="w-full border-collapse text-left text-sm">
        <Table.Header class="bg-muted text-muted-foreground font-medium border-b border-border">
          <Table.Row>
            <Table.Head class="p-4">Date</Table.Head>
            <Table.Head class="p-4">Type</Table.Head>
            <Table.Head class="p-4">Compte(s)</Table.Head>
            <Table.Head class="p-4">Catégorie</Table.Head>
            <Table.Head class="p-4">Libellé</Table.Head>
            <Table.Head class="p-4 text-right">Montant</Table.Head>
            <Table.Head class="p-4 text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body class="divide-y divide-border">
          {#each transactions as tx}
            <Table.Row class="hover:bg-muted/50 transition-colors">
              <Table.Cell class="p-4">{tx.date}</Table.Cell>
              <Table.Cell class="p-4">
                {#if tx.type === 'recette'}
                  <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent">Recette</Badge>
                {:else if tx.type === 'depense'}
                  <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive border-transparent">Dépense</Badge>
                {:else}
                  <Badge variant="outline" class="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/15 text-primary border-transparent">Transfert</Badge>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4">
                {#if tx.type === 'transfert'}
                  <span class="text-xs">{accountLabels[tx.accountId]} ➔ {accountLabels[tx.destinationAccountId!]}</span>
                {:else}
                  <span class="text-xs">{accountLabels[tx.accountId]}</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4">{tx.category ? (activeCategories.find(c => c.id === String(tx.category))?.name || tx.category) : 'Transfert'}</Table.Cell>
              <Table.Cell class="p-4 font-medium">
                <div>{tx.description}</div>
                {#if tx.reference}
                  <div class="text-xs text-muted-foreground italic">Réf: {tx.reference}</div>
                {/if}
                <div class="flex flex-wrap gap-1.5 mt-1">
                  {#if tx.memberName}
                    <a href={`/admin/members/${tx.memberLicence}`} class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold hover:underline">
                      Adhérent : {tx.memberName}
                    </a>
                  {/if}
                  {#if tx.bankTransactionId}
                    <Badge variant="outline" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border-transparent">
                      <Check class="w-2.5 h-2.5" />
                      Rapprochée (SG)
                    </Badge>
                  {/if}
                </div>
              </Table.Cell>
              <Table.Cell class="p-4 text-right font-bold">
                {#if tx.type === 'recette'}
                  <span class="text-emerald-600 dark:text-emerald-400">+{(tx.amount / 100).toFixed(2)} €</span>
                {:else if tx.type === 'depense'}
                  <span class="text-destructive">-{(tx.amount / 100).toFixed(2)} €</span>
                {:else}
                  <span class="text-muted-foreground">{(tx.amount / 100).toFixed(2)} €</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="p-4 text-right relative">
                {#if !isClosed}
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      {#snippet child({ props })}
                        <Button 
                          {...props}
                          variant="ghost"
                          size="icon-xs"
                          class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center" 
                          aria-label="Actions"
                        >
                          <MoreVertical class="w-4 h-4" />
                        </Button>
                      {/snippet}
                    </Popover.Trigger>
                    <Popover.Content class="w-32 p-1 bg-popover border border-border rounded-lg shadow-lg z-50 text-left divide-y divide-border" align="end">
                      <Button
                        variant="ghost"
                        onclick={(e) => startEdit(tx, e)}
                        class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent h-auto rounded-none justify-start"
                      >
                        <Edit2 class="w-3.5 h-3.5" />
                        Éditer
                      </Button>
                      <Button
                        variant="ghost"
                        onclick={() => handleDelete(tx.id)}
                        class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent h-auto rounded-none justify-start"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                        Supprimer
                      </Button>
                    </Popover.Content>
                  </Popover.Root>
                {/if}
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={7} class="p-8 text-center text-muted-foreground">Aucune écriture comptable pour cette saison.</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    <!-- Pagination Footer -->
    <div class="p-4 border-t border-border flex items-center justify-between">
      <div class="text-xs text-muted-foreground">
        Total : {pagination.total} transaction(s)
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs">
          Page {pagination.page} sur {pagination.totalPages}
        </span>
        <div class="flex gap-1 items-center">
          <Button
            variant="outline"
            size="icon-xs"
            class="p-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onclick={() => changePage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft class="w-4 h-4" />
          </Button>

          {#each pageRange as p}
            {#if p === '...'}
              <span class="px-2.5 py-1 text-xs text-muted-foreground select-none">...</span>
            {:else}
              <Button
                variant={Number(p) === pagination.page ? 'default' : 'outline'}
                size="xs"
                class="px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                onclick={() => changePage(Number(p))}
                aria-current={Number(p) === pagination.page ? 'page' : undefined}
              >
                {p}
              </Button>
            {/if}
          {/each}

          <Button
            variant="outline"
            size="icon-xs"
            class="p-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            onclick={() => changePage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            aria-label="Page suivante"
          >
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modale de saisie coulissante -->
  <Dialog.Root bind:open>
    <Dialog.Content class="max-w-md p-6 bg-card border-border overflow-y-auto max-h-[90vh]">
      <Dialog.Header>
        <Dialog.Title>
          {#if editingId}
            {#if showPanel === 'recette'}🟢 Modifier la recette{:else if showPanel === 'depense'}🔴 Modifier la dépense{:else}🔵 Modifier le virement interne{/if}
          {:else}
            {#if showPanel === 'recette'}🟢 Saisir une recette{:else if showPanel === 'depense'}🔴 Saisir une dépense{:else}🔵 Faire un virement interne{/if}
          {/if}
        </Dialog.Title>
        <Dialog.Description class="hidden">Formulaire de saisie d'écriture comptable</Dialog.Description>
      </Dialog.Header>

      <form onsubmit={handleAddTransaction} class="space-y-4">
        {#if errorMsg}
          <div class="p-3 bg-destructive/15 border border-destructive text-destructive text-xs rounded-md flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- Ligne 1 : Montant et Date en Grille -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="amount-input" class="mb-1 block">Montant (€)</Label>
            <Input id="amount-input" type="number" step="0.01" min="0.01" bind:value={amount} required />
          </div>
          <div>
            <Label for="date-input" class="mb-1 block">Date</Label>
            <Input id="date-input" type="date" bind:value={date} required />
          </div>
        </div>

        <!-- Ligne 2 : Saison -->
        <div>
          <Label for="season-select-panel" class="mb-1 block">Saison d'affectation</Label>
          <select id="season-select-panel" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary font-medium" bind:value={targetSeasonId}>
            {#each seasons as s}
              <option value={s.id}>{s.name}</option>
            {/each}
            {#if seasons.length === 0}
              <option value="25-26">Saison 2025-2026</option>
            {/if}
          </select>
        </div>

        <!-- Ligne 3 : Catégorie / Comptes en Grille -->
        {#if showPanel !== 'transfert'}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="category-select" class="mb-1 block">Catégorie</Label>
              <select id="category-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={category}>
                {#each activeCategories as cat}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <Label for="account-select" class="mb-1 block">Compte financier</Label>
              <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  <option value={key}>{label}</option>
                {/each}
              </select>
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="account-select" class="mb-1 block">Compte Source</Label>
              <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  <option value={key}>{label}</option>
                {/each}
              </select>
            </div>
            <div>
              <Label for="dest-account-select" class="mb-1 block">Compte Destinataire</Label>
              <select id="dest-account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={destinationAccountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  {#if key !== accountId}
                    <option value={key}>{label}</option>
                  {/if}
                {/each}
              </select>
            </div>
          </div>
        {/if}

        <!-- Ligne 4 : Moyen de paiement -->
        {#if showPanel !== 'transfert'}
          <div>
            <Label for="payment-method-select" class="mb-1 block">Moyen de paiement</Label>
            <select id="payment-method-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={paymentMethod}>
              {#each Object.entries(methodLabels) as [key, label]}
                <option value={key}>{label}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Lignes 5 et 6 : Description & Référence -->
        <div>
          <Label for="description-input" class="mb-1 block">Description / Motif</Label>
          <Input id="description-input" type="text" placeholder="Ex: Cotisation annuelle..." bind:value={description} required />
        </div>

        <div>
          <Label for="ref-input" class="mb-1 block">Référence (Optionnel)</Label>
          <Input id="ref-input" type="text" placeholder="Ex: Chèque n°1234, Virement..." bind:value={reference} />
        </div>

        <div class="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} class="flex-1">
            {isSubmitting ? 'Enregistrement...' : 'Valider'}
          </Button>
          <Button type="button" variant="outline" onclick={() => showPanel = null}>
            Annuler
          </Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Root>
</div>
