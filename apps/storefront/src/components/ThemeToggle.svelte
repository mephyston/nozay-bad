<script lang="ts">
  import { toggleMode } from "mode-watcher";
  import { Sun, Moon } from "@lucide/svelte";
  import { onMount } from "svelte";

  let currentMode = $state("light");

  onMount(() => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      currentMode = "dark";
    } else {
      currentMode = "light";
    }
  });

  function handleToggle() {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");

    if (isDark) {
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

    try {
      toggleMode();
    } catch {}
  }
</script>

<button
  type="button"
  onclick={handleToggle}
  class="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
  aria-label="Changer de thème"
>
  {#if currentMode === "dark"}
    <Sun class="h-4 w-4 text-foreground" />
  {:else}
    <Moon class="h-4 w-4 text-foreground" />
  {/if}
</button>
