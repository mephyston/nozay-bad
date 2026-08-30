<script lang="ts">
  import {
    ChevronRight,
    Menu as MenuIcon,
    PanelBottom,
    LayoutDashboard,
    Coins,
    Users,
    UploadCloud,
    BarChart3,
    BookOpen,
    FileCheck,
    Scale,
    Landmark,
    Wallet,
    Play,
    Package,
    ShoppingCart,
    Settings,
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    X,
    Trophy,
    ChartNoAxesColumn,
    ShieldCheck,
    User,
    LogOut,
    HelpCircle,
    Bell,
    Megaphone,
    Image,
    FileText,
    Newspaper,
    CalendarClock,
    CalendarDays,
    Signpost,
    DoorOpen,
    KeyRound,
    CircleAlert
  } from "@lucide/svelte";
  import { DropdownMenu } from "bits-ui";
  import { onMount } from "svelte";
  import { Sidebar, Breadcrumb, Separator, Avatar, GlobalConfirm, AppVersion, MobileBottomNav, PwaInstallBanner, ThemeToggle, toast } from "@nba/ui";

  let { children, email, name, permissions = [], realEmail = '', breadcrumb } = $props<{
    children?: import('svelte').Snippet;
    email: string;
    name?: string;
    permissions?: string[];
    /** Compte réellement connecté ; diffère de `email` pendant une usurpation. */
    realEmail?: string;
    breadcrumb: string;
  }>();

  import { can } from '@nba/iam-ui';
  import { NAV_GROUPS } from '../lib/nav';

  const sidebar = Sidebar.useSidebar();

  // Les icônes sont résolues ici : `nav.ts` est aussi importé côté serveur (middleware),
  // où l'on ne veut pas charger de composants Svelte.
  const ICONS: Record<string, any> = {
    LayoutDashboard, Users, BarChart3, BookOpen, FileCheck, Scale,
    Landmark, Wallet, Coins, Package, ShoppingCart, Bell, Megaphone, Image, FileText, Newspaper, CalendarClock, CalendarDays, PanelBottom, Settings, User, HelpCircle,
    Trophy, ChartNoAxesColumn, ShieldCheck, Signpost, DoorOpen, KeyRound,
    Menu: MenuIcon
  };

  // Le menu dérive de la même table que le contrôle d'accès des pages : une entrée
  // visible mène donc toujours à une page ouverte.
  const filteredNavGroups = $derived(
    NAV_GROUPS
      .map(g => ({
        label: g.label,
        // Recopié explicitement : cette projection reconstruit chaque groupe, et tout
        // champ non listé ici disparaît en silence.
        beta: g.beta ?? false,
        items: g.items
          .filter(i => i.permission === null || can(permissions, i.permission))
          .map(i => ({ name: i.name, href: i.href, icon: ICONS[i.icon] }))
      }))
      .filter(g => g.items.length > 0)
  );

  /**
   * Sections repliées, et position de la barre latérale.
   *
   * Le menu compte une vingtaine d'entrées : tout déplier oblige à faire défiler pour
   * atteindre les dernières sections, et l'île est **remontée à chaque navigation** —
   * le défilement repartait donc du haut à chaque changement de page. `transition:persist`
   * réglerait le remontage, mais casse la navigation sur ce layout, qui enveloppe le
   * contenu. On restaure donc l'état à la main, ce qui a l'avantage de survivre aussi à
   * un vrai rechargement.
   */
  const COLLAPSED_KEY = 'sidebar_collapsed_groups';
  const SCROLL_KEY = 'sidebar_scroll';

  /**
   * « Action à réaliser » sur l'entrée Dirigeants : le président ou le trésorier de la
   * saison en cours n'est pas désigné (cas normal en début de saison, après l'AG) —
   * le signal persiste tant que ces deux fonctions ne sont pas pourvues.
   *
   * L'île de layout est remontée à chaque navigation : le statut est mis en cache de
   * session quelques minutes pour ne pas interroger l'API à chaque changement de page.
   */
  const FUNCTIONS_ALERT_KEY = 'club_functions_alert';
  const FUNCTIONS_ALERT_TTL_MS = 5 * 60 * 1000;
  let dirigeantsAlert = $state(false);

  async function refreshDirigeantsAlert() {
    const visible = filteredNavGroups.some((group) =>
      group.items.some((item) => item.href === '/admin/members/dirigeants')
    );
    if (!visible) return;

    try {
      const cached = sessionStorage.getItem(FUNCTIONS_ALERT_KEY);
      if (cached) {
        const { t, alert } = JSON.parse(cached);
        if (Date.now() - t < FUNCTIONS_ALERT_TTL_MS) {
          dirigeantsAlert = Boolean(alert);
          return;
        }
      }
    } catch {
      /* Cache illisible : on interroge simplement l'API. */
    }

    try {
      const res = await fetch('/admin/api/member-functions');
      if (!res.ok) return;
      const body: any = await res.json();
      const alert =
        Boolean(body?.data?.seasonCode) &&
        Array.isArray(body?.data?.missing) &&
        body.data.missing.length > 0;
      dirigeantsAlert = alert;
      try {
        sessionStorage.setItem(FUNCTIONS_ALERT_KEY, JSON.stringify({ t: Date.now(), alert }));
      } catch {
        /* Sans stockage, le prochain rendu refera la requête. */
      }
    } catch {
      /* Statut indisponible : pas d'indicateur plutôt qu'un faux signal. */
    }
  }

  let collapsedGroups = $state<string[]>([]);
  let navElement = $state<HTMLElement | null>(null);

  /** Section contenant la page courante : toujours ouverte, quel qu'ait été le choix. */
  const activeGroupLabel = $derived(
    filteredNavGroups.find((group) => group.items.some((item) => isItemActive(item)))?.label ?? ''
  );

  function isGroupOpen(label: string): boolean {
    if (!label) return true;
    if (label === activeGroupLabel) return true;
    return !collapsedGroups.includes(label);
  }

  function toggleGroup(label: string) {
    collapsedGroups = collapsedGroups.includes(label)
      ? collapsedGroups.filter((value) => value !== label)
      : [...collapsedGroups, label];
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedGroups));
    } catch {
      /* Stockage refusé : le pli vaut au moins pour la session en cours. */
    }
  }

  onMount(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored) collapsedGroups = JSON.parse(stored);
    } catch {
      /* Valeur illisible : on repart toutes sections ouvertes. */
    }

    void refreshDirigeantsAlert();

    if (!navElement) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) navElement.scrollTop = Number(saved);
    } catch {
      /* Sans stockage de session, la barre repart simplement en haut. */
    }

    const remember = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, String(navElement?.scrollTop ?? 0));
      } catch {
        /* Idem : rien à restaurer au prochain rendu. */
      }
    };
    navElement.addEventListener('scroll', remember, { passive: true });
    return () => navElement?.removeEventListener('scroll', remember);
  });

  function isItemActive(item: { name: string, href: string }): boolean {
    const parts = breadcrumb.split(" / ").map(p => p.trim().toLowerCase());
    const primary = parts[0];
    const sub = parts[1];

    if (item.href === "/") {
      return breadcrumb === "Tableau de Bord" || primary === "tableau de bord" || primary === "vue d'ensemble";
    }

    if (item.href === "/admin/expenses") {
      return primary === "note de frais" || primary === "notes de frais";
    }

    // Adhérents
    if (item.href === "/admin/members") {
      return primary === "adhérents" && sub !== "dirigeants";
    }
    if (item.href === "/admin/members/dirigeants") {
      return primary === "adhérents" && sub === "dirigeants";
    }

    // Comptabilité
    if (item.href === "/admin/accounting/reports") {
      return primary === "comptabilité" && (sub === "rapports" || sub === "rapports financiers");
    }
    if (item.href === "/admin/accounting") {
      return primary === "comptabilité" && (!sub || sub === "grand livre");
    }
    if (item.href === "/admin/accounting/invoices") {
      return primary === "comptabilité" && sub === "factures";
    }
    if (item.href === "/admin/accounting/reconciliation") {
      return primary === "comptabilité" && sub === "rapprochement bancaire";
    }
    if (item.href === "/admin/accounting/cheques") {
      return primary === "comptabilité" && sub === "remises de chèques";
    }
    if (item.href === "/admin/accounting/cash-box") {
      return primary === "comptabilité" && sub === "caisse";
    }
    if (item.href === "/admin/accounting/config") {
      return primary === "comptabilité" && sub === "soldes initiaux";
    }

    // Boutique
    if (item.href === "/admin/shop/products") {
      return primary === "boutique" && sub === "produits";
    }
    if (item.href === "/admin/shop/orders") {
      return primary === "boutique" && sub === "commandes";
    }

    // Réglages & IAM
    if (item.href.includes("settings")) {
      return primary === "réglages" || primary === "settings" || primary === "configuration";
    }
    if (item.href === "/admin/iam") {
      return primary === "accès et rôles" || primary === "accès & rôles";
    }
    
    // Aide
    if (item.href === "/admin/help") {
      return primary === "aide" || primary === "assistance" || primary === "centre d'aide";
    }

    return false;
  }

  let impersonateUsers = $state<any[]>([]);

  /*
   * Les comptes usurpables, chargés à l'ouverture du menu et non au montage.
   *
   * Cette liste ne s'affiche que dans le menu du compte, qu'on ouvre presque jamais — et
   * elle partait pourtant à **chaque page** : 410 appels par semaine mesurés en
   * production, chacun étant un aller-retour complet (l'admin appelle son worker, qui
   * appelle l'API, qui lit `admin_users`) sur le chemin critique de l'affichage.
   *
   * Le résultat tient dix minutes en `sessionStorage` : rouvrir le menu, ou l'ouvrir sur
   * une autre page, ne redemande rien. Un compte créé à l'instant peut donc manquer à
   * l'appel pendant ce délai — c'est un écran d'usurpation, pas un annuaire.
   */
  const IMPERSONATE_CACHE_KEY = 'nba:impersonate-users';
  const IMPERSONATE_TTL_MS = 10 * 60_000;
  let impersonateCharge = false;

  function lireCache(): any[] | null {
    try {
      const brut = sessionStorage.getItem(IMPERSONATE_CACHE_KEY);
      if (!brut) return null;
      const { expire, users } = JSON.parse(brut);
      if (typeof expire !== 'number' || expire < Date.now()) return null;
      return Array.isArray(users) ? users : null;
    } catch {
      // Navigation privée, stockage refusé : on recharge, c'est tout.
      return null;
    }
  }

  async function chargerComptesUsurpables() {
    if (impersonateCharge || !can(permissions, 'iam:sessions:impersonate')) return;
    impersonateCharge = true;

    const enCache = lireCache();
    if (enCache) {
      impersonateUsers = enCache;
      return;
    }

    try {
      const res = await fetch('/admin/api/users');
      if (!res.ok) return;
      const json = await res.json();
      impersonateUsers = json.data || [];
      try {
        sessionStorage.setItem(
          IMPERSONATE_CACHE_KEY,
          JSON.stringify({ expire: Date.now() + IMPERSONATE_TTL_MS, users: impersonateUsers })
        );
      } catch {
        // Le cache est un confort : ne pas pouvoir écrire n'empêche pas d'afficher.
      }
    } catch {
      // Menu sans liste plutôt que menu cassé : l'usurpation n'est pas vitale.
      impersonateCharge = false;
    }
  }

  /*
   * Le cookie d'usurpation est HttpOnly : il est posé et retiré par le serveur, et le
   * navigateur ne peut plus le lire. L'état vient donc de la comparaison des deux
   * identités.
   *
   * Les deux doivent être renseignées. Une seule des deux ne dit rien d'une usurpation
   * en cours : elle dit qu'une page a oublié de passer sa prop. C'est ce qui levait le
   * bandeau chez des comptes qui n'avaient jamais emprunté personne — et son bouton de
   * retour ne pouvait alors rien retirer, puisqu'il n'y avait pas de cookie.
   */
  const isImpersonating = $derived(Boolean(realEmail) && Boolean(email) && realEmail !== email);

  async function setImpersonation(target: string | null) {
    const res = await fetch('/admin/api/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target })
    });
    if (!res.ok) {
      toast.error("Le changement de compte a échoué.");
      return;
    }

    /*
     * Prendre une identité renvoie au tableau de bord, jamais sur la page courante.
     *
     * On emprunte un compte depuis l'écran où l'on se trouve — souvent un écran que
     * ce compte, justement, n'a pas le droit d'ouvrir. Recharger sur place accueillait
     * donc l'usurpateur par un « Accès refusé » immédiat, et il fallait le bouton
     * « précédent » pour découvrir que le changement avait bien eu lieu.
     *
     * Le tableau de bord est joignable par construction : son droit fait partie du
     * socle réimposé à tout rôle. Revenir à soi recharge en revanche sur place — on
     * récupère ses propres droits, donc l'écran qu'on regardait.
     */
    if (target) window.location.assign('/');
    else window.location.reload();
  }



  // Parse breadcrumbs
  const breadcrumbParts = $derived(breadcrumb.split(" / "));
  const primaryGroup = $derived(breadcrumbParts[0]?.trim());
  const subGroup = $derived(breadcrumbParts[1]?.trim());

  const displayName = $derived(
    name ? name : ((email.split('@')[0] || "Admin").charAt(0).toUpperCase() + (email.split('@')[0] || "Admin").slice(1).toLowerCase())
  );

  function getBreadcrumbHref(part: string): string | undefined {
    switch (part.toLowerCase().trim()) {
      case "adhérents":
        return "/admin/members";
      case "comptabilité":
        return "/admin/accounting/reports";
      case "boutique":
        return "/admin/shop/products";
      case "note de frais":
        return "/admin/expenses";
      case "configuration":
        return "/admin/settings";
      default:
        return undefined;
    }
  }
</script>

<PwaInstallBanner />

<Sidebar.Root collapsible="icon" variant="inset">
  <!-- Header -->
  <Sidebar.Header class="p-2 border-0 bg-transparent">
    <div class="pt-safe flex items-center w-full justify-between gap-1">
      <Sidebar.Menu class="flex-1">
        <Sidebar.MenuItem>
          <a
            href="/"
            class="flex items-center gap-3 w-full h-8 font-semibold text-sidebar-foreground group-data-[collapsible=icon]:justify-center rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground px-2 group-data-[collapsible=icon]:px-0"
          >
            <img src="/logo.png" alt="Logo" class="h-6 w-6 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 shrink-0 object-contain transition-all duration-200" />
            <span class="group-data-[collapsible=icon]:hidden text-sm truncate">Nozay Bad Admin</span>
          </a>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
      {#if sidebar.isMobile}
        <button
          type="button"
          class="p-1 rounded hover:bg-accent border-0 bg-transparent cursor-pointer flex items-center justify-center shrink-0"
          aria-label="Close menu"
          onclick={(e) => { e.stopPropagation(); sidebar.setOpenMobile(false); }}
        >
          <X class="h-5 w-5" />
        </button>
      {/if}
    </div>
  </Sidebar.Header>

  <!-- Navigation items -->
  <Sidebar.Content class="p-2 space-y-4" bind:ref={navElement}>
    {#each filteredNavGroups as group}
      <Sidebar.Group class="p-0">
        {#if group.label}
          {@const open = isGroupOpen(group.label)}
          {@const isActiveGroup = group.label === activeGroupLabel}
          <!--
            La section de la page courante reste dépliée et son bouton est inerte :
            pouvoir replier la branche sur laquelle on se trouve masquerait l'entrée
            active, et la barre latérale ne dirait plus où l'on est.
          -->
          <button
            type="button"
            onclick={() => !isActiveGroup && toggleGroup(group.label)}
            aria-expanded={open}
            disabled={isActiveGroup}
            class="flex w-full items-center gap-1 rounded-md px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground group-data-[collapsible=icon]:hidden"
          >
            <ChevronRight
              class={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
            <span>{group.label}</span>
            {#if group.beta}
              <!--
                Marqueur discret, à côté du libellé et non sur chaque entrée : c'est la
                rubrique entière qui est jeune, pas telle ou telle page. Un `<span>`
                plutôt que le composant `Badge`, dont la taille est pensée pour du
                contenu, là où ce libellé fait déjà 10 pixels.
              -->
              <span
                class="rounded-sm bg-primary/10 px-1 py-px text-[9px] font-semibold leading-none tracking-wide text-primary"
                title="Rubrique récente : signalez au bureau ce qui vous paraît de travers."
              >
                bêta
              </span>
            {/if}
          </button>
        {/if}
        <Sidebar.GroupContent class={group.label && !isGroupOpen(group.label) ? 'hidden group-data-[collapsible=icon]:block' : ''}>
          <Sidebar.Menu>
            {#each group.items as item}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  isActive={isItemActive(item)}
                >
                  {#snippet child({ props })}
                    <a
                      {...props}
                      href={item.href}
                      class="flex items-center gap-4 px-3 py-3 md:gap-3 md:py-2 group-data-[collapsible=icon]:!px-0 group-data-[collapsible=icon]:justify-center rounded-md text-base md:text-sm font-medium md:font-normal transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground w-full"
                    >
                      <item.icon class="h-5 w-5 md:h-4 md:w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span class="group-data-[collapsible=icon]:hidden">{item.name}</span>
                      {#if item.href === '/admin/members/dirigeants' && dirigeantsAlert}
                        <CircleAlert
                          class="h-3.5 w-3.5 shrink-0 text-warning group-data-[collapsible=icon]:hidden"
                          aria-label="Président ou trésorier de la saison à désigner"
                        />
                      {/if}
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/each}
  </Sidebar.Content>

  <!-- Footer with user info -->
  <Sidebar.Footer class="p-2 border-t border-border">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <DropdownMenu.Root onOpenChange={(ouvert) => ouvert && chargerComptesUsurpables()}>
          <DropdownMenu.Trigger asChild>
            {#snippet child({ props })}
              <Sidebar.MenuButton
                size="lg"
                class="w-full flex items-center justify-start text-left gap-2 cursor-pointer bg-transparent border-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                {...props}
              >
                <Avatar.Root class="h-8 w-8 rounded-lg shrink-0">
                  <Avatar.Fallback class="rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center h-full w-full">
                    {email.slice(0, 2).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar.Root>
                <div class="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden overflow-hidden">
                  <span class="truncate font-semibold text-foreground">{displayName}</span>
                  <span class="truncate text-[10px] text-muted-foreground">{email}</span>
                </div>
                <ChevronsUpDown class="ml-auto size-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
              </Sidebar.MenuButton>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              class="w-56 rounded-lg bg-card text-card-foreground border border-border p-1 shadow-md z-[100]"
              side={sidebar.isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <div class="p-2 border-b border-border">
                <p class="text-xs text-muted-foreground font-bold">{displayName}</p>
                <p class="text-sm font-semibold truncate text-foreground">{email}</p>
              </div>
              <div class="p-1 space-y-0.5">
                {#if impersonateUsers.length > 0}
                  <div class="px-2 py-1.5 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Se connecter en tant que
                  </div>
                  {#each impersonateUsers as u}
                    {#if u.email !== email}
                      <DropdownMenu.Item
                        class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground focus:outline-none"
                        onclick={() => setImpersonation(u.email)}
                      >
                        {u.name || u.email}
                      </DropdownMenu.Item>
                    {/if}
                  {/each}
                  <DropdownMenu.Separator />
                {/if}

                {#if isImpersonating}
                  <DropdownMenu.Item
                    class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md text-primary hover:bg-primary/10 cursor-pointer focus:bg-primary/10 focus:outline-none"
                    onclick={() => setImpersonation(null)}
                  >
                    Revenir à mon compte
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                {/if}

                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive focus:outline-none"
                  onclick={() => {
                    // Point de sortie Cloudflare Access, pas une page Astro : navigation
                    // dure obligatoire, `softNavigate()` tenterait un échange de DOM.
                    window.location.href = "/cdn-cgi/access/logout";
                  }}
                >
                  <LogOut class="mr-2 h-3.5 w-3.5" /> Déconnexion
                </DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
    <AppVersion class="group-data-[collapsible=icon]:hidden pb-1" />
  </Sidebar.Footer>
</Sidebar.Root>

<!-- Inset / Main panel -->
<Sidebar.Inset class="flex flex-col h-screen overflow-hidden">
  {#if isImpersonating}
    <!--
      Bandeau permanent : on n'agit pas sous une autre identité sans le savoir.

      Il porte le retrait de l'encoche parce qu'il est alors le premier élément de la
      colonne : sans lui, le bandeau se glissait sous l'îlot dynamique d'un iPhone, et
      son bouton de retour n'était plus atteignable — le doigt tombait sur le matériel.
      Le ton `warning` remonte jusqu'en haut de l'écran, ce qui le fait lire comme une
      barre système, précisément ce qu'il est.
    -->
    <div class="pt-safe shrink-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-warning/15 text-warning border-b border-warning/40 px-4 py-2 text-xs font-semibold">
      <span>Vous consultez l'application en tant que <strong>{email}</strong>.</span>
      <button
        type="button"
        class="underline underline-offset-2 cursor-pointer bg-transparent border-0 font-semibold text-inherit rounded px-2 py-1.5 -my-1 hover:bg-warning/20"
        onclick={() => setImpersonation(null)}
      >
        Revenir à {realEmail}
      </button>
    </div>
  {/if}
  <!--
    Header. Le retrait de l'encoche ne lui revient que lorsqu'il ouvre la colonne :
    l'appliquer aux deux ajouterait une seconde fois la hauteur de l'îlot.
  -->
  <header
    class="flex min-h-14 shrink-0 items-center justify-between px-6 border-b border-border bg-background pb-2 md:pb-0 md:h-14"
    class:pt-safe={!isImpersonating}
  >
    <div class="flex items-center gap-4 h-full pt-2 md:pt-0">
      <!-- Sidebar Trigger handles mobile/desktop collapse/expand -->
      <Sidebar.Trigger aria-label="Menu" class="cursor-pointer hidden md:flex" />
      
      <Separator orientation="vertical" class="h-4 hidden md:block" />
      
      <!-- Breadcrumb -->
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item class="hidden sm:inline-flex">
            <Breadcrumb.Link href="/">Admin</Breadcrumb.Link>
          </Breadcrumb.Item>
          {#each breadcrumbParts as part, i}
            <Breadcrumb.Separator class={i === 0 ? "hidden sm:block" : ""} />
            <Breadcrumb.Item>
              {#if i === breadcrumbParts.length - 1}
                <Breadcrumb.Page>{part}</Breadcrumb.Page>
              {:else}
                {#if getBreadcrumbHref(part)}
                  <Breadcrumb.Link href={getBreadcrumbHref(part)}>{part}</Breadcrumb.Link>
                {:else}
                  <span class="text-muted-foreground">{part}</span>
                {/if}
              {/if}
            </Breadcrumb.Item>
          {/each}
        </Breadcrumb.List>
      </Breadcrumb.Root>
    </div>

    <div class="flex items-center gap-4 pt-2 md:pt-0">
      <ThemeToggle />
    </div>
  </header>

  <!-- Main Content Area -->
  <div class="flex-1 overflow-y-auto pb-20 md:pb-0">
    <main class="p-4 md:p-6">
      {#if children}
        {@render children()}
      {/if}
    </main>
  </div>
</Sidebar.Inset>

<MobileBottomNav
  canManageAccounting={can(permissions, 'accounting:checks:write')}
  canManageShop={can(permissions, 'shop:orders:write')}
  canManageExpenses={can(permissions, 'expenses:reports:write')}
  onMenuClick={() => sidebar.setOpenMobile(true)}
/>
<GlobalConfirm />

<style>
  .pt-safe {
    padding-top: env(safe-area-inset-top, 0px);
  }
</style>
