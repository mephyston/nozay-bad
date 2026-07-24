<script lang="ts">
  import { Plus, Check, FileText, Mail, MapPin, Calendar, Users, Info } from '@lucide/svelte';
  import { Button, Input, Sheet, Alert, Textarea } from '@nba/ui';
  import type { InvoiceFormItem } from './invoices-types';
  import InvoiceItemRow from './InvoiceItemRow.svelte';

  let {
    showModal = $bindable(false),
    editingId = null,
    isClosed = false,
    isSubmitting = false,
    clientName = $bindable(''),
    clientAddress = $bindable(''),
    clientEmail = $bindable(''),
    subject = $bindable(''),
    location = $bindable(''),
    period = $bindable(''),
    attendees = $bindable(''),
    date = $bindable(''),
    dueDate = $bindable(''),
    items = $bindable([]),
    itemsTotal = 0,
    onSubmit
  }: {
    showModal: boolean;
    editingId: number | null;
    isClosed?: boolean;
    isSubmitting: boolean;
    clientName: string;
    clientAddress: string;
    clientEmail: string;
    subject: string;
    location: string;
    period: string;
    attendees: string;
    date: string;
    dueDate: string;
    items: InvoiceFormItem[];
    itemsTotal: number;
    onSubmit: (e: Event) => void;
  } = $props();

  function addItem() {
    items = [...items, { description: '', quantity: 1, unitPriceStr: '' }];
  }

  function removeItem(index: number) {
    items = items.filter((_, i) => i !== index);
    if (items.length === 0) {
      items = [{ description: '', quantity: 1, unitPriceStr: '' }];
    }
  }
</script>

<Sheet.Root bind:open={showModal}>
  <Sheet.Content class="w-full data-[side=right]:sm:max-w-2xl flex flex-col h-full bg-card border-border overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title class="flex items-center gap-2">
        <FileText class="w-5 h-5 text-primary" />
        {editingId ? 'Modifier la facture' : 'Créer une facture'}
      </Sheet.Title>
      <Sheet.Description class="hidden">Création ou modification des factures NBA 91.</Sheet.Description>
    </Sheet.Header>

    <form onsubmit={onSubmit} class="flex flex-col flex-1 overflow-hidden">
      <div class="p-6 overflow-y-auto space-y-6 flex-1">
        <!-- Client Information -->
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Informations Client</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="clientName" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Nom du Client *</label>
              <Input type="text" id="clientName" bind:value={clientName} placeholder="Ex: Mairie de Nozay ou Nom d'entreprise" required disabled={isClosed} />
            </div>
            <div class="space-y-1.5">
              <label for="clientEmail" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Email du Client</label>
              <div class="relative">
                <Input type="email" id="clientEmail" bind:value={clientEmail} placeholder="client@domaine.com" class="pl-9" disabled={isClosed} />
                <Mail class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div class="space-y-1.5">
            <label for="clientAddress" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse du Client</label>
            <div class="relative">
              <Textarea id="clientAddress" bind:value={clientAddress} placeholder="Adresse complète..." rows={2} class="pl-9" disabled={isClosed} />
              <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <!-- Details / Period -->
        <div class="space-y-4 pt-4">
          <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Objet & Période</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="subject" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Objet de la facture *</label>
              <Input type="text" id="subject" bind:value={subject} placeholder="Ex: Subvention 2026, Location..." required disabled={isClosed} />
            </div>
            <div class="space-y-1.5">
              <label for="period" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Période concernée</label>
              <div class="relative">
                <Input type="text" id="period" bind:value={period} placeholder="Ex: Année 2026, Septembre..." class="pl-9" disabled={isClosed} />
                <Calendar class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="location" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Lieu</label>
              <div class="relative">
                <Input type="text" id="location" bind:value={location} placeholder="Ex: Nozay" class="pl-9" disabled={isClosed} />
                <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label for="attendees" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Participants / Destinataires</label>
              <div class="relative">
                <Input type="text" id="attendees" bind:value={attendees} placeholder="Ex: Jeunes, Licenciés..." class="pl-9" disabled={isClosed} />
                <Users class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="date" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'émission *</label>
              <Input type="date" id="date" bind:value={date} required disabled={isClosed} />
            </div>
            <div class="space-y-1.5">
              <label for="dueDate" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'échéance *</label>
              <Input type="date" id="dueDate" bind:value={dueDate} required disabled={isClosed} />
            </div>
          </div>
        </div>

        <!-- Billing Items -->
        <div class="space-y-4 pt-4">
          <div class="flex items-center justify-between border-b border-border pb-1">
            <h4 class="text-sm font-bold text-primary uppercase tracking-wider">Lignes de facturation</h4>
            {#if !isClosed}
              <Button type="button" variant="outline" size="sm" onclick={addItem} class="h-8 gap-1">
                <Plus class="w-4 h-4" /> Ajouter une ligne
              </Button>
            {/if}
          </div>

          {#if items.length === 0}
            <Alert.Root variant="info" class="bg-muted/30">
              <Info class="w-4 h-4" />
              <Alert.Description>Aucune ligne de facturation. Veuillez en ajouter au moins une.</Alert.Description>
            </Alert.Root>
          {:else}
            <div class="space-y-3">
              {#each items as item, index}
                <InvoiceItemRow
                  {item}
                  {index}
                  {isClosed}
                  onRemove={removeItem}
                />
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <Sheet.Footer class="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div class="text-sm font-medium">
          Total : <span class="text-lg font-bold text-primary">{(itemsTotal / 100).toFixed(2)} €</span>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button type="button" variant="outline" onclick={() => { showModal = false; }} disabled={isSubmitting}>
            Annuler
          </Button>
          {#if !isClosed}
            <Button type="submit" disabled={isSubmitting || items.length === 0} class="gap-1.5 min-w-[120px]">
              {#if isSubmitting}
                <div class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                Enregistrement...
              {:else}
                <Check class="w-4 h-4" /> Enregistrer
              {/if}
            </Button>
          {/if}
        </div>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
