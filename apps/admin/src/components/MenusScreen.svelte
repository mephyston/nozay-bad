<script lang="ts">
  import { MenusManager } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="menus" variante="liste">
  {#snippet pret(d)}
    <MenusManager
      header={d.header}
      footer={d.footer}
      legal={d.legal}
      pages={d.pages}
      canWrite={d.canWrite}
    />
  {/snippet}
</EcranDistant>
