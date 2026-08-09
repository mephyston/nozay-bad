<script lang="ts">
  import {
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
    Sparkles,
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    X,
    Trophy,
    User,
    LogOut,
    HelpCircle,
    Bell,
    Megaphone,
    Image,
    FileText,
    Newspaper,
    CalendarClock,
    CalendarDays
  } from "@lucide/svelte";
  import { DropdownMenu } from "bits-ui";
  import { onMount } from "svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { Sidebar, Breadcrumb, Separator, Avatar, GlobalConfirm, AppVersion, MobileBottomNav, PwaInstallBanner } from "@nba/ui";

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
    LayoutDashboard, Sparkles, Users, BarChart3, BookOpen, FileCheck, Scale,
    Landmark, Wallet, Coins, Package, ShoppingCart, Bell, Megaphone, Image, FileText, Newspaper, CalendarClock, CalendarDays, Settings, User, HelpCircle
  };

  // Le menu dérive de la même table que le contrôle d'accès des pages : une entrée
  // visible mène donc toujours à une page ouverte.
  const filteredNavGroups = $derived(
    NAV_GROUPS
      .map(g => ({
        label: g.label,
        items: g.items
          .filter(i => i.permission === null || can(permissions, i.permission))
          .map(i => ({ name: i.name, href: i.href, icon: ICONS[i.icon] }))
      }))
      .filter(g => g.items.length > 0)
  );

  function isItemActive(item: { name: string, href: string }): boolean {
    const parts = breadcrumb.split(" / ").map(p => p.trim().toLowerCase());
    const primary = parts[0];
    const sub = parts[1];

    if (item.href === "/") {
      return breadcrumb === "Tableau de Bord" || primary === "tableau de bord" || primary === "vue d'ensemble";
    }

    if (item.href === "/admin/ai") {
      return primary === "assistant ia" || primary === "ia";
    }

    if (item.href === "/admin/expenses") {
      return primary === "note de frais" || primary === "notes de frais";
    }

    // Adhérents
    if (item.href === "/admin/members") {
      return primary === "adhérents";
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
    if (item.href === "/admin/accounting/import") {
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

    // Communication
    if (item.href === "/admin/announcements") {
      return primary === "annonces";
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

  // Le cookie d'usurpation est HttpOnly : il est posé et retiré par le serveur, et
  // le navigateur ne peut plus le lire. L'état vient donc de `realEmail`.
  const isImpersonating = $derived(Boolean(realEmail) && realEmail !== email);

  async function setImpersonation(target: string | null) {
    const res = await fetch('/admin/api/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: target })
    });
    if (res.ok) window.location.reload();
  }

  onMount(async () => {
    if (can(permissions, 'iam:sessions:impersonate')) {
      try {
        const res = await fetch('/admin/api/users');
        if (res.ok) {
          const json = await res.json();
          impersonateUsers = json.data || [];
        }
      } catch (err) {}
    }
  });

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
  <Sidebar.Content class="p-2 space-y-4">
    {#each filteredNavGroups as group}
      <Sidebar.Group class="p-0">
        {#if group.label}
          <Sidebar.GroupLabel class="px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
            {group.label}
          </Sidebar.GroupLabel>
        {/if}
        <Sidebar.GroupContent>
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
        <DropdownMenu.Root>
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
    <!-- Bandeau permanent : on n'agit pas sous une autre identité sans le savoir. -->
    <div class="shrink-0 flex flex-wrap items-center justify-center gap-2 bg-amber-500/15 text-amber-900 dark:text-amber-200 border-b border-amber-500/40 px-4 py-1.5 text-xs font-semibold">
      <span>Vous consultez l'application en tant que <strong>{email}</strong>.</span>
      <button
        type="button"
        class="underline underline-offset-2 cursor-pointer bg-transparent border-0 font-semibold text-inherit"
        onclick={() => setImpersonation(null)}
      >
        Revenir à {realEmail}
      </button>
    </div>
  {/if}
  <!-- Header -->
  <header class="flex min-h-14 shrink-0 items-center justify-between px-6 border-b border-border bg-background pt-safe pb-2 md:pb-0 md:h-14">
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
