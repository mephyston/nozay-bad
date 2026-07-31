<script lang="ts">
  import { Input, Button, Label, Badge } from '@nba/ui';
  import { Plus, Trash2 } from 'lucide-svelte';
  
  let { users = [] } = $props<{ users: any[] }>();

  let newEmail = $state('');
  let newName = $state('');
  let newPermissions = $state<string>('');

  async function createUser() {
    if (!newEmail) return;
    const perms = newPermissions.split(',').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/admin/iam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_user', email: newEmail, name: newName, permissions: perms })
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert(await res.text());
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Sûr de vouloir supprimer ?')) return;
    const res = await fetch('/admin/iam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_user', id })
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert(await res.text());
    }
  }
</script>

<div class="space-y-8">
  <div class="bg-card text-card-foreground shadow-sm rounded-xl p-6 border border-border">
    <h2 class="text-xl font-semibold mb-4">Administrateurs</h2>
    
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
          <tr>
            <th class="px-4 py-3">Nom</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Permissions</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          {#each users as user}
            <tr class="hover:bg-muted/30 transition-colors">
              <td class="px-4 py-3 font-medium">{user.name}</td>
              <td class="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  {#each user.permissions as perm}
                    <Badge variant={perm === '*' ? 'destructive' : 'secondary'} class="text-xs">{perm}</Badge>
                  {/each}
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive hover:bg-destructive/10" onclick={() => deleteUser(user.id)}>
                  <Trash2 class="w-4 h-4" />
                </Button>
              </td>
            </tr>
          {/each}
          
          {#if users.length === 0}
            <tr>
              <td colspan="4" class="px-4 py-8 text-center text-muted-foreground italic">
                Aucun utilisateur
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <div class="bg-card text-card-foreground shadow-sm rounded-xl p-6 border border-border">
    <h3 class="text-lg font-medium mb-4">Ajouter un accès</h3>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <div class="space-y-2">
        <Label for="name">Nom</Label>
        <Input id="name" bind:value={newName} placeholder="Jean Dupont" />
      </div>
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input id="email" type="email" bind:value={newEmail} placeholder="jean@example.com" />
      </div>
      <div class="space-y-2">
        <Label for="perms">Permissions (séparées par virgule)</Label>
        <Input id="perms" bind:value={newPermissions} placeholder="accounting:*, shop:read" />
      </div>
      <Button onclick={createUser} class="w-full">
        <Plus class="w-4 h-4 mr-2" />
        Ajouter
      </Button>
    </div>
    <div class="mt-4 text-xs text-muted-foreground">
      Astuce: <span class="font-mono bg-muted px-1 py-0.5 rounded">*</span> donne tous les droits. <span class="font-mono bg-muted px-1 py-0.5 rounded">accounting:*</span> donne tous les droits à la compta.
    </div>
  </div>
</div>
