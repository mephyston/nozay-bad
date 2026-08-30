<script lang="ts">
  import { EventsManager } from '@nba/events-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant domaine="events" ecran="events" variante="liste">
  {#snippet pret(d)}
    <EventsManager
      events={d.events}
      canWrite={d.canWrite}
      canDelete={d.canDelete}
      canReadRegistrations={d.canReadRegistrations}
    />
  {/snippet}
</EcranDistant>
