<script lang="ts">
  import { Card, Amount } from '@nba/ui';
  import type { BalanceReport } from './ledger-types';
  import { formAccountOptions } from './ledger-types';

  let { balances = [] }: { balances: BalanceReport[] } = $props();

  /*
   * Ces encarts affichaient le solde COMPTABLE sous le seul nom du compte. Le trésorier le
   * comparait à son relevé, ne tombait pas juste, et en concluait que le logiciel comptait mal
   * — alors que l'écart n'est rien d'autre qu'un chèque encore dans le coffre.
   *
   * D'où la règle : ne jamais afficher un solde sans dire lequel des trois c'est, et montrer le
   * solde bancaire à côté dès qu'il diverge.
   */
  function balanceFor(acc: 'current' | 'savings' | 'cash'): BalanceReport | undefined {
    return balances.find(b => b.accountId === acc);
  }

  function grossCentsOf(balance: BalanceReport | undefined): number {
    if (!balance) return 0;
    return (balance as any).finalBalanceCents ?? balance.finalBalance ?? 0;
  }

  function bankCentsOf(balance: BalanceReport | undefined): number {
    if (!balance) return 0;
    return balance.bankTheoreticalCents ?? grossCentsOf(balance);
  }
</script>

<div class="grid gap-4 md:grid-cols-3">
  {#each formAccountOptions as { value, label }}
    {@const balance = balanceFor(value as any)}
    {@const gross = grossCentsOf(balance)}
    {@const bank = bankCentsOf(balance)}
    {@const decale = bank !== gross}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">{label}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-bold text-foreground">
          <Amount cents={gross} />
        </div>
        <p class="mt-1 text-xs text-muted-foreground">Solde comptable</p>
        <!--
          Le solde bancaire s'affiche TOUJOURS, même identique au comptable. Ne le montrer qu'en
          cas d'écart laissait croire qu'il n'existait pas : l'égalité des deux nombres est une
          information, pas une raison de n'en montrer qu'un.
        -->
        <p class="mt-2 text-sm {decale ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
          <Amount cents={bank} />
          <span class="text-xs font-normal text-muted-foreground">en banque</span>
        </p>
        {#if decale}
          <p class="mt-1 text-xs text-muted-foreground">
            {#if (balance?.inVaultCents ?? 0) > 0}
              <span class="block">
                dont <Amount cents={balance?.inVaultCents ?? 0} /> de chèques encore en coffre
              </span>
            {/if}
            {#if (balance?.pendingDebitCents ?? 0) > 0}
              <span class="block">
                dont <Amount cents={balance?.pendingDebitCents ?? 0} /> en attente de débit
              </span>
            {/if}
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/each}
</div>
