<script lang="ts">
  import { Sidebar } from "@nba/ui";
  import AdminLayoutInner from "./AdminLayoutInner.svelte";
  import { onMount } from "svelte";

  let { children, email = "admin@nozay-bad.fr", breadcrumb = "Tableau de Bord" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
    breadcrumb?: string;
  }>();

  // Keep track of desktop sidebar open state in localstorage
  let sidebarOpen = $state(true);

  onMount(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      sidebarOpen = saved !== "true";
    }
  });

  function handleOpenChange(open: boolean) {
    sidebarOpen = open;
    localStorage.setItem("sidebar_collapsed", String(!open));
  }
</script>

<Sidebar.Provider bind:open={sidebarOpen} onOpenChange={handleOpenChange}>
  <AdminLayoutInner {email} {breadcrumb}>
    {@render children?.()}
  </AdminLayoutInner>
</Sidebar.Provider>
