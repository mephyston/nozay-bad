<script lang="ts">
  import { PostsManager } from '@nba/cms-ui';
  import EcranDistant from './EcranDistant.svelte';
</script>

<EcranDistant ecran="posts" variante="liste">
  {#snippet pret(d)}
    <PostsManager posts={d.posts} media={d.media} categories={d.categories} canWrite={d.canWrite} canDelete={d.canDelete} canUploadMedia={d.canUploadMedia} canNotify={d.canNotify} targets={d.targets} events={d.events} />
  {/snippet}
</EcranDistant>
