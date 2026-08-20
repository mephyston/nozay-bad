<script lang="ts">
  import { cn } from "../../lib/utils";
  import { formatAppVersion } from "../../lib/app-version";

  let { class: className } = $props<{ class?: string }>();

  const version = formatAppVersion(
    typeof import.meta.env !== 'undefined' ? import.meta.env.PUBLIC_APP_VERSION : null
  );
</script>

<div class={cn("text-[10px] text-muted-foreground/60 text-center", className)}>
  {version}
</div>
