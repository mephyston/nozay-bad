<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import { Button, Input, Sheet, Label, Alert, Select, FormField } from '@nba/ui';
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
        <Alert.Root variant="destructive" class="p-3 text-xs rounded-md flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0" />
        <Alert.Description>{errorMsg}</Alert.Description>
        </Alert.Root>
      {/if}

      <!-- Ligne 1 : Montant et Date en Grille -->
      <div class="grid grid-cols-2 gap-4">
          <FormField id="amount-input" label="Montant (€)">
          <Input id="amount-input" type="number" step="0.01" min="0.01" bind:value={amount} required />
          </FormField>
          <FormField id="date-input" label="Date">
          <Input id="date-input" type="date" bind:value={date} required />
        </FormField>
      </div>

      <!-- Ligne 2 : Saison -->
        <FormField id="season-select-panel" label="Saison d'affectation">
        <Select id="season-select-panel" bind:value={targetSeasonId}>
          {#each seasons as s}
            <option value={s.id}>{s.name}</option>
          {/each}
          {#if seasons.length === 0}
            <option value="25-26">Saison 2025-2026</option>
          {/if}
        </Select>
      </FormField>

      <!-- Ligne 3 : Catégorie / Comptes en Grille -->
      {#if showPanel !== 'transfert'}
        <div class="grid grid-cols-2 gap-4">
            <FormField id="category-select" label="Catégorie">
            <Select id="category-select" bind:value={category}>
              {#each activeCategories as cat}
                <option value={cat.id}>{cat.name}</option>
              {/each}
            </Select>
            </FormField>
            <FormField id="account-select" label="Compte financier">
            <Select id="account-select" bind:value={formAccountId}>
              {#each formAccountOptions as {value: key, label}}
                <option value={key}>{label}</option>
              {/each}
            </Select>
          </FormField>
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-4">
            <FormField id="account-select" label="Compte Source">
            <Select id="account-select" bind:value={formAccountId}>
              {#each formAccountOptions as {value: key, label}}
                <option value={key}>{label}</option>
              {/each}
            </Select>
            </FormField>
            <FormField id="dest-account-select" label="Compte Destinataire">
            <Select id="dest-account-select" bind:value={destinationAccountId}>
              {#each formAccountOptions as {value: key, label}}
                {#if key !== formAccountId}
                  <option value={key}>{label}</option>
                {/if}
              {/each}
            </Select>
          </FormField>
        </div>
      {/if}

      <!-- Ligne 4 : Moyen de paiement -->
      {#if showPanel !== 'transfert'}
          <FormField id="payment-method-select" label="Moyen de paiement">
          <Select id="payment-method-select" bind:value={paymentMethod}>
            {#each Object.entries(methodLabels) as [key, label]}
              <option value={key}>{label}</option>
            {/each}
          </Select>
        </FormField>
      {/if}

      <!-- Ligne Accrual (Régularisation) -->
      {#if showPanel !== 'transfert'}
        <div class="grid grid-cols-1 gap-4">
            <FormField id="accrual-select" label="Régularisation (Cut-off)">
            <Select id="accrual-select" bind:value={accrualType}>
              <option value="normal">Normal (Même exercice comptable)</option>
              {#if showPanel === 'recette'}
                <option value="produit_constate_avance">Produit constaté d'avance (Recette pour la saison prochaine)</option>
                <option value="produit_a_recevoir">Produit à recevoir (Subvention attendue, etc.)</option>
              {/if}
              {#if showPanel === 'depense'}
                <option value="charge_constatee_avance">Charge constatée d'avance (Payé pour la saison prochaine)</option>
                <option value="charge_a_payer">Charge à payer (Facture non parvenue / attendue)</option>
              {/if}
            </Select>
          </FormField>
          {#if accrualType !== 'normal'}
              <FormField id="accrual-note-input" label="Note justificative *">
              <Input id="accrual-note-input" type="text" placeholder="Ex: Cotisation 2026-2027 payée en avance" bind:value={accrualNote} required />
            </FormField>
          {/if}
        </div>
      {/if}

      <!-- Lignes 5 et 6 : Description & Référence -->
        <FormField id="description-input" label="Description / Motif">
        <Input id="description-input" type="text" placeholder="Ex: Cotisation annuelle..." bind:value={description} required />
      </FormField>

        <FormField id="ref-input" label="Référence (Optionnel)">
        <Input id="ref-input" type="text" placeholder="Ex: Chèque n°1234, Virement..." bind:value={reference} />
      </FormField>

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
