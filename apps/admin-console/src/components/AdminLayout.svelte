<script lang="ts">
  import { Sidebar } from "@metacult/shared-ui";
  import AdminLayoutInner from "./AdminLayoutInner.svelte";
  import { onMount } from "svelte";

  let { children, email = "admin@nozay-bad.fr", breadcrumb = "Tableau de Bord" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
    breadcrumb?: string;
  }>();

  // Keep track of desktop sidebar collapsed state in localstorage
  let sidebarCollapsed = $state(false);

  onMount(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      sidebarCollapsed = saved === "true";
    }
  });

  function handleOpenChange(open: boolean) {
    sidebarCollapsed = !open;
    localStorage.setItem("sidebar_collapsed", String(sidebarCollapsed));
  }
</script>

<Sidebar.Provider open={!sidebarCollapsed} onOpenChange={handleOpenChange}>
  <AdminLayoutInner {email} {breadcrumb}>
    {@render children?.()}
  </AdminLayoutInner>
</Sidebar.Provider>
