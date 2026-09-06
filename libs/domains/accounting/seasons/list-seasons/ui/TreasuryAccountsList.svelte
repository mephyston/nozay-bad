<script lang="ts">
  import { Landmark } from '@lucide/svelte';
  import { Card, Badge, Table } from '@nba/ui';
  import type { AccountClass, TreasuryAccount } from './settings-types';

  let {
    accounts = [],
    accountClasses = []
  }: {
    accounts?: TreasuryAccount[];
    accountClasses?: AccountClass[];
  } = $props();

  const classLabel = (code: string) => accountClasses.find((c) => c.code === code)?.label ?? '';
  /** Classe 4 du plan comptable : un compte de tiers, dont le solde est une dette et non de la trésorerie. */
  const isThirdParty = (account: TreasuryAccount) => /^4/.test(account.classCode);
</script>

<!--
  Les comptes du club et la classe qui les porte, en lecture seule : ils naissent par
  migration, pas depuis l'écran. Sans cette liste, rien ne disait où le porte-monnaie Badnet
  ou le compte d'attente des adhérents se rangeaient dans le plan comptable.
-->
<Card.Root data-testid="treasury-accounts">
  <Card.Header class="pb-2">
    <Card.Title class="text-sm font-medium text-muted-foreground flex items-center gap-2">
      <Landmark class="w-4 h-4" />
      Comptes de trésorerie
    </Card.Title>
    <Card.Description>
      Les comptes sur lesquels les mouvements sont enregistrés, et leur classe. Un compte de tiers
      porte de l'argent qui n'appartient pas au club : son solde est une dette, hors des totaux de trésorerie.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    {#if accounts.length === 0}
      <p class="text-sm text-muted-foreground">Aucun compte.</p>
    {:else}
      <div class="overflow-x-auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Compte</Table.Head>
              <Table.Head class="hidden sm:table-cell">Code</Table.Head>
              <Table.Head>Classe</Table.Head>
              <Table.Head class="text-right">Nature</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each accounts as account (account.id)}
              <Table.Row>
                <Table.Cell class="font-semibold text-foreground">{account.label}</Table.Cell>
                <Table.Cell class="hidden sm:table-cell font-mono text-xs text-muted-foreground">{account.code}</Table.Cell>
                <Table.Cell>
                  <span class="font-bold text-foreground">{account.classCode}</span>
                  {#if classLabel(account.classCode)}
                    <span class="hidden md:inline text-muted-foreground"> · {classLabel(account.classCode)}</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right">
                  {#if isThirdParty(account)}
                    <Badge variant="warning" size="sm">Tiers · dette</Badge>
                  {:else}
                    <Badge variant="info" size="sm">Disponibilités</Badge>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
