<script lang="ts">
  import { toggleMode, mode } from "mode-watcher";
  import { Sun, Moon } from "lucide-svelte";
</script>

<button
  onclick={toggleMode}
  class="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  aria-label="Changer de thème"
>
  {#if mode.current === "dark"}
    <Sun class="h-4 w-4" />
  {:else}
    <Moon class="h-4 w-4" />
  {/if}
</button>
