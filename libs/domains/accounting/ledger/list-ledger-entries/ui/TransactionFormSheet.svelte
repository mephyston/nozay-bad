<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';
  import { Button, Input, Sheet, Label, Alert, Combobox, SearchableCombobox, FormField, toSeasonOptions } from '@nba/ui';
  import type { Season, Category } from './ledger-types';
  import { toAccountOptions, type AccountLike } from '../../../shared/account-labels';
  import { membersForSeason, toMemberItems, type MemberLike } from './member-options';

  let {
    open = $bindable(false),
    showPanel = $bindable(null),
    editingId,
    amount = $bindable(''),
    date = $bindable(''),
    category = $bindable('1'),
    formAccountId = $bindable(''),
    destinationAccountId = $bindable(''),
    destinationDate = $bindable(''),
    paymentMethod = $bindable(''),
    description = $bindable(''),
    reference = $bindable(''),
    accrualType = $bindable('normal'),
    accrualNote = $bindable(''),
    targetSeasonId = $bindable(''),
    memberId = $bindable(''),
    seasons = [],
    accounts = [],
    paymentMethods = [],
    members = [],
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
    formAccountId: string;
    destinationAccountId: string;
    destinationDate: string;
    paymentMethod: string;
    description: string;
    reference: string;
    accrualType: string;
    accrualNote: string;
    targetSeasonId: string;
    /** L'adhésion rattachée à une recette ; vide = écriture générale. */
    memberId?: string;
    seasons?: Season[];
    /** Les comptes de trésorerie, lus de la base : un sélecteur par compte, quel qu'en soit le nombre. */
    accounts?: AccountLike[];
    /** Les moyens de paiement actifs du club (configuration), `{ code, label }`. */
    paymentMethods?: { code: string; label: string }[];
    /**
     * L'annuaire des exercices ouverts, chaque adhésion marquée de son `seasonCode`. Sans lui,
     * le champ ne s'affiche pas : les écrans qui ne le chargent pas n'y perdent rien.
     */
    members?: MemberLike[];
    activeCategories: { id: string; code: string; name: string }[];
    isSubmitting: boolean;
    errorMsg: string;
    onSubmit: (e: Event) => void;
  } = $props();

  const seasonItems = $derived(
    seasons.length > 0
      ? toSeasonOptions(seasons, { value: 'id' })
      : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );
  const categoryItems = $derived(activeCategories.map((cat) => ({ label: cat.name, value: String(cat.id) })));
  const accountItems = $derived(toAccountOptions(accounts));
  const destinationItems = $derived(toAccountOptions(accounts.filter((a) => a.code !== formAccountId)));
  const paymentItems = $derived(paymentMethods.map((pm) => ({ label: pm.label, value: pm.code })));

  /*
   * L'adhérent, sur une recette seulement — c'est le règlement d'une cotisation, d'un tournoi,
   * d'un achat, et c'est cette écriture que lisent la fiche de l'adhérent et l'attestation. Le
   * champ manquait ici : une cotisation payée en espèces ou en bons Labaz n'apparaissait donc
   * jamais comme réglée, seuls le rapprochement et les chèques savaient la rattacher.
   *
   * L'annuaire est celui de l'exercice d'affectation, et de lui seul : une adhésion appartient
   * à un exercice, et le serveur refuse le couple dépareillé. Changer d'exercice écarte donc
   * l'adhérent qui n'y appartient pas — en le disant, sinon on croirait à un bug.
   */
  const memberChoices = $derived(membersForSeason(members, seasons, targetSeasonId));
  const memberItems = $derived(toMemberItems(memberChoices));
  let memberDroppedBySeason = $state(false);
  $effect(() => {
    if (memberId && memberChoices.length > 0 && !memberChoices.some((m) => String(m.id) === memberId)) {
      memberId = '';
      memberDroppedBySeason = true;
    }
  });
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

      <!-- Ligne 4 bis : l'adhérent qui paie -->
      {#if showPanel === 'recette' && members.length > 0}
        <div>
          <Combobox
            id="member-select"
            label="Adhérent (optionnel)"
            placeholder="Tapez pour rechercher un adhérent..."
            bind:value={memberId}
            items={memberItems}
            allowClear={true}
            clearLabel="Aucun adhérent (recette générale)"
            onselect={() => (memberDroppedBySeason = false)}
          />
          {#if memberDroppedBySeason}
            <p class="mt-1 text-xs text-warning">
              L'adhérent choisi relevait d'un autre exercice : à choisir de nouveau dans celui-ci.
            </p>
          {:else}
            <p class="mt-1 text-xs text-muted-foreground">
              C'est ce rattachement qui fait apparaître le règlement sur sa fiche et son attestation.
            </p>
          {/if}
        </div>
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
