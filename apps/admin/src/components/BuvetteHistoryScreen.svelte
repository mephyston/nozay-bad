<script lang="ts">
  import { onMount } from 'svelte';
  import { PageHeader } from '@nba/ui';
  import { SessionHistory, SessionReportView } from '@nba/buvette-ui';
  import EcranDistant from './EcranDistant.svelte';

  // La page est figée : l'identifiant de session se lit dans l'adresse, côté navigateur.
  let sessionId = $state<string | null>(null);
  let ready = $state(false);
  onMount(() => {
    sessionId = new URLSearchParams(location.search).get('id');
    ready = true;
  });
</script>

<PageHeader
  title="Historique de la buvette"
  description="Les sessions passées, chaque vente et transaction, et ce qui s'est vendu article par article."
/>

<div class="mt-6">
  {#if ready && sessionId}
    <EcranDistant domaine="buvette" ecran="session-report" variante="formulaire" parametres={{ id: sessionId }}>
      {#snippet pret(d)}
        <SessionReportView report={d.report} categories={d.categories} />
      {/snippet}
    </EcranDistant>
  {:else if ready}
    <EcranDistant domaine="buvette" ecran="history">
      {#snippet pret(d)}
        <SessionHistory sessions={d.sessions} items={d.items} categories={d.categories} />
      {/snippet}
    </EcranDistant>
  {/if}
</div>
