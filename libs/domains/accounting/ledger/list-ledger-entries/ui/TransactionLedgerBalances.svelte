<script lang="ts">
  import { Card } from '@nba/ui';
  import type { BalanceReport } from './ledger-types';
  import { accountLabels } from './ledger-types';

  let { balances = [] }: { balances: BalanceReport[] } = $props();

  function getAccountBalance(acc: 'current' | 'savings' | 'cash') {
    const match = balances.find(b => b.accountId === acc);
    return match ? (match.finalBalance / 100).toFixed(2) : '0.00';
  }
</script>

<div class="grid gap-4 md:grid-cols-3">
  {#each Object.entries(accountLabels) as [key, label]}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">{label}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-bold">{getAccountBalance(key as any)} €</div>
      </Card.Content>
    </Card.Root>
  {/each}
</div>
