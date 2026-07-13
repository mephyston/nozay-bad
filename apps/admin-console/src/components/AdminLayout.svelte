<script lang="ts">
  import {
    LayoutDashboard,
    Receipt,
    Users,
    ShoppingBag,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    Coins,
    Wallet
  } from "lucide-svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import UserNav from "./UserNav.svelte";

  let { children, email = "admin@nozay-bad.fr" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
  }>();

  let sidebarOpen = $state(false);

  // Keep track of which submenus are expanded. Default expand Adhérents and Boutique.
  let expandedMenus = $state<Record<string, boolean>>({
    "Adhérents": true,
    "Boutique": true
  });

  function toggleMenu(name: string) {
    expandedMenus[name] = !expandedMenus[name];
  }

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
    { name: "Comptabilité", icon: Receipt, href: "/admin/compta" },
    { name: "Caisse", icon: Wallet, href: "/admin/cash-box" },
    {
      name: "Boutique",
      icon: ShoppingBag,
      subItems: [
        { name: "Volants", href: "/admin/shop/shuttlecocks" },
        { name: "Cordage", href: "/admin/shop/strings" }
      ]
    },
    { name: "Note de frais", icon: Coins, href: "/admin/expenses" }
  ];
</script>

<div class="flex h-screen bg-background text-foreground overflow-hidden">
  <!-- Mobile Sidebar / Drawer -->
  {#if sidebarOpen}
    <button
      type="button"
      class="fixed inset-0 z-40 bg-black/50 md:hidden border-0 cursor-default"
      onclick={() => sidebarOpen = false}
      aria-label="Close sidebar"
    ></button>
    <aside class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-all duration-300 md:hidden">
      <div class="flex h-14 items-center justify-between px-4 border-b border-border">
        <span class="font-bold text-lg tracking-wider text-primary">NBA 91 - CA</span>
        <button class="p-1 rounded hover:bg-accent" aria-label="Close menu" onclick={() => sidebarOpen = false}>
          <X class="h-5 w-5" />
        </button>
      </div>
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        {#each navItems as item}
          {#if item.subItems}
            <div class="space-y-1">
              <button
                type="button"
                onclick={() => toggleMenu(item.name)}
                class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span class="flex items-center">
                  <item.icon class="mr-3 h-4 w-4 shrink-0" />
                  {item.name}
                </span>
                {#if expandedMenus[item.name]}
                  <ChevronDown class="h-3.5 w-3.5" />
                {:else}
                  <ChevronRight class="h-3.5 w-3.5" />
                {/if}
              </button>
              {#if expandedMenus[item.name]}
                <div class="pl-7 space-y-1">
                  {#each item.subItems as sub}
                    <a
                      href={sub.href}
                      onclick={() => sidebarOpen = false}
                      class="block px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 transition-colors"
                    >
                      {sub.name}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <a
              href={item.href}
              onclick={() => sidebarOpen = false}
              class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <item.icon class="mr-3 h-4 w-4 shrink-0" />
              {item.name}
            </a>
          {/if}
        {/each}
      </nav>
    </aside>
  {/if}

  <!-- Sidebar -->
  <aside class="hidden md:flex flex-col border-r border-border bg-card w-64 transition-all duration-300">
    <div class="flex h-14 items-center justify-between px-4 border-b border-border">
      <span class="font-bold text-lg tracking-wider text-primary">NBA 91 - CA</span>
    </div>
    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
      {#each navItems as item}
        {#if item.subItems}
          <div class="space-y-1">
            <button
              type="button"
              onclick={() => toggleMenu(item.name)}
              class="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span class="flex items-center">
                <item.icon class="mr-3 h-4 w-4 shrink-0" />
                {item.name}
              </span>
              {#if expandedMenus[item.name]}
                <ChevronDown class="h-3.5 w-3.5" />
              {:else}
                <ChevronRight class="h-3.5 w-3.5" />
              {/if}
            </button>
            {#if expandedMenus[item.name]}
              <div class="pl-7 space-y-1">
                {#each item.subItems as sub}
                  <a
                    href={sub.href}
                    class="block px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 transition-colors"
                  >
                    {sub.name}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <a
            href={item.href}
            class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <item.icon class="mr-3 h-4 w-4 shrink-0" />
            {item.name}
          </a>
        {/if}
      {/each}
    </nav>
  </aside>

  <!-- Main Content -->
  <div class="flex-1 flex flex-col overflow-y-auto">
    <!-- Header -->
    <header class="flex h-14 items-center justify-between px-6 border-b border-border bg-card">
      <div class="flex items-center gap-4">
        <button class="md:hidden p-1 rounded hover:bg-accent" aria-label="Menu" onclick={() => sidebarOpen = true}>
          <Menu class="h-5 w-5" />
        </button>
        <span class="text-sm font-medium text-muted-foreground">Admin / Tableau de Bord</span>
      </div>
      <div class="flex items-center gap-4">
        <ThemeToggle />
        <UserNav {email} />
      </div>
    </header>

    <!-- Page Content -->
    <main class="p-6">
      {#if children}
        {@render children()}
      {/if}
    </main>
  </div>
</div>
