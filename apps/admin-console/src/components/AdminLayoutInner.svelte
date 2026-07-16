<script lang="ts">
  import {
    LayoutDashboard,
    Receipt,
    Users,
    ShoppingBag,
    Coins,
    Settings,
    ChevronDown,
    ChevronUp,
    X,
    ChevronsUpDown,
    Trophy,
    User,
    LogOut
  } from "lucide-svelte";
  import { DropdownMenu } from "bits-ui";
  import ThemeToggle from "./ThemeToggle.svelte";
  import UserNav from "./UserNav.svelte";
  import { Sidebar, Breadcrumb, Separator, Avatar } from "@metacult/shared-ui";

  let { children, email, breadcrumb } = $props<{
    children?: import('svelte').Snippet;
    email: string;
    breadcrumb: string;
  }>();

  const sidebar = Sidebar.useSidebar();

  const navItems = [
    { name: "Vue d'ensemble", icon: LayoutDashboard, href: "/admin" },
    {
      name: "Adhérents",
      icon: Users,
      subItems: [
        { name: "Liste", href: "/admin/members" },
        { name: "Import", href: "/admin/members/import" }
      ]
    },
    {
      name: "Comptabilité",
      icon: Receipt,
      subItems: [
        { name: "Rapports", href: "/admin/accounting/reports" },
        { name: "Grand Livre", href: "/admin/accounting" },
        { name: "Factures", href: "/admin/accounting/invoices" },
        { name: "Rapprochement bancaire", href: "/admin/accounting/import" },
        { name: "Remises de chèques", href: "/admin/accounting/cheques" },
        { name: "Caisse", href: "/admin/accounting/cash-box" },
        { name: "Soldes initiaux", href: "/admin/accounting/config" }
      ]
    },
    {
      name: "Boutique",
      icon: ShoppingBag,
      subItems: [
        { name: "Produits", href: "/admin/shop/products" },
        { name: "Commandes", href: "/admin/shop/orders" }
      ]
    },
    { name: "Note de frais", icon: Coins, href: "/admin/expenses" },
    {
      name: "Réglages",
      icon: Settings,
      subItems: [
        { name: "Saisons", href: "/admin/accounting/settings?view=seasons" },
        { name: "Catégories", href: "/admin/accounting/settings?view=compta" },
        { name: "Classes de comptes", href: "/admin/accounting/settings?view=classes" }
      ]
    }
  ];

  // Track expanded submenus
  let expandedMenus = $state<Record<string, boolean>>({});

  function toggleMenu(name: string) {
    expandedMenus[name] = !expandedMenus[name];
  }

  // Parse breadcrumbs
  const breadcrumbParts = $derived(breadcrumb.split(" / "));
  const primaryGroup = $derived(breadcrumbParts[0]?.trim());
  const subGroup = $derived(breadcrumbParts[1]?.trim());

  // Auto-expand menu group from breadcrumb on initialization
  $effect(() => {
    if (primaryGroup) {
      expandedMenus[primaryGroup] = true;
      if (primaryGroup === "Notes de frais") {
        expandedMenus["Note de frais"] = true;
      }
    }
  });

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

<Sidebar.Root collapsible="icon">
  <!-- Header -->
  <Sidebar.Header class="h-14 flex flex-row items-center px-2 border-b border-border justify-between group-data-[collapsible=icon]:justify-center">
    <div class="flex items-center w-full group-data-[collapsible=icon]:justify-center justify-between">
      <div class="flex items-center gap-2 group-data-[collapsible=icon]:justify-center overflow-hidden">
        <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <Trophy class="size-4" />
        </div>
        <div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
          <span class="truncate font-bold text-primary tracking-wide text-xs">Nozay Badminton Association</span>
          <span class="truncate text-[10px] text-muted-foreground font-semibold">Conseil d'Administration</span>
        </div>
      </div>
      {#if sidebar.isMobile}
        <button
          type="button"
          class="p-1 rounded hover:bg-accent border-0 bg-transparent cursor-pointer flex items-center justify-center"
          aria-label="Close menu"
          onclick={(e) => { e.stopPropagation(); sidebar.setOpenMobile(false); }}
        >
          <X class="h-5 w-5" />
        </button>
      {/if}
    </div>
  </Sidebar.Header>

  <!-- Navigation items -->
  <Sidebar.Content class="p-2">
    <Sidebar.Group>
      <Sidebar.GroupLabel class="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-data-[collapsible=icon]:hidden">
        Navigation
      </Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each navItems as item}
            <Sidebar.MenuItem>
              {#if item.subItems}
                <div class="relative group flex flex-col w-full">
                  <!-- Collapsed Icon Trigger -->
                  <div class="hidden group-data-[collapsible=icon]:block">
                    <Sidebar.MenuButton
                      tooltipContent={item.name}
                      isActive={item.name === primaryGroup}
                      class="w-full flex justify-center cursor-pointer border-0 bg-transparent"
                    >
                      <item.icon />
                    </Sidebar.MenuButton>
                    <!-- Submenu popup on hover -->
                    <div class="hidden group-hover:block absolute left-full top-0 ml-2 w-48 bg-card border border-border shadow-lg rounded-lg p-1.5 z-50">
                      <div class="px-2.5 py-1 text-xs font-bold text-primary border-b border-border/60 pb-1 mb-1">
                        {item.name}
                      </div>
                      {#each item.subItems as sub}
                        <a
                          href={sub.href}
                          onclick={() => { if (sidebar.isMobile) sidebar.setOpenMobile(false); }}
                          class="{sub.name === subGroup && item.name === primaryGroup ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50'} block px-2.5 py-1.5 text-xs rounded-md transition-colors"
                        >
                          {sub.name}
                        </a>
                      {/each}
                    </div>
                  </div>

                  <!-- Expanded Menu item -->
                  <div class="group-data-[collapsible=icon]:hidden">
                    <button
                      type="button"
                      onclick={() => toggleMenu(item.name)}
                      class="{item.name === primaryGroup ? 'bg-sidebar-accent/60 text-foreground font-semibold' : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'} w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors border-0 bg-transparent text-left cursor-pointer"
                    >
                      <span class="flex items-center">
                        <item.icon class="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                        {item.name}
                      </span>
                      {#if expandedMenus[item.name]}
                        <ChevronUp class="h-3.5 w-3.5 text-muted-foreground" />
                      {:else}
                        <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
                      {/if}
                    </button>
                    {#if expandedMenus[item.name]}
                      <div class="pl-7 pr-1 py-1 space-y-1">
                        {#each item.subItems as sub}
                          <a
                            href={sub.href}
                            onclick={() => { if (sidebar.isMobile) sidebar.setOpenMobile(false); }}
                            class="{sub.name === subGroup && item.name === primaryGroup ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' : 'font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50'} block px-3 py-1.5 text-xs rounded-md transition-colors"
                          >
                            {sub.name}
                          </a>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {:else}
                <!-- Single links -->
                <Sidebar.MenuButton
                  tooltipContent={item.name}
                  isActive={item.name === primaryGroup || (item.name === "Vue d'ensemble" && primaryGroup === "Tableau de Bord") || (item.name === "Note de frais" && (primaryGroup === "Note de frais" || primaryGroup === "Notes de frais"))}
                >
                  {#snippet child(props)}
                    <a
                      href={item.href}
                      onclick={() => { if (sidebar.isMobile) sidebar.setOpenMobile(false); }}
                      {...props}
                    >
                      <item.icon />
                      <span class="group-data-[collapsible=icon]:hidden">{item.name}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              {/if}
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <!-- Footer with user info -->
  <Sidebar.Footer class="p-2 border-t border-border">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger class="w-full">
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
                >
                  <User class="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Profil
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground focus:outline-none"
                >
                  <Settings class="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Paramètres
                </DropdownMenu.Item>
                <DropdownMenu.Separator class="my-1 border-t border-border" />
                <DropdownMenu.Item
                  class="flex w-full items-center px-2 py-1.5 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive focus:outline-none"
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
  <header class="flex h-14 shrink-0 items-center justify-between px-6 border-b border-border bg-card">
    <div class="flex items-center gap-4">
      <!-- Sidebar Trigger handles mobile/desktop collapse/expand -->
      <Sidebar.Trigger aria-label="Menu" class="cursor-pointer" />
      
      <Separator orientation="vertical" class="h-4" />
      
      <!-- Breadcrumb -->
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/admin">Admin</Breadcrumb.Link>
          </Breadcrumb.Item>
          {#each breadcrumbParts as part, i}
            <Breadcrumb.Separator />
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
      <UserNav {email} />
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
