<script lang="ts">
  import { toggleMode } from "mode-watcher";
  import { Sun, Moon } from "lucide-svelte";
  import { onMount } from "svelte";

  let currentMode = $state("light");

  onMount(() => {
    // Détecter le thème initial depuis l'élément racine
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      currentMode = "dark";
    } else {
      currentMode = "light";
    }
  });

  function handleToggle() {
    // Try using mode-watcher first
    try {
      toggleMode();
    } catch (err) {
      console.warn("mode-watcher toggleMode failed, using fallback:", err);
    }

    // Direct DOM and localStorage updates for instant and multi-island consistency
    const html = document.documentElement;
    if (currentMode === "dark") {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
      localStorage.setItem("mode-watcher-mode", '"light"');
      currentMode = "light";
    } else {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
      localStorage.setItem("mode-watcher-mode", '"dark"');
      currentMode = "dark";
    }
  }
</script>

<button
  onclick={handleToggle}
  class="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
  aria-label="Changer de thème"
>
  {#if currentMode === "dark"}
    <Sun class="h-4 w-4" />
  {:else}
    <Moon class="h-4 w-4" />
  {/if}
</button>
