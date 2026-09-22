<script lang="ts">
  import { ArrowLeftRight, Minus, Plus } from '@lucide/svelte';
  import { FormSheet, Input, SearchableCombobox, FormField, toSeasonOptions } from '@nba/ui';
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
  const NATURES = {
    recette: { indefini: 'une recette', defini: 'la recette', icone: Plus },
    depense: { indefini: 'une dépense', defini: 'la dépense', icone: Minus },
    transfert: { indefini: 'un virement interne', defini: 'le virement interne', icone: ArrowLeftRight }
  } as const;

  const nature = $derived(NATURES[showPanel ?? 'recette']);
  /*
    Le titre nomme l'acte, sans emoji : la coquille porte déjà une icône, et un rond de
    couleur dans un titre ne se lit pas au lecteur d'écran.
  */
  const titre = $derived(
    editingId
      ? `Modifier ${nature.defini}`
      : showPanel === 'transfert'
        ? 'Faire un virement interne'
        : `Saisir ${nature.indefini}`
  );

  /**
   * L'adhérent est facultatif : le « sans adhérent » devient une option du choix plutôt
   * qu'un bouton d'effacement, parce que l'écran de choix plein cadre — celui qu'ouvre
   * `SearchableCombobox` au doigt — n'a pas d'endroit où poser ce bouton.
   */
  const memberOptions = $derived([
    { label: 'Aucun adhérent (recette générale)', value: '' },
    ...memberItems.map((m) => ({
      label: m.detail ? `${m.label} (${m.detail})` : m.label,
      value: String(m.value)
    }))
  ]);

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

<!--
  La coquille commune des formulaires de l'admin.

  Cet écran gardait la sienne : `Sheet.Root` monté à la main, en-tête maison, et ses
  deux boutons posés dans le flux, en bas du formulaire. Au doigt, une feuille est
  ancrée au bas de l'écran : le clavier logiciel recouvrait donc « Valider » dès qu'on
  saisissait un montant. `FormSheet` place les actions dans la barre de navigation,
  hors de sa portée.
-->
<FormSheet
  bind:open
  title={titre}
  icon={nature.icone}
  error={errorMsg || null}
  {isSubmitting}
  submitLabel="Valider"
  submittingLabel="Enregistrement…"
  {onSubmit}
>
  <!-- Montant et date : côte à côte à la souris, l'un sous l'autre au doigt. -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FormField id="amount-input" label="Montant (€)">
      <Input id="amount-input" type="number" step="0.01" min="0.01" bind:value={amount} required class="tabular-nums" />
    </FormField>
    <FormField id="date-input" label="Date">
      <Input id="date-input" type="date" bind:value={date} required />
    </FormField>
  </div>

  <FormField id="season-select-panel" label="Saison d'affectation">
    <SearchableCombobox id="season-select-panel" items={seasonItems} bind:value={targetSeasonId} />
  </FormField>

  {#if showPanel !== 'transfert'}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField id="category-select" label="Catégorie">
        <SearchableCombobox
          id="category-select"
          items={categoryItems}
          bind:value={category}
          searchPlaceholder="Rechercher une catégorie…"
        />
      </FormField>
      <FormField id="account-select" label="Compte financier">
        <SearchableCombobox id="account-select" items={accountItems} bind:value={formAccountId} />
      </FormField>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField id="account-select" label="Compte source">
        <SearchableCombobox id="account-select" items={accountItems} bind:value={formAccountId} />
      </FormField>
      <FormField id="dest-account-select" label="Compte destinataire">
        <SearchableCombobox id="dest-account-select" items={destinationItems} bind:value={destinationAccountId} />
      </FormField>
    </div>

    <!--
      La date de crédit, distincte de celle du débit.

      Un virement s'écrit en deux écritures, une par compte : l'argent peut sortir un
      jour et arriver un autre. C'est le cas courant du dépôt d'espèces, sorti de la
      caisse le lundi et crédité en banque le jeudi. Laissée vide, elle vaut celle du
      débit — le cas d'un virement de compte à compte, instantané.
    -->
    <FormField
      id="destination-date-input"
      label="Date de crédit (si différente)"
      hint="L'écart entre les deux dates, c'est l'argent en transit : sorti d'un compte, pas encore arrivé dans l'autre."
    >
      <Input id="destination-date-input" type="date" min={date} bind:value={destinationDate} />
    </FormField>
  {/if}

  {#if showPanel !== 'transfert'}
    <FormField id="payment-method-select" label="Moyen de paiement">
      <SearchableCombobox id="payment-method-select" items={paymentItems} bind:value={paymentMethod} />
    </FormField>
  {/if}

  <!--
    L'adhérent qui paie. Au doigt, `SearchableCombobox` ouvre l'écran de choix plein
    cadre, avec sa recherche — l'autocomplétion en place qui vivait ici déroulait un
    panneau que le clavier recouvrait aussitôt.
  -->
  {#if showPanel === 'recette' && members.length > 0}
    <FormField
      id="member-select"
      label="Adhérent (optionnel)"
      hint={memberDroppedBySeason
        ? "L'adhérent choisi relevait d'un autre exercice : à choisir de nouveau dans celui-ci."
        : "C'est ce rattachement qui fait apparaître le règlement sur sa fiche et son attestation."}
    >
      <SearchableCombobox
        id="member-select"
        items={memberOptions}
        bind:value={memberId}
        placeholder="Aucun adhérent (recette générale)"
        searchPlaceholder="Nom ou licence…"
        emptyText="Aucun adhérent trouvé."
        onValueChange={() => (memberDroppedBySeason = false)}
      />
    </FormField>
  {/if}

  {#if showPanel !== 'transfert'}
    <FormField id="accrual-select" label="Régularisation (cut-off)">
      <SearchableCombobox id="accrual-select" items={accrualItems} bind:value={accrualType} />
    </FormField>
    {#if accrualType !== 'normal'}
      <FormField id="accrual-note-input" label="Note justificative *">
        <Input
          id="accrual-note-input"
          type="text"
          placeholder="Ex : cotisation 2026-2027 payée en avance"
          bind:value={accrualNote}
          required
        />
      </FormField>
    {/if}
  {/if}

  <FormField id="description-input" label="Description / motif">
    <Input id="description-input" type="text" placeholder="Ex : cotisation annuelle…" bind:value={description} required />
  </FormField>

  <FormField id="ref-input" label="Référence (optionnel)">
    <Input id="ref-input" type="text" placeholder="Ex : chèque n°1234, virement…" bind:value={reference} />
  </FormField>
</FormSheet>
