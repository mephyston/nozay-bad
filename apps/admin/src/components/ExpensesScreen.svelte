<script lang="ts">
  import { ErrorAlert } from '@nba/ui';
  import { ExpensesManager } from '@nba/expenses-ui';
  import EcranDistant from './EcranDistant.svelte';

  let {
    parametres = {},
    initialAction = null
  }: { parametres?: Record<string, string>; initialAction?: string | null } = $props();

  let errorMsg = $state<string | null>(null);
</script>

{#if errorMsg}
  <div class="mb-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<EcranDistant
  domaine="expenses"
  ecran="list"
  variante="liste"
  {parametres}
  onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
>
  {#snippet pret(d)}
    <ExpensesManager
      expenses={d.expenses}
      seasonId={d.season}
      seasons={d.seasons}
      categories={d.categories}
      members={d.members}
      {initialAction}
    />
  {/snippet}
</EcranDistant>
