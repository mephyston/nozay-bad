<script lang="ts">
  import { LogOut, User, Settings } from "@lucide/svelte";
  import { DropdownMenu } from "bits-ui";

  // Reçoit l'email de l'utilisateur connecté via Astro.locals.user
  let { email = "" } = $props<{ email?: string }>();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 cursor-pointer"
  >
    {email.slice(0, 2).toUpperCase()}
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      align="end"
      sideOffset={8}
      class="w-56 rounded-md border border-border bg-card text-card-foreground shadow-md z-50"
    >
      <div class="p-2 border-b border-border">
        <p class="text-xs text-muted-foreground">CA NBA 91</p>
        <p class="text-sm font-medium truncate">{email}</p>
      </div>
      <div class="p-1">
        <DropdownMenu.Item
          class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground focus:outline-none"
        >
          <User class="mr-2 h-4 w-4" /> Profil
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer focus:bg-accent focus:text-accent-foreground focus:outline-none"
        >
          <Settings class="mr-2 h-4 w-4" /> Paramètres
        </DropdownMenu.Item>
        <DropdownMenu.Separator class="my-1 border-t border-border" />
        <DropdownMenu.Item
          class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive focus:outline-none"
        >
          <LogOut class="mr-2 h-4 w-4" /> Déconnexion
        </DropdownMenu.Item>
      </div>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
