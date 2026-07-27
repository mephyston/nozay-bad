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
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    X,
    Trophy,
    User,
    LogOut
  } from "@lucide/svelte";
  import { DropdownMenu } from "bits-ui";
  import { onMount } from "svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import { Sidebar, Breadcrumb, Separator, Avatar } from "@nba/ui";

  let { children, email, breadcrumb } = $props<{
    children?: import('svelte').Snippet;
    email: string;
    breadcrumb: string;
  }>();

  const sidebar = Sidebar.useSidebar();

  const navGroups = [
    {
      label: "",
      items: [
        { name: "Vue d'ensemble", icon: LayoutDashboard, href: "/" },
        { name: "Note de frais", icon: Coins, href: "/admin/expenses" }
      ]
    },
    {
      label: "Adhérents",
      items: [
        { name: "Liste des adhérents", icon: Users, href: "/admin/members" },
        { name: "Import Poona", icon: UploadCloud, href: "/admin/members/import" }
      ]
    },
    {
      label: "Comptabilité",
      items: [
        { name: "Rapports financiers", icon: BarChart3, href: "/admin/accounting/reports" },
        { name: "Grand Livre", icon: BookOpen, href: "/admin/accounting" },
        { name: "Factures", icon: FileCheck, href: "/admin/accounting/invoices" },
        { name: "Rapprochement bancaire", icon: Scale, href: "/admin/accounting/import" },
        { name: "Remises de chèques", icon: Landmark, href: "/admin/accounting/cheques" },
        { name: "Caisse", icon: Wallet, href: "/admin/accounting/cash-box" },
        { name: "Soldes initiaux", icon: Play, href: "/admin/accounting/config" }
      ]
    },
    {
      label: "Boutique",
      items: [
        { name: "Produits", icon: Package, href: "/admin/shop/products" },
        { name: "Commandes", icon: ShoppingCart, href: "/admin/shop/orders" }
      ]
    },
    {
      label: "",
      items: [
        { name: "Réglages", icon: Settings, href: "/admin/settings" }
      ]
    }
  ];

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
      return primary === "adhérents" && (!sub || sub === "liste");
    }
    if (item.href === "/admin/members/import") {
      return primary === "adhérents" && sub === "import";
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

    // Réglages
    if (item.href.includes("settings")) {
      return primary === "réglages" || primary === "settings";
    }

    return false;
  }

  // Parse breadcrumbs
  const breadcrumbParts = $derived(breadcrumb.split(" / "));
  const primaryGroup = $derived(breadcrumbParts[0]?.trim());
  const subGroup = $derived(breadcrumbParts[1]?.trim());

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
      default:
        return undefined;
    }
  }
</script>

<Sidebar.Root collapsible="icon" variant="inset">
  <!-- Header -->
  <Sidebar.Header class="p-2 border-0 bg-transparent">
    <div class="flex items-center w-full justify-between gap-1">
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
                <!-- Badminton Shuttlecock Icon (aligned h-4 w-4) -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-primary">
                  <path d="M9 16c0-1.5 1-2 3-2s3 .5 3 2v2a3 3 0 0 1-6 0v-2z" />
                  <path d="M12 14V3" />
                  <path d="m8 14 2-10" />
                  <path d="m16 14-2-10" />
                  <path d="m6 14 3-10" />
                  <path d="m18 14-3-10" />
                  <path d="M8 8h8" />
                  <path d="M6 11h12" />
                </svg>
                <span class="group-data-[collapsible=icon]:hidden font-semibold text-sm text-foreground truncate">Nozay Bad Association</span>
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
    {#each navGroups as group}
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
                      class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-normal transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground w-full"
                    >
                      <item.icon class="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
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
                  <span class="truncate font-semibold text-foreground">Trésorier</span>
                  <span class="truncate text-[10px] text-muted-foreground">{email}</span>
                </div>
                <ChevronsUpDown class="ml-auto size-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
              </Sidebar.MenuButton>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              class="w-56 rounded-lg bg-card text-card-foreground border border-border p-1 shadow-md z-50"
              side="right"
              align="end"
              sideOffset={4}
            >
              <div class="p-2 border-b border-border">
                <p class="text-xs text-muted-foreground font-bold">CA NBA 91</p>
                <p class="text-sm font-semibold truncate text-foreground">{email}</p>
              </div>
              <div class="p-1 space-y-0.5">
                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground focus:outline-none"
                  onclick={() => window.location.href = "/admin/settings"}
                >
                  <User class="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Mon profil
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground focus:outline-none"
                  onclick={() => window.location.href = "/admin/settings"}
                >
                  <Settings class="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Paramètres
                </DropdownMenu.Item>
                <DropdownMenu.Separator class="my-1 border-t border-border" />
                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive focus:outline-none"
                  onclick={() => window.location.href = "/"}
                >
                  <LogOut class="mr-2 h-3.5 w-3.5" /> Déconnexion
                </DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>

<!-- Inset / Main panel -->
<Sidebar.Inset class="flex flex-col h-screen overflow-hidden">
  <!-- Header -->
  <header class="flex h-14 shrink-0 items-center justify-between px-6 border-b border-border bg-background">
    <div class="flex items-center gap-4">
      <!-- Sidebar Trigger handles mobile/desktop collapse/expand -->
      <Sidebar.Trigger aria-label="Menu" class="cursor-pointer" />
      
      <Separator orientation="vertical" class="h-4" />
      
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

    <div class="flex items-center gap-4">
      <ThemeToggle />
    </div>
  </header>

  <!-- Main Content Area -->
  <div class="flex-1 overflow-y-auto">
    <main class="p-6">
      {#if children}
        {@render children()}
      {/if}
    </main>
  </div>
</Sidebar.Inset>
