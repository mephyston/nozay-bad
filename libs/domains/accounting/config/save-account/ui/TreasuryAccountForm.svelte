<script lang="ts">
  import { Landmark } from '@lucide/svelte';
  import { FormSheet, FormField, Input, SearchableCombobox } from '@nba/ui';
  import { ACCOUNT_KIND_HINTS, ACCOUNT_KIND_LABELS, type AccountClassOption, type TreasuryAccountRow } from './treasury-types';
  import type { AccountValues } from './treasury-api';

  /**
   * Le formulaire d'un compte de trésorerie, à créer ou à modifier.
   *
   * Le code ne change pas après création : les écrans par compte le portent dans leur
   * adresse, et les moyens de paiement comme l'historique y renvoient.
   */
  let {
    open = $bindable(false),
    account = null,
    accountClasses = [],
    isSubmitting = false,
    error = null,
    onSubmit
  }: {
    open: boolean;
    account?: TreasuryAccountRow | null;
    accountClasses?: AccountClassOption[];
    isSubmitting?: boolean;
    error?: string | null;
    onSubmit: (values: AccountValues) => void;
  } = $props();

  const KINDS = (['bank', 'cash', 'wallet', 'voucher'] as const).map((k) => ({ value: k, label: ACCOUNT_KIND_LABELS[k] }));
  const treasuryClasses = $derived(
    accountClasses.filter((c) => c.type === 'tresorerie').map((c) => ({ value: c.code, label: `${c.code} · ${c.label}` }))
  );

  let code = $state('');
  let label = $state('');
  let kind = $state<AccountValues['kind']>('bank');
  let accountClassCode = $state('');
  let statementAccountNumber = $state('');

  // Le formulaire se remplit à l'ouverture, depuis le compte modifié ou à vide.
  $effect(() => {
    if (!open) return;
    code = account?.code ?? '';
    label = account?.label ?? '';
    kind = account && account.kind !== 'third_party' ? account.kind : 'bank';
    // À défaut, une classe de disponibilités (5xx) : la classe 4 des tiers vient avant dans l'ordre du plan.
    accountClassCode = account?.classCode ?? treasuryClasses.find((c) => c.value.startsWith('5'))?.value ?? treasuryClasses[0]?.value ?? '';
    statementAccountNumber = account?.statementAccountNumber ?? '';
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit({ code: code.trim(), label: label.trim(), kind, accountClassCode, statementAccountNumber: statementAccountNumber.trim() });
  }
</script>

<FormSheet
  bind:open
  title={account ? 'Modifier le compte' : 'Nouveau compte'}
  description={account ? `${account.label} — le code ${account.code} ne change pas.` : 'Un compte bancaire, une caisse ou un porte-monnaie chez un tiers.'}
  icon={Landmark}
  {error}
  {isSubmitting}
  onSubmit={handleSubmit}
>
  {#if !account}
    <FormField id="account-code" label="Code" hint="Minuscules, chiffres et tirets bas : il figure dans l'adresse de l'écran du compte.">
      <Input id="account-code" bind:value={code} placeholder="livret_a" class="font-mono" required />
    </FormField>
  {/if}
  <FormField id="account-label" label="Libellé">
    <Input id="account-label" bind:value={label} placeholder="Livret A" required />
  </FormField>
  <FormField id="account-kind" label="Nature" hint={ACCOUNT_KIND_HINTS[kind]}>
    <SearchableCombobox id="account-kind" items={KINDS} bind:value={kind} />
  </FormField>
  <FormField id="account-class" label="Classe du plan comptable">
    <SearchableCombobox id="account-class" items={treasuryClasses} bind:value={accountClassCode} />
  </FormField>
  {#if kind === 'bank'}
    <FormField id="account-statement-number" label="Numéro de compte sur les relevés" hint="Tel que la banque l'écrit dans ses exports (OFX : ACCTID). L'import y reconnaît ce compte ; laissez vide s'il n'y a qu'un compte sans numéro.">
      <Input id="account-statement-number" bind:value={statementAccountNumber} placeholder="00012345678" class="font-mono" />
    </FormField>
  {/if}
</FormSheet>
