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
    HelpCircle
  } from "@lucide/svelte";
  import { DropdownMenu } from "bits-ui";
  import { onMount } from "svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { Sidebar, Breadcrumb, Separator, Avatar, GlobalConfirm, AppVersion, MobileBottomNav, PwaInstallBanner } from "@nba/ui";

  let { children, email, name, permissions = [], breadcrumb } = $props<{
    children?: import('svelte').Snippet;
    email: string;
    name?: string;
    permissions?: string[];
    breadcrumb: string;
  }>();

  import { hasPermission } from '@nba/iam-ui';

  const sidebar = Sidebar.useSidebar();

  const navGroups = $derived([
    {
      label: "",
      items: [
        { name: "Tableau de bord", icon: LayoutDashboard, href: "/" },
        { name: "Assistant IA", icon: Sparkles, href: "/admin/ai" }
      ]
    },
    {
      label: "Adhérents",
      items: [
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'members:*') || hasPermission(permissions, 'members:read') ? [{ name: "Liste des adhérents", icon: Users, href: "/admin/members" }] : [])
      ]
    },
    {
      label: "Comptabilité",
      items: [
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'accounting:*') || hasPermission(permissions, 'accounting:reports') ? [{ name: "Rapports financiers", icon: BarChart3, href: "/admin/accounting/reports" }] : []),
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'accounting:*') ? [{ name: "Grand Livre", icon: BookOpen, href: "/admin/accounting" }] : []),
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'accounting:*') || hasPermission(permissions, 'accounting:invoices') ? [{ name: "Factures", icon: FileCheck, href: "/admin/accounting/invoices" }] : []),
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'accounting:*') ? [
          { name: "Rapprochement bancaire", icon: Scale, href: "/admin/accounting/import" },
          { name: "Remises de chèques", icon: Landmark, href: "/admin/accounting/cheques" },
          { name: "Caisse", icon: Wallet, href: "/admin/accounting/cash-box" }
        ] : []),
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'expenses:*') ? [{ name: "Notes de frais", icon: Coins, href: "/admin/expenses" }] : [])
      ]
    },
    {
      label: "Boutique",
      items: [
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'shop:*') || hasPermission(permissions, 'shop:products') ? [{ name: "Produits", icon: Package, href: "/admin/shop/products" }] : []),
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'shop:*') || hasPermission(permissions, 'shop:orders') ? [{ name: "Commandes", icon: ShoppingCart, href: "/admin/shop/orders" }] : [])
      ]
    },
    {
      label: "Réglages",
      items: [
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'settings:*') ? [{ name: "Configuration", icon: Settings, href: "/admin/settings" }] : []),
        ...(hasPermission(permissions, '*') || hasPermission(permissions, 'iam:*') ? [{ name: "Accès & Permissions", icon: User, href: "/admin/iam" }] : [])
      ]
    },
    {
      label: "Assistance",
      items: [
        { name: "Centre d'aide", icon: HelpCircle, href: "/admin/help" }
      ]
    }
  ]);

  // Remove empty groups
  const filteredNavGroups = $derived(navGroups.filter(g => g.items.length > 0));

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

    // Réglages & IAM
    if (item.href.includes("settings")) {
      return primary === "réglages" || primary === "settings" || primary === "configuration";
    }
    if (item.href === "/admin/iam") {
      return primary === "accès et permissions" || primary === "accès & permissions";
    }
    
    // Aide
    if (item.href === "/admin/help") {
      return primary === "aide" || primary === "assistance" || primary === "centre d'aide";
    }

    return false;
  }

  let impersonateUsers = $state<any[]>([]);

  onMount(async () => {
    // Check if user is super-admin or can manage IAM
    if (hasPermission(permissions, '*') || hasPermission(permissions, 'iam:*')) {
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
          <Sidebar.MenuButton
            size="default"
            class="w-full bg-transparent border-0 flex items-center justify-start"
          >
            {#snippet child({ props })}
              <a
                {...props}
                href="/"
                class="flex items-center gap-3 px-3 py-2 w-full h-full font-semibold text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
              >
                <!-- Logo NBA -->
                <img src="/images/splash-light.jpeg" alt="Logo" class="h-6 w-6 shrink-0 rounded-md object-cover block dark:hidden" />
                <img src="/images/splash-dark.jpeg" alt="Logo" class="h-6 w-6 shrink-0 rounded-md object-cover hidden dark:block" />
                <span class="group-data-[collapsible=icon]:hidden font-semibold text-sm text-foreground truncate ml-1">Nozay Bad</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
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
                      class="flex items-center gap-4 px-3 py-3 md:gap-3 md:py-2 rounded-md text-base md:text-sm font-medium md:font-normal transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground w-full"
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
                        onclick={() => {
                          document.cookie = `impersonate_email=${encodeURIComponent(u.email)}; path=/`;
                          window.location.reload();
                        }}
                      >
                        {u.name || u.email}
                      </DropdownMenu.Item>
                    {/if}
                  {/each}
                  <DropdownMenu.Separator />
                {/if}

                {#if typeof document !== 'undefined' && document.cookie.includes('impersonate_email')}
                  <DropdownMenu.Item
                    class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md text-primary hover:bg-primary/10 cursor-pointer focus:bg-primary/10 focus:outline-none"
                    onclick={() => {
                      document.cookie = `impersonate_email=; path=/; max-age=0`;
                      window.location.reload();
                    }}
                  >
                    Revenir à mon compte
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                {/if}

                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive focus:outline-none"
                  onclick={() => window.location.href = "/cdn-cgi/access/logout"}
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

<MobileBottomNav permissions={permissions} onMenuClick={() => sidebar.setOpenMobile(true)} />
<GlobalConfirm />

<style>
  .pt-safe {
    padding-top: env(safe-area-inset-top, 0px);
  }
</style>
