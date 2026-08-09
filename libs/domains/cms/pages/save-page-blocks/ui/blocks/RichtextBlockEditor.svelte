<script lang="ts">
  import { RichTextEditor } from '@nba/ui';
  import type { RichtextBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: RichtextBlock }>();
</script>

<RichTextEditor bind:value={block.html} />
<p class="text-muted-foreground mt-1 text-xs">
  Le titre principal de la page est déjà affiché : commencez la hiérarchie au niveau 2.
</p>
