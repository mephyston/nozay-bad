<script lang="ts">
  import { toggleMode } from "mode-watcher";
  import { Sun, Moon } from "@lucide/svelte";
  import { onMount } from "svelte";

  let isDark = $state(false);

  onMount(() => {
    isDark = document.documentElement.classList.contains("dark");
  });

  function handleToggle() {
    isDark = !isDark;
    const html = document.documentElement;

    if (isDark) {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
      try {
        localStorage.setItem("mode-watcher-mode", '"dark"');
        localStorage.setItem("mode-watcher-user-preference", '"dark"');
      } catch {}
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
      try {
        localStorage.setItem("mode-watcher-mode", '"light"');
        localStorage.setItem("mode-watcher-user-preference", '"light"');
      } catch {}
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
  {#if isDark}
    <Sun class="h-4 w-4 text-foreground" />
  {:else}
    <Moon class="h-4 w-4 text-foreground" />
  {/if}
</button>
