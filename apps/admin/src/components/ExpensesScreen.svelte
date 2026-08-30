<script lang="ts">
  import { ErrorAlert } from '@nba/ui';
  import { ExpensesManager } from '@nba/expenses-ui';
  import EcranDistant from './EcranDistant.svelte';

  /*
    L'action initiale vient de l'URL, lue dans le navigateur : une page figée n'a pas de
    chaîne de requête à passer, et seul le client sait ce que l'utilisateur regarde.
  */
  const actionInitiale =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('action');

  let errorMsg = $state<string | null>(null);
</script>

{#if errorMsg}
  <div class="mb-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<EcranDistant
  domaine="expenses"
  ecran="list"
  variante="liste"
  onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
>
  {#snippet pret(d)}
    <ExpensesManager
      expenses={d.expenses}
      seasonId={d.season}
      seasons={d.seasons}
      categories={d.categories}
      members={d.members}
      initialAction={actionInitiale}
    />
  {/snippet}
</EcranDistant>
