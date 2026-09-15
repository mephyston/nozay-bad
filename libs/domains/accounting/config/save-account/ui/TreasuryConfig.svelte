<script lang="ts">
  import { Plus, Edit2, Trash2, Power, Store, Landmark, CreditCard, AlertCircle } from '@lucide/svelte';
  import { Alert, Badge, Button, Card, DataTable, DataTableToolbar, DataTableColumnHeader, DataTableRowActions, DropdownMenu, Table, toast } from '@nba/ui';
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
    else if (state.errorMsg) toast.error(state.errorMsg);
  }
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

  <section class="space-y-3" data-testid="treasury-accounts">
    <h2 class="text-base font-semibold flex items-center gap-2"><Landmark class="w-4 h-4 text-primary" /> Comptes de trésorerie</h2>
    <DataTable data={accounts} emptyTitle="Aucun compte" emptyDescription="Créez le compte bancaire du club pour ouvrir la comptabilité.">
      {#snippet toolbar()}
        <DataTableToolbar hasSearch={false}>
          {#snippet actions()}
            {#if canWrite}
              <Button size="sm" class="font-bold flex items-center gap-1.5" onclick={() => openAccount(null)}>
                <Plus class="w-4 h-4" /> Nouveau compte
              </Button>
            {/if}
          {/snippet}
        </DataTableToolbar>
      {/snippet}

      {#snippet mobileView()}
        <div class="flex flex-col gap-4">
          {#each accounts as account (account.id)}
            <Card.Root class={account.active ? "" : "opacity-60"}>
              <Card.Content class="p-4 flex flex-col gap-2">
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <div class="font-semibold">{account.label}</div>
                    <div class="text-xs font-mono text-muted-foreground">{account.code} · classe {account.classCode}</div>
                  </div>
                  <Badge variant={account.active ? 'info' : 'secondary'} size="sm">{ACCOUNT_KIND_LABELS[account.kind]}</Badge>
                </div>
                {#if canWrite && account.kind !== 'third_party'}
                  <div class="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" onclick={() => rowAction(() => api.setAccountActive(state, account.id, !account.active))}>
                      {account.active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button variant="outline" size="sm" onclick={() => openAccount(account)}>Modifier</Button>
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
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
    <p class="text-xs text-muted-foreground">
      Un compte ne se supprime pas : ses écritures y renvoient. Désactivé, il sort des menus et des formulaires et garde son historique.
      Le compte d'attente des adhérents se gère avec le rapprochement.
    </p>
  </section>

  <section class="space-y-3" data-testid="payment-methods">
    <h2 class="text-base font-semibold flex items-center gap-2"><CreditCard class="w-4 h-4 text-primary" /> Moyens de paiement</h2>
    <DataTable data={paymentMethods} emptyTitle="Aucun moyen de paiement" emptyDescription="Ajoutez ce que le club accepte.">
      {#snippet toolbar()}
        <DataTableToolbar hasSearch={false}>
          {#snippet actions()}
            {#if canWrite}
              <Button size="sm" class="font-bold flex items-center gap-1.5" onclick={() => openMethod(null)}>
                <Plus class="w-4 h-4" /> Nouveau moyen
              </Button>
            {/if}
          {/snippet}
        </DataTableToolbar>
      {/snippet}

      {#snippet mobileView()}
        <div class="flex flex-col gap-4">
          {#each paymentMethods as method (method.id)}
            <Card.Root class={method.active ? "" : "opacity-60"}>
              <Card.Content class="p-4 flex flex-col gap-2">
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <div class="font-semibold">{method.label}</div>
                    <div class="text-xs text-muted-foreground">{PAYMENT_KIND_LABELS[method.kind]} · {accountLabel(method.defaultAccountCode)}</div>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    {#if !method.active}<Badge variant="secondary" size="sm">Inactif</Badge>
                    {:else if method.storefront}<Badge variant="success" size="sm">Boutique</Badge>
                    {:else}<Badge variant="info" size="sm">Admin seulement</Badge>{/if}
                  </div>
                </div>
                {#if canWrite && method.kind !== 'internal'}
                  <div class="flex flex-wrap justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" onclick={() => rowAction(() => api.setPaymentMethodFlags(state, method.id, { active: !method.active }))}>
                      {method.active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button variant="outline" size="sm" onclick={() => openMethod(method)}>Modifier</Button>
                  </div>
                {/if}
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
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
    <p class="text-xs text-muted-foreground">
      « Retirer de la boutique » le cache aux adhérents ; « désactiver partout » le retire aussi de l'administration.
      Un moyen déjà employé par une écriture ou une commande ne se supprime pas.
    </p>
  </section>
</div>

<TreasuryAccountForm bind:open={accountSheet} account={editingAccount} {accountClasses} isSubmitting={state.isSubmitting} error={formError} onSubmit={submitAccount} />
<PaymentMethodForm bind:open={methodSheet} method={editingMethod} {accounts} isSubmitting={state.isSubmitting} error={formError} onSubmit={submitMethod} />
