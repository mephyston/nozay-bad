<script lang="ts">
  import { CreditCard } from '@lucide/svelte';
  import { FormSheet, FormField, Input, SearchableCombobox, SwitchField } from '@nba/ui';
  import {
    DEFAULT_STATUS_BY_KIND,
    ENTRY_STATUS_LABELS,
    PAYMENT_KIND_HINTS,
    PAYMENT_KIND_LABELS,
    type PaymentMethodRow,
    type TreasuryAccountRow
  } from './treasury-types';
  import type { PaymentMethodValues } from './treasury-api';

  /**
   * Le formulaire d'un moyen de paiement, à créer ou à modifier.
   *
   * La nature porte le comportement — ce que la boutique dit à l'adhérent, l'état de
   * naissance de l'écriture — et propose un statut d'écriture que le trésorier peut
   * corriger. Le compte crédité est un compte de trésorerie actif.
   */
  let {
    open = $bindable(false),
    method = null,
    accounts = [],
    isSubmitting = false,
    error = null,
    onSubmit
  }: {
    open: boolean;
    method?: PaymentMethodRow | null;
    accounts?: TreasuryAccountRow[];
    isSubmitting?: boolean;
    error?: string | null;
    onSubmit: (values: PaymentMethodValues) => void;
  } = $props();

  const KINDS = (['transfer', 'cheque', 'cash', 'card', 'voucher'] as const).map((k) => ({ value: k, label: PAYMENT_KIND_LABELS[k] }));
  const STATUSES = (Object.keys(ENTRY_STATUS_LABELS) as PaymentMethodRow['defaultEntryStatus'][]).map((s) => ({ value: s, label: ENTRY_STATUS_LABELS[s] }));
  const accountItems = $derived(
    accounts.filter((a) => a.active && a.kind !== 'third_party').map((a) => ({ value: a.code, label: a.label }))
  );

  let code = $state('');
  let label = $state('');
  let kind = $state<PaymentMethodValues['kind']>('transfer');
  let defaultAccountCode = $state('');
  let defaultEntryStatus = $state<PaymentMethodValues['defaultEntryStatus']>('cleared');
  let storefront = $state(true);

  $effect(() => {
    if (!open) return;
    code = method?.code ?? '';
    label = method?.label ?? '';
    kind = method && method.kind !== 'internal' ? method.kind : 'transfer';
    defaultAccountCode = method?.defaultAccountCode ?? accountItems.find((a) => accounts.find((x) => x.code === a.value)?.kind === 'bank')?.value ?? accountItems[0]?.value ?? '';
    defaultEntryStatus = method?.defaultEntryStatus ?? 'cleared';
    storefront = method?.storefront ?? true;
  });

  // Changer de nature propose son statut naturel ; une nature choisie à la main garde le sien.
  function onKindChange(value: string) {
    kind = value as PaymentMethodValues['kind'];
    defaultEntryStatus = DEFAULT_STATUS_BY_KIND[kind];
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit({ code: code.trim(), label: label.trim(), kind, defaultAccountCode, defaultEntryStatus, storefront });
  }
</script>

<FormSheet
  bind:open
  title={method ? 'Modifier le moyen de paiement' : 'Nouveau moyen de paiement'}
  description={method ? `${method.label} — le code ${method.code} ne change pas.` : 'Ce que le club accepte : virement, chèque, espèces, carte, bons.'}
  icon={CreditCard}
  {error}
  {isSubmitting}
  onSubmit={handleSubmit}
>
  {#if !method}
    <FormField id="method-code" label="Code" hint="Minuscules, chiffres et tirets bas.">
      <Input id="method-code" bind:value={code} placeholder="cheque_vacances" class="font-mono" required />
    </FormField>
  {/if}
  <FormField id="method-label" label="Libellé" hint="Tel que les adhérents le liront dans la boutique.">
    <Input id="method-label" bind:value={label} placeholder="Chèque-Vacances ANCV" required />
  </FormField>
  <FormField id="method-kind" label="Nature" hint={PAYMENT_KIND_HINTS[kind]}>
    <SearchableCombobox id="method-kind" items={KINDS} value={kind} onValueChange={(v) => onKindChange(String(v))} />
  </FormField>
  <FormField id="method-account" label="Compte crédité">
    <SearchableCombobox id="method-account" items={accountItems} bind:value={defaultAccountCode} />
  </FormField>
  <FormField id="method-status" label="État de l'écriture à la saisie">
    <SearchableCombobox id="method-status" items={STATUSES} bind:value={defaultEntryStatus} />
  </FormField>
  <!-- Un réglage oui/non de formulaire est un interrupteur, comme partout dans l'admin. -->
  <SwitchField
    id="method-storefront"
    label="Proposé dans la boutique des adhérents"
    hint="Désactivé, seule l'administration peut l'employer."
    bind:checked={storefront}
  />
</FormSheet>
