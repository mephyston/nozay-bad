<script lang="ts">
  import { PageHeader, ErrorAlert } from '@nba/ui';
  import { NotificationsManager } from '@nba/notifications-ui';
  import EcranDistant from './EcranDistant.svelte';

  let errorMsg = $state<string | null>(null);
</script>

<PageHeader
  title="Notifications"
  description="Envoyez une annonce aux adhérents qui ont activé les notifications sur leur téléphone."
/>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <EcranDistant
    domaine="notifications"
    ecran="overview"
    variante="liste"
    onDonnees={(d) => (errorMsg = d.errorMsg ?? null)}
  >
    {#snippet pret(d)}
      <NotificationsManager
        stats={d.stats}
        messages={d.messages}
        groups={d.groups}
        canSend={d.canSend}
        scheduled={d.scheduled}
      />
    {/snippet}
  </EcranDistant>
</div>
