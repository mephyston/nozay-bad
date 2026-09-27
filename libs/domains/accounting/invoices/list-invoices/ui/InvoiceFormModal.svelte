<script lang="ts">
  import { Plus, FileText, Mail, MapPin, Info } from '@lucide/svelte';
  import { Button, Input, Alert, Textarea, Amount, FormField, FormSheet } from '@nba/ui';
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
    date = $bindable(''),
    items = $bindable([]),
    itemsTotal = 0,
    categories = [],
    onSubmit
  }: {
    showModal: boolean;
    editingId: number | null;
    isClosed?: boolean;
    isSubmitting: boolean;
    clientName: string;
    clientAddress: string;
    clientEmail: string;
    date: string;
    items: InvoiceFormItem[];
    itemsTotal: number;
    /** Nomenclature comptable proposée à chaque ligne. */
    categories?: { value: string; label: string }[];
    onSubmit: (e: Event) => void;
  } = $props();

  function addItem() {
    items = [...items, { description: '', quantity: 1, unitPriceStr: '', categoryId: '' }];
  }

  function removeItem(index: number) {
    items = items.filter((_, i) => i !== index);
    if (items.length === 0) {
      items = [{ description: '', quantity: 1, unitPriceStr: '', categoryId: '' }];
    }
  }
</script>

<!--
  La coquille commune des formulaires de l'admin. Le tiroir maison qui vivait ici gardait
  ses marges de bureau sur un téléphone et posait « Enregistrer » au pied de la feuille,
  sous le clavier ; `FormSheet` monte du bas et porte ses actions hors de sa portée.
  Saison clôturée : la facture se consulte, elle ne s'enregistre pas.
-->
<FormSheet
  bind:open={showModal}
  title={editingId ? 'Modifier la facture' : 'Créer une facture'}
  icon={FileText}
  size="xl"
  {isSubmitting}
  lectureSeule={isClosed}
  {onSubmit}
>
  <div class="space-y-6">
    <!-- Client Information -->
    <div class="space-y-4">
      <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Informations Client</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="clientName" label="Nom du Client *">
          <Input type="text" id="clientName" bind:value={clientName} placeholder="Ex: Mairie ou nom d'entreprise" required disabled={isClosed} />
        </FormField>
        <FormField id="clientEmail" label="Email du Client">
        <Input type="email" id="clientEmail" bind:value={clientEmail} placeholder="client@domaine.com" disabled={isClosed} icon={Mail} />
        </FormField>
      </div>
        <FormField id="clientAddress" label="Adresse du Client">
        <div class="relative">
          <Textarea id="clientAddress" bind:value={clientAddress} placeholder="Adresse complète..." rows={2} class="pl-9" disabled={isClosed} />
          <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        </div>
      </FormField>
    </div>

    <!-- Date -->
    <div class="space-y-4 pt-4">
      <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Date</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField id="date" label="Date d'émission *">
          <Input type="date" id="date" bind:value={date} required disabled={isClosed} />
        </FormField>
      </div>
    </div>

    <!-- Billing Items -->
    <div class="space-y-4 pt-4">
      <div class="flex items-center justify-between border-b border-border pb-1">
        <h4 class="text-sm font-bold text-primary uppercase tracking-wider">Lignes de facturation</h4>
        {#if !isClosed}
          <Button type="button" variant="outline" size="sm" onclick={addItem} class="gap-1">
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
              {categories}
              onRemove={removeItem}
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Le total se lit sous les lignes, là où l'on vérifie leurs montants. -->
    <p class="flex items-baseline justify-end gap-1.5 border-t border-border pt-3 text-sm font-medium">
      Total de la facture :
      <Amount cents={itemsTotal} class="text-lg font-bold text-primary" />
    </p>
  </div>
</FormSheet>
