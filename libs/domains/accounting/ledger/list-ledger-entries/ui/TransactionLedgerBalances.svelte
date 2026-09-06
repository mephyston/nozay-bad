<script lang="ts">
  import { Card, Amount } from '@nba/ui';
  import type { BalanceReport } from './ledger-types';

  let { balances = [] }: { balances: BalanceReport[] } = $props();

  /*
   * Deux nombres, et un seul est calculé.
   *
   * Ces encarts affichaient le solde comptable, puis un solde « en banque » déduit des statuts
   * (comptable − chèques en coffre + débits différés). Le libellé promettait une confirmation
   * de la banque que le nombre ne livrait pas : une recette saisie par virement naît `cleared`,
   * donc le déplaçait — alors que rien ne prouvait que l'argent fût arrivé. Saisir une écriture
   * bougeait les deux soldes, ce qui est exactement ce qu'on cherchait à rendre impossible.
   *
   * On affiche donc le solde du dernier relevé importé. Il ne bouge sur aucune saisie, et sa
   * date rappelle que les deux soldes ne sont pas arrêtés au même jour. Le nombre déduit des
   * statuts n'a pas disparu : il vit dans l'état de rapprochement, où le détail des décalages
   * l'explique au lieu de le laisser sans justification.
   *
   * Un compte sans relevé — la caisse, le porte-monnaie Badnet — n'affiche rien de plus. Mieux
   * vaut un vide qu'un pseudo-solde bancaire pour un compte qui n'a pas de banque.
   *
   * Une carte par ligne du bilan, quel qu'en soit le nombre : les comptes sont des données.
   */
  function grossCentsOf(balance: BalanceReport | undefined): number {
    if (!balance) return 0;
    return (balance as any).finalBalanceCents ?? balance.finalBalance ?? 0;
  }

  function formatDay(iso: string | null | undefined): string {
    if (!iso) return '';
    const [, month, day] = iso.split('-');
    return `${day}/${month}`;
  }
</script>

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  {#each balances as balance (balance.accountId)}
    {@const label = balance.label ?? balance.accountId}
    {@const gross = grossCentsOf(balance)}
    {@const releve = balance?.statementBalanceCents ?? null}
    {@const ecart = releve === null ? 0 : releve - gross}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">{label}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-3xl font-bold text-foreground">
          <Amount cents={gross} />
        </div>
        <p class="mt-1 text-xs text-muted-foreground">Solde comptable</p>

        {#if releve !== null}
          <p class="mt-3 text-lg font-semibold text-foreground">
            <Amount cents={releve} />
          </p>
          <p class="text-xs text-muted-foreground">
            Relevé au {formatDay(balance?.statementDate)}
            {#if ecart !== 0}
              · écart <Amount cents={ecart} showSign />
            {/if}
          </p>
        {/if}

        {#if (balance?.inVaultCents ?? 0) > 0 || (balance?.pendingDebitCents ?? 0) > 0}
          <p class="mt-2 text-xs text-muted-foreground">
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
