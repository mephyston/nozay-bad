<script lang="ts">
  import { Card, Amount } from '@nba/ui';
  import type { BalanceReport } from './ledger-types';
  import { formAccountOptions } from './ledger-types';

  let { balances = [] }: { balances: BalanceReport[] } = $props();

  function getAccountBalanceCents(acc: 'current' | 'savings' | 'cash') {
    const match = balances.find(b => b.accountId === acc);
    return match ? ((match as any).finalBalanceCents ?? match.finalBalance ?? 0) : 0;
  }
</script>

<div class="grid gap-4 md:grid-cols-3">
  {#each formAccountOptions as { value, label }}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">{label}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-bold text-foreground">
          <Amount cents={getAccountBalanceCents(value as any)} />
        </div>
      </Card.Content>
    </Card.Root>
  {/each}
</div>
