<script lang="ts">
  import { Sidebar, Toaster, consumeFlash } from "@nba/ui";
  import AdminLayoutInner from "./AdminLayoutInner.svelte";
  import { onMount } from "svelte";

  /*
   * `email` n'a **pas** de valeur par défaut, et n'en aura pas.
   *
   * Elle valait l'adresse du compte d'administration du jeu d'essai : toute page qui
   * oubliait de passer la prop affichait donc ce compte à la place de l'utilisateur,
   * et le bandeau d'usurpation — qui se déclenche sur `realEmail !== email` — se
   * levait pour tout le monde, en développement comme en production, en proposant de
   * « revenir » à un compte qu'on n'avait jamais quitté. Un défaut vide fait mieux :
   * l'oubli se voit dans l'interface au lieu d'inventer une identité.
   */
  let { children, email = "", name, permissions = [], realEmail = "", breadcrumb = "Tableau de Bord" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
    name?: string;
    permissions?: string[];
    /** Compte réellement connecté ; diffère de `email` pendant une usurpation. */
    realEmail?: string;
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
  <AdminLayoutInner {email} {name} {permissions} {realEmail} {breadcrumb}>
    {@render children?.()}
  </AdminLayoutInner>
  <Toaster position="top-right" richColors />
</Sidebar.Provider>
