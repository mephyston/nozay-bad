<script lang="ts">
  import { ErrorAlert } from '@nba/ui';
  import { OpenPlayManager } from '@nba/schedules-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant domaine="schedules" ecran="jeu-libre" variante="liste">
  {#snippet pret(d)}
    <!--
      Le message vient du relais, qui a vu le code de retour : « désactivé sur cet
      environnement » et « pas le droit » ne se devinent pas depuis le navigateur, et les
      confondre coûte un aller-retour de diagnostic à chaque fois.
    -->
    {#if d.errorMsg}
      <div class="mb-6"><ErrorAlert message={d.errorMsg} /></div>
    {/if}

    <OpenPlayManager
      sessions={d.sessions}
      venues={d.venues}
      slots={d.slots}
      canWrite={d.canWrite}
      canReadRegistrations={d.canReadRegistrations}
    />
  {/snippet}
</EcranDistant>
