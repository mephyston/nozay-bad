<script lang="ts">
  import { Input, Button, Badge, Table, Card, EmptyState, uiConfirm, toast, Sheet, FormField, DataTable, DataTableToolbar } from '@nba/ui';
  import { Plus, Trash2, Shield } from '@lucide/svelte';
  
  let { users = [] } = $props<{ users: any[] }>();

  let newEmail = $state('');
  let newName = $state('');
  let newPermissions = $state<string>('');
  let isSheetOpen = $state(false);
  let searchTerm = $state('');

  async function createUser() {
    if (!newEmail) return;
    const perms = newPermissions.split(',').map(s => s.trim()).filter(Boolean);
    const res = await fetch('/admin/iam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_user', email: newEmail, name: newName, permissions: perms })
    });
    if (res.ok) {
      toast.success('Utilisateur créé avec succès');
      isSheetOpen = false;
      window.location.reload();
    } else {
      toast.error(await res.text());
    }
  }

  async function deleteUser(id: number) {
    if (!await uiConfirm('Sûr de vouloir supprimer cet accès ?')) return;
    const res = await fetch('/admin/iam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_user', id })
    });
    if (res.ok) {
      toast.success('Utilisateur supprimé');
      window.location.reload();
    } else {
      toast.error(await res.text());
    }
  }
</script>

<div class="space-y-6">
  <DataTable
    data={users}
    emptyTitle="Aucun utilisateur"
    emptyDescription="Ajoutez des accès pour permettre à d'autres membres d'administrer l'association."
  >
    {#snippet toolbar()}
      <DataTableToolbar
        bind:searchValue={searchTerm}
        searchPlaceholder="Rechercher un utilisateur..."
        hasFilters={false}
      >
        {#snippet actions()}
          <Sheet.Root bind:open={isSheetOpen}>
            <Sheet.Trigger asChild>
              {#snippet child({ props })}
                <Button {...props} class="font-bold flex items-center justify-center gap-1.5 shrink-0 h-9">
                  <Plus class="w-4 h-4" />
                  <span>Ajouter</span>
                </Button>
              {/snippet}
            </Sheet.Trigger>
            <Sheet.Content side="right" class="w-full sm:max-w-md">
              <Sheet.Header>
                <Sheet.Title>Ajouter un accès</Sheet.Title>
                <Sheet.Description>Donnez l'accès à un nouveau collaborateur.</Sheet.Description>
              </Sheet.Header>
              <div class="space-y-4 py-6">
                <FormField id="name" label="Nom">
                  <Input id="name" bind:value={newName} placeholder="Jean Dupont" />
                </FormField>
                <FormField id="email" label="Email">
                  <Input id="email" type="email" bind:value={newEmail} placeholder="jean@example.com" />
                </FormField>
                <FormField id="perms" label="Permissions (séparées par virgule)" hint="Astuce: * donne tous les droits. accounting:* donne tous les droits à la compta.">
                  <Input id="perms" bind:value={newPermissions} placeholder="accounting:*, shop:read" />
                </FormField>
              </div>
              <Sheet.Footer>
                <Button onclick={createUser} class="w-full">Enregistrer</Button>
              </Sheet.Footer>
            </Sheet.Content>
          </Sheet.Root>
        {/snippet}
      </DataTableToolbar>
    {/snippet}

    {#snippet mobileView()}
      {#if users.length === 0}
        <div class="p-6 text-center text-muted-foreground text-sm">
          <EmptyState
            icon={Shield}
            title="Aucun utilisateur"
            description="Ajoutez des accès pour permettre à d'autres membres d'administrer l'association."
          />
        </div>
      {:else}
        {#each users as user (user.id)}
          <Card.Root>
            <Card.Content class="p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="font-bold text-sm text-foreground">{user.name}</h4>
                  <div class="text-muted-foreground text-xs">{user.email}</div>
                  <div class="mt-2 flex flex-wrap gap-1">
                    {#each user.permissions as perm}
                      <Badge variant={perm === '*' ? 'destructive' : 'secondary'} size="xs">{perm}</Badge>
                    {/each}
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => deleteUser(user.id)}
                  class="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>Supprimer</span>
                </Button>
              </div>
            </Card.Content>
          </Card.Root>
        {/each}
      {/if}
    {/snippet}

    {#snippet header()}
      <Table.Head>Nom</Table.Head>
      <Table.Head>Email</Table.Head>
      <Table.Head>Permissions</Table.Head>
      <Table.Head class="text-right">Actions</Table.Head>
    {/snippet}

    {#snippet row(user)}
      <Table.Row>
        <Table.Cell class="font-medium">{user.name}</Table.Cell>
        <Table.Cell class="text-muted-foreground">{user.email}</Table.Cell>
        <Table.Cell>
          <div class="flex flex-wrap gap-1">
            {#each user.permissions as perm}
              <Badge variant={perm === '*' ? 'destructive' : 'secondary'}>{perm}</Badge>
            {/each}
          </div>
        </Table.Cell>
        <Table.Cell class="text-right">
          <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" onclick={() => deleteUser(user.id)}>
            <Trash2 class="w-4 h-4" />
          </Button>
        </Table.Cell>
      </Table.Row>
    {/snippet}
  </DataTable>
</div>
