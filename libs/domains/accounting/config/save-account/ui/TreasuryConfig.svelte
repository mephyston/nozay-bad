<script lang="ts">
  import TreasuryAccountList from './TreasuryAccountList.svelte';
  import PaymentMethodList from './PaymentMethodList.svelte';
  import { Plus, Edit2, Trash2, Power, Store, AlertCircle } from '@lucide/svelte';
  import { Alert, Badge, Button, Card, DataTable, DataTableToolbar, DataTableColumnHeader, DataTableRowActions, DropdownMenu, Table, dockDePage, toast, uiAlert } from '@nba/ui';
  import type { SettingsState } from '../../../seasons/list-seasons/ui/settings-api-classes';
  import * as api from './treasury-api';
  import TreasuryAccountForm from './TreasuryAccountForm.svelte';
  import PaymentMethodForm from './PaymentMethodForm.svelte';
  import {
    ACCOUNT_KIND_LABELS,
    ENTRY_STATUS_LABELS,
    PAYMENT_KIND_LABELS,
    type AccountClassOption,
    type PaymentMethodRow,
    type TreasuryAccountRow
  } from './treasury-types';

  /**
   * Les comptes de trésorerie et les moyens de paiement du club.
   *
   * C'est la porte de la comptabilité : sans compte bancaire actif, grand livre,
   * rapprochement, rapports et clôture restent fermés — l'écran le dit en tête. Un compte
   * ou un moyen ne se supprime jamais s'il est référencé : on le rend inactif, et il sort
   * des formulaires en gardant l'historique. Un moyen peut aussi n'être retiré que de la
   * boutique des adhérents.
   */
  let {
    accounts = [],
    paymentMethods = [],
    accountClasses = [],
    canWrite = true,
    onSaved
  }: {
    accounts?: TreasuryAccountRow[];
    paymentMethods?: PaymentMethodRow[];
    accountClasses?: AccountClassOption[];
    canWrite?: boolean;
    /** Après toute écriture aboutie : l'hôte oublie l'identité gardée, le menu suit sans attendre. */
    onSaved?: () => void;
  } = $props();

  let state = $state<SettingsState>({ errorMsg: '', isSubmitting: false });

  let accountSheet = $state(false);
  let editingAccount = $state<TreasuryAccountRow | null>(null);
  let methodSheet = $state(false);
  let editingMethod = $state<PaymentMethodRow | null>(null);
  /** L'erreur d'un formulaire s'affiche dedans : le sheet couvre la page et masquerait un toast. */
  let formError = $state<string | null>(null);

  const hasBankAccount = $derived(accounts.some((a) => a.kind === 'bank' && a.active));
  const accountLabel = (code: string) => accounts.find((a) => a.code === code)?.label ?? code;

  function openAccount(account: TreasuryAccountRow | null) {
    editingAccount = account;
    formError = null;
    accountSheet = true;
  }
  function openMethod(method: PaymentMethodRow | null) {
    editingMethod = method;
    formError = null;
    methodSheet = true;
  }

  async function submitAccount(values: api.AccountValues) {
    formError = null;
    const ok = editingAccount
      ? await api.updateAccount(state, editingAccount.id, values)
      : await api.createAccount(state, values);
    if (ok) {
      accountSheet = false;
      onSaved?.();
    } else formError = state.errorMsg;
  }

  async function submitMethod(values: api.PaymentMethodValues) {
    formError = null;
    const ok = editingMethod
      ? await api.updatePaymentMethod(state, editingMethod.id, values)
      : await api.createPaymentMethod(state, values);
    if (ok) {
      methodSheet = false;
      onSaved?.();
    } else formError = state.errorMsg;
  }

  // Les refus des actions de ligne (dernier compte bancaire, moyen référencé) n'ont pas de
  // formulaire où s'écrire : ils passent en toast.
  async function rowAction(run: () => Promise<boolean>) {
    if (await run()) onSaved?.();
    else if (state.errorMsg) uiAlert(state.errorMsg);
  }

  /*
    Les deux créations descendent dans la barre du bas. Elles vivaient en haut de chaque
    tableau, donc hors de vue dès qu'on parcourt les comptes — c'est-à-dire chaque fois
    qu'on vient en ajouter un.
  */
  $effect(() => {
    if (!canWrite) return;
    return dockDePage.declarerActions(
      [
        { id: 'compte', label: 'Nouveau compte', icon: Plus, run: () => openAccount(null) },
        { id: 'moyen', label: 'Nouveau moyen de paiement', icon: Plus, run: () => openMethod(null) }
      ],
      { icon: Plus, label: 'Ajouter' }
    );
  });
</script>

<div class="space-y-6">
  {#if !hasBankAccount}
    <Alert.Root variant="warning" data-testid="no-bank-account">
      <AlertCircle class="w-4 h-4" />
      <Alert.Title>Aucun compte bancaire actif</Alert.Title>
      <Alert.Description>
        La comptabilité reste fermée — grand livre, rapprochement, rapports, remises de chèques et clôture — tant que le club n'a pas
        un compte bancaire actif. Les factures et les notes de frais, eux, restent disponibles.
      </Alert.Description>
    </Alert.Root>
  {/if}

  <!--
    Les deux rubriques prennent la forme d'un en-tête de section : capitales de douze
    pixels, gris, au-dessus de la carte, l'explication sous elle. Mot pour mot le style
    de `ListSection`, qu'on lit partout ailleurs dans l'application — et il règle un
    conflit de hiérarchie : un `text-base font-semibold` orné d'une icône colorée pesait
    autant que le titre de la page, alors qu'il n'est qu'une étiquette de section.
  -->
  <section data-testid="treasury-accounts">
    <h2 class="flex items-baseline px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comptes de trésorerie</h2>
    <DataTable mobileSpacing="list" data={accounts} emptyTitle="Aucun compte" emptyDescription="Créez le compte bancaire du club pour ouvrir la comptabilité.">
      {#snippet toolbar()}
        <DataTableToolbar hasSearch={false}>
          {#snippet actions()}
            {#if canWrite}
              <Button size="sm" class="font-bold hidden md:flex items-center gap-1.5" onclick={() => openAccount(null)}>
                <Plus class="w-4 h-4" /> Nouveau compte
              </Button>
            {/if}
          {/snippet}
        </DataTableToolbar>
      {/snippet}

      {#snippet mobileView()}
        <TreasuryAccountList
          {accounts}
          {canWrite}
          libelleDeNature={(kind) => ACCOUNT_KIND_LABELS[kind]}
          onEdit={openAccount}
          onToggleActive={(a) => rowAction(() => api.setAccountActive(state, a.id, !a.active))}
        />
      {/snippet}

      {#snippet header()}
        <DataTableColumnHeader title="Compte" />
        <DataTableColumnHeader title="Nature" />
        <DataTableColumnHeader title="Classe" />
        <DataTableColumnHeader title="N° sur les relevés" />
        <DataTableColumnHeader title="État" />
        <DataTableColumnHeader title="" class="text-right" />
      {/snippet}

      {#snippet row(account)}
        <Table.Row class={account.active ? '' : 'opacity-60'}>
          <Table.Cell class="p-4">
            <div class="font-semibold text-foreground">{account.label}</div>
            <div class="text-xs font-mono text-muted-foreground">{account.code}</div>
          </Table.Cell>
          <Table.Cell class="p-4"><Badge variant={account.kind === 'third_party' ? 'warning' : account.kind === 'voucher' ? 'secondary' : 'info'} size="sm">{ACCOUNT_KIND_LABELS[account.kind]}</Badge></Table.Cell>
          <Table.Cell class="p-4 font-mono text-sm">{account.classCode}</Table.Cell>
          <Table.Cell class="p-4 font-mono text-xs text-muted-foreground">{account.statementAccountNumber ?? '—'}</Table.Cell>
          <Table.Cell class="p-4">
            {#if account.active}<Badge variant="success" size="sm">Actif</Badge>{:else}<Badge variant="secondary" size="sm">Inactif</Badge>{/if}
          </Table.Cell>
          <Table.Cell class="p-4 text-right">
            {#if canWrite && account.kind !== 'third_party'}
              <DataTableRowActions>
                <DropdownMenu.Item onclick={() => openAccount(account)} class="cursor-pointer"><Edit2 class="w-3.5 h-3.5 mr-2" /> Modifier</DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => rowAction(() => api.setAccountActive(state, account.id, !account.active))} class="cursor-pointer">
                  <Power class="w-3.5 h-3.5 mr-2" /> {account.active ? 'Désactiver' : 'Réactiver'}
                </DropdownMenu.Item>
              </DataTableRowActions>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/snippet}
    </DataTable>
    <p class="mt-2 px-4 text-xs text-muted-foreground">
      Un compte ne se supprime pas : ses écritures y renvoient. Désactivé, il sort des menus et des formulaires et garde son historique.
      Le compte d'attente des adhérents se gère avec le rapprochement.
    </p>
  </section>

  <section data-testid="payment-methods">
    <h2 class="flex items-baseline px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moyens de paiement</h2>
    <DataTable mobileSpacing="list" data={paymentMethods} emptyTitle="Aucun moyen de paiement" emptyDescription="Ajoutez ce que le club accepte.">
      {#snippet toolbar()}
        <DataTableToolbar hasSearch={false}>
          {#snippet actions()}
            {#if canWrite}
              <Button size="sm" class="font-bold hidden md:flex items-center gap-1.5" onclick={() => openMethod(null)}>
                <Plus class="w-4 h-4" /> Nouveau moyen
              </Button>
            {/if}
          {/snippet}
        </DataTableToolbar>
      {/snippet}

      {#snippet mobileView()}
        <PaymentMethodList
          {paymentMethods}
          {canWrite}
          libelleDeNature={(kind) => PAYMENT_KIND_LABELS[kind]}
          libelleDeCompte={accountLabel}
          onEdit={openMethod}
          onToggleActive={(m) => rowAction(() => api.setPaymentMethodFlags(state, m.id, { active: !m.active }))}
        />
      {/snippet}

      {#snippet header()}
        <DataTableColumnHeader title="Moyen" />
        <DataTableColumnHeader title="Nature" />
        <DataTableColumnHeader title="Compte crédité" />
        <DataTableColumnHeader title="Écriture" />
        <DataTableColumnHeader title="Proposé" />
        <DataTableColumnHeader title="" class="text-right" />
      {/snippet}

      {#snippet row(method)}
        <Table.Row class={method.active ? '' : 'opacity-60'}>
          <Table.Cell class="p-4">
            <div class="font-semibold text-foreground">{method.label}</div>
            <div class="text-xs font-mono text-muted-foreground">{method.code}</div>
          </Table.Cell>
          <Table.Cell class="p-4">{PAYMENT_KIND_LABELS[method.kind]}</Table.Cell>
          <Table.Cell class="p-4">{accountLabel(method.defaultAccountCode)}</Table.Cell>
          <Table.Cell class="p-4 text-sm text-muted-foreground">{ENTRY_STATUS_LABELS[method.defaultEntryStatus]}</Table.Cell>
          <Table.Cell class="p-4">
            {#if method.kind === 'internal'}<Badge variant="secondary" size="sm">Technique</Badge>
            {:else if !method.active}<Badge variant="secondary" size="sm">Inactif</Badge>
            {:else if method.storefront}<Badge variant="success" size="sm">Boutique et admin</Badge>
            {:else}<Badge variant="info" size="sm">Admin seulement</Badge>{/if}
          </Table.Cell>
          <Table.Cell class="p-4 text-right">
            {#if canWrite && method.kind !== 'internal'}
              <DataTableRowActions>
                <DropdownMenu.Item onclick={() => openMethod(method)} class="cursor-pointer"><Edit2 class="w-3.5 h-3.5 mr-2" /> Modifier</DropdownMenu.Item>
                {#if method.active}
                  <DropdownMenu.Item onclick={() => rowAction(() => api.setPaymentMethodFlags(state, method.id, { storefront: !method.storefront }))} class="cursor-pointer">
                    <Store class="w-3.5 h-3.5 mr-2" /> {method.storefront ? 'Retirer de la boutique' : 'Proposer dans la boutique'}
                  </DropdownMenu.Item>
                {/if}
                <DropdownMenu.Item onclick={() => rowAction(() => api.setPaymentMethodFlags(state, method.id, { active: !method.active }))} class="cursor-pointer">
                  <Power class="w-3.5 h-3.5 mr-2" /> {method.active ? 'Désactiver partout' : 'Réactiver'}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  disabled={method.ledgerUses > 0}
                  onclick={() => rowAction(() => api.deletePaymentMethod(state, method.id))}
                  class="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5 mr-2" /> {method.ledgerUses > 0 ? `Supprimer (${method.ledgerUses} écriture(s) y renvoient)` : 'Supprimer'}
                </DropdownMenu.Item>
              </DataTableRowActions>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/snippet}
    </DataTable>
    <p class="mt-2 px-4 text-xs text-muted-foreground">
      « Retirer de la boutique » le cache aux adhérents ; « désactiver partout » le retire aussi de l'administration.
      Un moyen déjà employé par une écriture ou une commande ne se supprime pas.
    </p>
  </section>
</div>

<TreasuryAccountForm bind:open={accountSheet} account={editingAccount} {accountClasses} isSubmitting={state.isSubmitting} error={formError} onSubmit={submitAccount} />
<PaymentMethodForm bind:open={methodSheet} method={editingMethod} {accounts} isSubmitting={state.isSubmitting} error={formError} onSubmit={submitMethod} />
