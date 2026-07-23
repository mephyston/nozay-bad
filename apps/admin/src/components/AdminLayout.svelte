<script lang="ts">
  import { Sidebar } from "@nba/ui";
  import AdminLayoutInner from "./AdminLayoutInner.svelte";
  import { onMount } from "svelte";

  let { children, email = "admin@nozay-bad.fr", breadcrumb = "Tableau de Bord" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
    breadcrumb?: string;
  }>();

  // Synchronously initialize sidebar open state to prevent layout shift during hydration
  let sidebarOpen = $state(
    typeof localStorage !== "undefined" && localStorage.getItem("sidebar_collapsed") !== null
      ? localStorage.getItem("sidebar_collapsed") !== "true"
      : true
  );

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
