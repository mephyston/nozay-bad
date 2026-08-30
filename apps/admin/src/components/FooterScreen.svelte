<script lang="ts">
  import { SiteSettingsForm } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="footer" variante="formulaire">
  {#snippet pret(d)}
    <SiteSettingsForm settings={d.settings} canWrite={d.canWrite} />
  {/snippet}
</EcranDistant>
