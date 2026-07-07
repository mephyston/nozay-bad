<script lang="ts">
  import { LayoutDashboard, Receipt, Users, ShoppingBag, Menu, X } from "lucide-svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import UserNav from "./UserNav.svelte";

  let { children, email = "admin@nozay-bad.fr" } = $props<{
    children?: import('svelte').Snippet;
    email?: string;
  }>();

  let sidebarOpen = $state(true);

  const navItems = [
    { name: "Vue d'ensemble", icon: LayoutDashboard, href: "#" },
    { name: "Trésorerie", icon: Receipt, href: "#" },
    { name: "Adhésions & Poona", icon: Users, href: "#" },
    { name: "Boutique & Volants", icon: ShoppingBag, href: "#" }
  ];
</script>

<div class="flex h-screen bg-background text-foreground overflow-hidden">
  <!-- Sidebar -->
  <aside class="hidden md:flex flex-col border-r border-border bg-card w-64 transition-all duration-300">
    <div class="flex h-14 items-center justify-between px-4 border-b border-border">
      <span class="font-bold text-lg tracking-wider text-primary">NBA 91 - CA</span>
    </div>
    <nav class="flex-1 p-4 space-y-1">
      {#each navItems as item}
        <a
          href={item.href}
          class="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <item.icon class="mr-3 h-4 w-4" />
          {item.name}
        </a>
      {/each}
    </nav>
  </aside>

  <!-- Main Content -->
  <div class="flex-1 flex flex-col overflow-y-auto">
    <!-- Header -->
    <header class="flex h-14 items-center justify-between px-6 border-b border-border bg-card">
      <div class="flex items-center gap-4">
        <button class="md:hidden p-1 rounded hover:bg-accent" aria-label="Menu">
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
