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

  /*
   * L'identité, que l'habillage va chercher lui-même.
   *
   * Elle arrivait en props, du serveur. Une page figée n'a pas de serveur pour les lui
   * donner : sans cette autonomie, `prerender` afficherait une barre latérale sans
   * entrées et un bandeau d'usurpation muet.
   *
   * Trois sources, dans cet ordre :
   *
   * 1. les props, quand la page les passe encore — rendu serveur, aucun battement ;
   * 2. le dernier état connu, gardé dans `localStorage` — la barre s'affiche garnie dès
   *    le premier pinceau, sans attendre le réseau ;
   * 3. `/admin/api/me`, qui fait autorité et corrige les deux précédentes.
   *
   * Le cache peut être périmé : un compte dont les droits viennent d'être retirés verrait
   * brièvement une entrée de trop, et se ferait refuser à l'ouverture. C'est le compromis
   * assumé — l'API reste l'autorité, ici on ne fait qu'afficher.
   */
  const CLE_IDENTITE = 'admin_identite';

  interface Identite {
    email: string;
    name?: string | null;
    permissions: string[];
    realEmail: string;
  }

  function derniereConnue(): Identite | null {
    try {
      const brut = localStorage.getItem(CLE_IDENTITE);
      return brut ? (JSON.parse(brut) as Identite) : null;
    } catch {
      // Stockage illisible ou refusé : on attendra simplement le réseau.
      return null;
    }
  }

  const initiale: Identite = email
    ? { email, name, permissions, realEmail }
    : (derniereConnue() ?? { email: '', name: undefined, permissions: [], realEmail: '' });

  let identite = $state<Identite>(initiale);

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

    /*
      L'identité est confirmée à chaque montage, y compris quand la page l'a passée en
      props : c'est ce qui garde le cache frais pour les pages qui, elles, n'en passent
      pas. Un échec laisse l'affichage en place plutôt que de le vider — perdre son menu
      parce que le réseau a hoqueté serait pire que de le garder un instant de trop.
    */
    void (async () => {
      try {
        const res = await fetch('/admin/api/me');
        if (!res.ok) return;
        const recue = (await res.json()).data as Identite;
        if (!recue?.email) return;
        identite = recue;
        try {
          localStorage.setItem(CLE_IDENTITE, JSON.stringify(recue));
        } catch {
          /* Sans stockage, le prochain montage refera simplement la requête. */
        }
      } catch {
        /* Identité indisponible : on garde ce qu'on affiche déjà. */
      }
    })();
  });

  function handleOpenChange(open: boolean) {
    sidebarOpen = open;
    localStorage.setItem("sidebar_collapsed", String(!open));
  }
</script>

<Sidebar.Provider bind:open={sidebarOpen} onOpenChange={handleOpenChange}>
  <AdminLayoutInner
    email={identite.email}
    name={identite.name}
    permissions={identite.permissions}
    realEmail={identite.realEmail}
    {breadcrumb}
  >
    {@render children?.()}
  </AdminLayoutInner>
  <Toaster position="top-right" richColors />
</Sidebar.Provider>
