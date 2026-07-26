<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import { Button, Input, Sheet, Label } from '@nba/ui';
  import type { Season, Category } from './ledger-types';
  import { accountLabels, methodLabels, formAccountOptions } from './ledger-types';

  let {
    open = $bindable(false),
    showPanel = $bindable(null),
    editingId,
    amount = $bindable(''),
    date = $bindable(''),
    category = $bindable('1'),
    formAccountId = $bindable('current'),
    destinationAccountId = $bindable('cash'),
    paymentMethod = $bindable('virement'),
    description = $bindable(''),
    reference = $bindable(''),
    accrualType = $bindable('normal'),
    accrualNote = $bindable(''),
    targetSeasonId = $bindable(''),
    seasons = [],
    activeCategories = [],
    isSubmitting = $bindable(false),
    errorMsg = $bindable(''),
    onSubmit
  }: {
    open: boolean;
    showPanel: 'recette' | 'depense' | 'transfert' | null;
    editingId: number | null;
    amount: string;
    date: string;
    category: string;
    formAccountId: 'current' | 'savings' | 'cash';
    destinationAccountId: 'current' | 'savings' | 'cash';
    paymentMethod: string;
    description: string;
    reference: string;
    accrualType: string;
    accrualNote: string;
    targetSeasonId: string;
    seasons?: Season[];
    activeCategories: { id: string; code: string; name: string }[];
    isSubmitting: boolean;
    errorMsg: string;
    onSubmit: (e: Event) => void;
  } = $props();
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="sm:max-w-md p-6 bg-card border-border overflow-y-auto h-full">
    <Sheet.Header>
      <Sheet.Title>
        {#if editingId}
          {#if showPanel === 'recette'}🟢 Modifier la recette{:else if showPanel === 'depense'}🔴 Modifier la dépense{:else}🔵 Modifier le virement interne{/if}
        {:else}
          {#if showPanel === 'recette'}🟢 Saisir une recette{:else if showPanel === 'depense'}🔴 Saisir une dépense{:else}🔵 Faire un virement interne{/if}
        {/if}
      </Sheet.Title>
      <Sheet.Description class="hidden">Formulaire de saisie d'écriture comptable</Sheet.Description>
    </Sheet.Header>

    <form onsubmit={onSubmit} class="space-y-4">
      {#if errorMsg}
        <div class="p-3 bg-destructive/15 border border-destructive text-destructive text-xs rounded-md flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      {/if}

      <!-- Ligne 1 : Montant et Date en Grille -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="amount-input" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Montant (€)</Label>
          <Input id="amount-input" type="number" step="0.01" min="0.01" bind:value={amount} required />
        </div>
        <div>
          <Label for="date-input" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Date</Label>
          <Input id="date-input" type="date" bind:value={date} required />
        </div>
      </div>

      <!-- Ligne 2 : Saison -->
      <div>
        <Label for="season-select-panel" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Saison d'affectation</Label>
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
            <Label for="category-select" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Catégorie</Label>
            <select id="category-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={category}>
              {#each activeCategories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </select>
          </div>
          <div>
            <Label for="account-select" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Compte financier</Label>
            <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={formAccountId}>
              {#each formAccountOptions as {value: key, label}}
                <option value={key}>{label}</option>
              {/each}
            </select>
          </div>
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="account-select" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Compte Source</Label>
            <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={formAccountId}>
              {#each formAccountOptions as {value: key, label}}
                <option value={key}>{label}</option>
              {/each}
            </select>
          </div>
          <div>
            <Label for="dest-account-select" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Compte Destinataire</Label>
            <select id="dest-account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={destinationAccountId}>
              {#each formAccountOptions as {value: key, label}}
                {#if key !== formAccountId}
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
          <Label for="payment-method-select" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Moyen de paiement</Label>
          <select id="payment-method-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={paymentMethod}>
            {#each Object.entries(methodLabels) as [key, label]}
              <option value={key}>{label}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Ligne Accrual (Régularisation) -->
      {#if showPanel !== 'transfert'}
        <div class="grid grid-cols-1 gap-4">
          <div>
            <Label for="accrual-select" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Régularisation (Cut-off)</Label>
            <select id="accrual-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accrualType}>
              <option value="normal">Normal (Même exercice comptable)</option>
              {#if showPanel === 'recette'}
                <option value="produit_constate_avance">Produit constaté d'avance (Recette pour la saison prochaine)</option>
                <option value="produit_a_recevoir">Produit à recevoir (Subvention attendue, etc.)</option>
              {/if}
              {#if showPanel === 'depense'}
                <option value="charge_constatee_avance">Charge constatée d'avance (Payé pour la saison prochaine)</option>
                <option value="charge_a_payer">Charge à payer (Facture non parvenue / attendue)</option>
              {/if}
            </select>
          </div>
          {#if accrualType !== 'normal'}
            <div>
              <Label for="accrual-note-input" class="block text-xs font-bold text-destructive uppercase mb-1.5">Note justificative *</Label>
              <Input id="accrual-note-input" type="text" placeholder="Ex: Cotisation 2026-2027 payée en avance" bind:value={accrualNote} required />
            </div>
          {/if}
        </div>
      {/if}

      <!-- Lignes 5 et 6 : Description & Référence -->
      <div>
        <Label for="description-input" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Description / Motif</Label>
        <Input id="description-input" type="text" placeholder="Ex: Cotisation annuelle..." bind:value={description} required />
      </div>

      <div>
        <Label for="ref-input" class="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Référence (Optionnel)</Label>
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
  </Sheet.Content>
</Sheet.Root>
