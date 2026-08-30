<script lang="ts">
  import { MediaLibrary } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="media" variante="grille">
  {#snippet pret(d)}
    <MediaLibrary media={d.media} canWrite={d.canWrite} canDelete={d.canDelete} />
  {/snippet}
</EcranDistant>
