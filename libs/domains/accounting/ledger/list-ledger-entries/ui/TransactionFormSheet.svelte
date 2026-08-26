<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import { Button, Input, Sheet, Label, Alert, SearchableCombobox, FormField } from '@nba/ui';
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
    destinationDate = $bindable(''),
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
    destinationDate: string;
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

  const seasonItems = $derived(
    seasons.length > 0
      ? seasons.map((s) => ({ label: s.name, value: String(s.id) }))
      : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );
  const categoryItems = $derived(activeCategories.map((cat) => ({ label: cat.name, value: String(cat.id) })));
  const accountItems = $derived(formAccountOptions.map(({ value, label }) => ({ label, value: String(value) })));
  const destinationItems = $derived(
    formAccountOptions.filter(({ value }) => value !== formAccountId).map(({ value, label }) => ({ label, value: String(value) }))
  );
  const paymentItems = $derived(Object.entries(methodLabels).map(([key, label]) => ({ label: label as string, value: key })));
  const accrualItems = $derived([
    { label: 'Normal (Même exercice comptable)', value: 'normal' },
    ...(showPanel === 'recette'
      ? [
          { label: "Produit constaté d'avance (Recette pour la saison prochaine)", value: 'produit_constate_avance' },
          { label: 'Produit à recevoir (Subvention attendue, etc.)', value: 'produit_a_recevoir' }
        ]
      : []),
    ...(showPanel === 'depense'
      ? [
          { label: "Charge constatée d'avance (Payé pour la saison prochaine)", value: 'charge_constatee_avance' },
          { label: 'Charge à payer (Facture non parvenue / attendue)', value: 'charge_a_payer' }
        ]
      : [])
  ]);
</script>

<Sheet.Root bind:open>
  <Sheet.Content size="md" class="overflow-y-auto h-full">
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
        <SearchableCombobox id="season-select-panel" items={seasonItems} bind:value={targetSeasonId} />
      </FormField>

      <!-- Ligne 3 : Catégorie / Comptes en Grille -->
      {#if showPanel !== 'transfert'}
        <div class="grid grid-cols-2 gap-4">
            <FormField id="category-select" label="Catégorie">
            <SearchableCombobox id="category-select" items={categoryItems} bind:value={category} searchPlaceholder="Rechercher une catégorie..." />
            </FormField>
            <FormField id="account-select" label="Compte financier">
            <SearchableCombobox id="account-select" items={accountItems} bind:value={formAccountId} />
          </FormField>
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-4">
            <FormField id="account-select" label="Compte Source">
            <SearchableCombobox id="account-select" items={accountItems} bind:value={formAccountId} />
            </FormField>
            <FormField id="dest-account-select" label="Compte Destinataire">
            <SearchableCombobox id="dest-account-select" items={destinationItems} bind:value={destinationAccountId} />
          </FormField>
        </div>

        <!--
          La date de crédit, distincte de celle du débit.

          Un virement s'écrit désormais en deux écritures, une par compte : l'argent peut donc
          sortir un jour et arriver un autre. C'est le cas courant du dépôt d'espèces, sorti de la
          caisse le lundi et crédité en banque le jeudi. Laissée vide, elle vaut celle du débit —
          le cas d'un virement de compte à compte, instantané.
        -->
        <FormField id="destination-date-input" label="Date de crédit (si différente)">
          <Input id="destination-date-input" type="date" min={date} bind:value={destinationDate} />
          <p class="text-xs text-muted-foreground">
            L'écart entre les deux dates, c'est l'argent en transit : sorti d'un compte, pas encore
            arrivé dans l'autre. Laissée vide, elle vaut celle du débit.
          </p>
        </FormField>
      {/if}

      <!-- Ligne 4 : Moyen de paiement -->
      {#if showPanel !== 'transfert'}
          <FormField id="payment-method-select" label="Moyen de paiement">
          <SearchableCombobox id="payment-method-select" items={paymentItems} bind:value={paymentMethod} />
        </FormField>
      {/if}

      <!-- Ligne Accrual (Régularisation) -->
      {#if showPanel !== 'transfert'}
        <div class="grid grid-cols-1 gap-4">
            <FormField id="accrual-select" label="Régularisation (Cut-off)">
            <SearchableCombobox id="accrual-select" items={accrualItems} bind:value={accrualType} />
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
