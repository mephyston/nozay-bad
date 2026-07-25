<script lang="ts">
  import { PanelLeft } from "@lucide/svelte";

  function toggleSidebar() {
    const sidebar = document.getElementById("admin-sidebar");
    if (sidebar) {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("sidebar_collapsed", String(isCollapsed));
    }
  }
</script>

<button
  type="button"
  onclick={toggleSidebar}
  class="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer transition-colors inline-flex items-center justify-center"
  aria-label="Basculer le menu de navigation"
>
  <PanelLeft class="h-4 w-4" />
</button>
