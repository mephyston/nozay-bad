<script lang="ts">
  import { LogOut, User, Settings } from "lucide-svelte";

  // Reçoit l'email de l'utilisateur connecté via Astro.locals.user
  let { email = "admin@nozay-bad.fr" } = $props<{ email?: string }>();
  let isOpen = $state(false);
</script>

<div class="relative">
  <button
    onclick={() => isOpen = !isOpen}
    class="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
  >
    {email.slice(0, 2).toUpperCase()}
  </button>

  {#if isOpen}
    <div class="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card text-card-foreground shadow-md z-50">
      <div class="p-2 border-b border-border">
        <p class="text-xs text-muted-foreground">CA NBA 91</p>
        <p class="text-sm font-medium truncate">{email}</p>
      </div>
      <div class="p-1">
        <button class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground">
          <User class="mr-2 h-4 w-4" /> Profil
        </button>
        <button class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground">
          <Settings class="mr-2 h-4 w-4" /> Paramètres
        </button>
        <button class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut class="mr-2 h-4 w-4" /> Déconnexion
        </button>
      </div>
    </div>
  {/if}
</div>
