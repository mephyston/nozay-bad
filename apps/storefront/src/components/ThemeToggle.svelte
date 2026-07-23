<script lang="ts">
  import { toggleMode, setMode } from "mode-watcher";
  import { Sun, Moon } from "@lucide/svelte";
  import { onMount } from "svelte";

  let isDark = $state(
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  onMount(() => {
    isDark = document.documentElement.classList.contains("dark");
  });

  function handleToggle() {
    isDark = !isDark;
    const newMode = isDark ? "dark" : "light";
    const html = document.documentElement;

    if (newMode === "dark") {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    }

    try {
      setMode(newMode);
    } catch {
      try {
        toggleMode();
      } catch {}
    }
  }
</script>

<button
  type="button"
  onclick={handleToggle}
  class="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
  aria-label="Changer de thème"
>
  {#if isDark}
    <Sun class="h-4 w-4 text-foreground" />
  {:else}
    <Moon class="h-4 w-4 text-foreground" />
  {/if}
</button>
