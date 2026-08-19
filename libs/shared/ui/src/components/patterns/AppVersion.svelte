<script lang="ts">
  import { cn } from "../../lib/utils";
  
  let { class: className } = $props<{ class?: string }>();
  
  const version = typeof import.meta.env !== 'undefined' ? import.meta.env.PUBLIC_APP_VERSION : "0.0.0";
</script>

<div class={cn("text-[10px] text-muted-foreground/60 text-center", className)}>
  v{version || "0.0.0"}
</div>
