<script lang="ts">
  import { Button, Amount, Combobox, type ComboboxItem, FormField, SearchableCombobox } from '@nba/ui';
  import CreateLedgerEntrySplitRows from './CreateLedgerEntrySplitRows.svelte';

  let {
    selectedTx,
    remainingAmount = 0,
    category = $bindable('1'),
    paymentMethod = $bindable('virement'),
    selectedMemberId = $bindable(''),
    accrualType = $bindable('normal'),
    accrualNote = $bindable(''),
    isSubmitting = false,
    handleCreateAndMatch,
    isSplitMode = $bindable(false),
    splits = $bindable([]),
    addSplitRow,
    removeSplitRow,
    categories = [],
    sortedMembers = [],
    seasons = [],
    targetSeasonId = $bindable(''),
    browsedSeason = '',
    isMemberDropdownOpen = $bindable(false),
    isCategoryDropdownOpen = $bindable(false),
    memberSearchQuery = $bindable(''),
    categorySearchQuery = $bindable('')
  }: {
    selectedTx: any;
    remainingAmount: number;
    category: string;
    paymentMethod: string;
    selectedMemberId: string;
    accrualType: string;
    accrualNote: string;
    isSubmitting: boolean;
    /**
     * Déclenche la création et le rapprochement. **Sans argument** : le gestionnaire lit
     * lui-même la ligne bancaire et l'adhérent dans l'état partagé.
     *
     * Ce composant lui passait auparavant l'identifiant de l'adhérent, alors qu'il
     * attend une ligne bancaire. Les deux contrats avaient divergé sans que rien ne le
     * signale, et l'argument — un nombre — écrasait la ligne sélectionnée.
     */
    handleCreateAndMatch: () => void;
    isSplitMode: boolean;
    splits: { category: string; amount: number }[];
    addSplitRow: () => void;
    removeSplitRow: (idx: number) => void;
    categories: any[];
    sortedMembers: any[];
    seasons: any[];
    /** Exercice auquel l'écriture est rattachée — pas celui qu'on consulte. */
    targetSeasonId: string;
    /** Exercice consulté, pour signaler l'écart sans avoir à le deviner. */
    browsedSeason: string;
    isMemberDropdownOpen: boolean;
    isCategoryDropdownOpen: boolean;
    memberSearchQuery: string;
    categorySearchQuery: string;
  } = $props();

  const PAYMENT_METHODS = [
    { value: 'virement', label: 'Virement bancaire' },
    { value: 'carte', label: 'Carte bancaire' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'especes', label: 'Espèces' },
    { value: 'prelevement', label: 'Prélèvement' },
    { value: 'pass_sport', label: 'Pass Sport' },
    { value: 'ancv', label: 'Chèque vacances (ANCV)' },
    { value: 'labaz', label: 'LABAZ' },
    { value: 'ticket_loisir', label: 'Ticket Loisir' },
    { value: 'up_loisir', label: 'Up Loisir' }
  ];

  let categoryItems = $derived<ComboboxItem[]>(
    categories.map(c => ({
      value: String(c.id),
      label: c.name || c.adminLabel || ''
    }))
  );

  // `seasonCode` n'est posé que sur les adhérents d'une autre saison que celle
  // consultée : le montrer évite de rattacher une cotisation au mauvais exercice, deux
  // adhésions d'un même adhérent étant sinon indiscernables dans la liste.
  let memberItems = $derived<ComboboxItem[]>(
    sortedMembers.map(m => ({
      value: String(m.id),
      label: m.seasonCode ? `${m.lastName} ${m.firstName} (${m.seasonCode})` : `${m.lastName} ${m.firstName}`,
      detail: m.licence
    }))
  );

  let seasonItems = $derived(
    seasons.map((s: any) => ({
      value: String(s.code || s.id),
      label: `${s.name || s.code}${s.active ? ' (active)' : ''}${s.closed ? ' — clôturée' : ''}`
    }))
  );

  let splitSum = $derived(splits.reduce((sum, s) => sum + Math.round((s.amount || 0) * 100), 0));
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h4 class="text-sm font-semibold text-foreground">Créer et rapprocher une nouvelle écriture</h4>
    <Button
      variant="outline"
      size="xs"
      onclick={() => {
        isSplitMode = !isSplitMode;
        if (isSplitMode && splits.length === 0) {
          splits = [{ category: '1', amount: 0 }, { category: '1', amount: 0 }];
        }
      }}
    >
      {isSplitMode ? 'Annuler la ventilation' : 'Ventiler'}
    </Button>
  </div>

  {#if !isSplitMode}
    <div>
      <Combobox
        id="category-search-input"
        label="Catégorie Comptable"
        placeholder="Rechercher une catégorie..."
        bind:value={category}
        items={categoryItems}
        allowClear={false}
      />
    </div>
  {:else}
    <CreateLedgerEntrySplitRows
      bind:splits
      {remainingAmount}
      {splitSum}
      {categories}
      {addSplitRow}
      {removeSplitRow}
    />
  {/if}

  <!--
    L'exercice de rattachement se choisit ici, et non dans l'en-tête.

    Celui de l'en-tête filtre l'écran et provoque une navigation : s'en servir pour
    changer l'exercice de l'écriture remontait le formulaire à zéro et réappliquait la
    suggestion du modèle, effaçant la correction qu'on venait de saisir. Une cotisation
    encaissée en août pour la rentrée doit pouvoir partir sur l'exercice suivant sans
    quitter la ligne qu'on rapproche — c'est ce que le compte de résultat attend, lui
    qui lit `season_id` là où la trésorerie lit la date.
  -->
  <div class="mt-4">
    <FormField label="Exercice de rattachement">
      <SearchableCombobox bind:value={targetSeasonId} items={seasonItems} />
    </FormField>
    {#if browsedSeason && targetSeasonId && targetSeasonId !== browsedSeason}
      <p class="mt-1 text-xs text-muted-foreground">
        L'écriture comptera dans l'exercice {targetSeasonId}, alors que vous consultez {browsedSeason}.
      </p>
    {/if}
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
    <div>
      <Combobox
        id="payment-method-search-input"
        label="Mode de règlement"
        placeholder="Rechercher un mode..."
        bind:value={paymentMethod}
        items={PAYMENT_METHODS}
        allowClear={false}
      />
    </div>
    <div>
      <Combobox
        id="member-search-input"
        label="Adhérent Associé (Optionnel)"
        placeholder="Tapez pour rechercher un adhérent..."
        bind:value={selectedMemberId}
        items={memberItems}
        allowClear={true}
        clearLabel="Aucun adhérent (Écriture générale)"
      />
    </div>
  </div>

  <div class="grid grid-cols-1 gap-4 mt-4">
      <FormField label="Régularisation (Cut-off)">
      <SearchableCombobox
        bind:value={accrualType}
        items={[{ label: 'Normal', value: 'normal' }, ...(selectedTx && selectedTx.amount > 0 ? [{ label: "Produit constaté d'avance (Ex: Cotisation en avance)", value: 'produit_constate_avance' }, { label: 'Produit à recevoir (Ex: Subvention)', value: 'produit_a_recevoir' }] : [{ label: "Charge constatée d'avance (Ex: Assurance en avance)", value: 'charge_constatee_avance' }, { label: 'Charge à payer (Ex: Facture non parvenue)', value: 'charge_a_payer' }])]}
      />
    </FormField>
    {#if accrualType !== 'normal'}
        <FormField label="Note justificative *">
        <input type="text" class="w-full px-3 py-2 border border-destructive/50 bg-background rounded-md text-sm focus:ring-1 focus:ring-destructive" placeholder="Détail de la régularisation..." bind:value={accrualNote} required />
      </FormField>
    {/if}
  </div>

  <div class="pt-2">
    <Button 
      onclick={() => handleCreateAndMatch()}
      disabled={isSubmitting || (isSplitMode && splitSum !== remainingAmount)}
      class="w-full font-bold"
    >
      {#if isSplitMode}
        Enregistrer la ventilation
      {:else}
        <span class="flex items-center justify-center gap-1.5">
          <span>Créer et rapprocher</span>
          <Amount cents={remainingAmount} />
        </span>
      {/if}
    </Button>
  </div>
</div>
