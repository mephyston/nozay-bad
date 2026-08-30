<script lang="ts">
  import { ErrorAlert } from '@nba/ui';
  import { BankStatementReconciliation } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Le rapprochement bancaire.
   *
   * L'écran le plus cher de l'administration avant conversion : 148 ms mesurées en
   * préproduction, pour seize lectures.
   */
  let { parametres = {} }: { parametres?: Record<string, string> } = $props();

  let errorMsg = $state<string | null>(null);
</script>

{#if errorMsg}
  <div class="mb-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<EcranDistant
  domaine="accounting"
  ecran="reconciliation"
  variante="liste"
  {parametres}
  onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
>
  {#snippet pret(d)}
    <BankStatementReconciliation
      bankStatementLines={d.bankStatementLines}
      glTransactions={d.glTransactions}
      seasons={d.seasons}
      seasonId={d.seasonId}
      members={d.members}
      dbCategories={d.dbCategories}
      reconciliationStatements={d.reconciliationStatements}
    />
  {/snippet}
</EcranDistant>
