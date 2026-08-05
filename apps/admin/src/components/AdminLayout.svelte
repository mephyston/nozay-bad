<script lang="ts">
  import { Sidebar, Toaster, consumeFlash } from "@nba/ui";
  import AdminLayoutInner from "./AdminLayoutInner.svelte";
  import { onMount } from "svelte";

  let { children, email = "admin@nozaybad.fr", name, permissions = [], breadcrumb = "Tableau de Bord" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
    name?: string;
    permissions?: string[];
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
    // Rejoue le message de confirmation d'une action qui a rechargé la page.
    consumeFlash();
  });

  function handleOpenChange(open: boolean) {
    sidebarOpen = open;
    localStorage.setItem("sidebar_collapsed", String(!open));
  }
</script>

<Sidebar.Provider bind:open={sidebarOpen} onOpenChange={handleOpenChange}>
  <AdminLayoutInner {email} {name} {permissions} {breadcrumb}>
    {@render children?.()}
  </AdminLayoutInner>
  <Toaster position="top-right" richColors />
</Sidebar.Provider>
