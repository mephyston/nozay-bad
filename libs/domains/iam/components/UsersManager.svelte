<script lang="ts">
  import { Input, Button, Badge, Table, Card, EmptyState, uiConfirm, toast, Sheet, FormField } from '@nba/ui';
  import { Plus, Trash2, Shield } from '@lucide/svelte';
  
  let { users = [] } = $props<{ users: any[] }>();

  let newEmail = $state('');
  let newName = $state('');
  let newPermissions = $state<string>('');
  let isSheetOpen = $state(false);

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
  <Card.Root>
    <Card.Header class="flex flex-row items-center justify-between space-y-0">
      <div>
        <Card.Title>Administrateurs</Card.Title>
        <Card.Description>Gérez les droits d'accès à la plateforme.</Card.Description>
      </div>
      <Sheet.Root bind:open={isSheetOpen}>
        <Sheet.Trigger asChild>
          {#snippet child({ props })}
            <Button {...props} size="sm">
              <Plus class="w-4 h-4 mr-2" />
              Ajouter
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
    </Card.Header>
    <Card.Content>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Nom</Table.Head>
            <Table.Head>Email</Table.Head>
            <Table.Head>Permissions</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each users as user}
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
          {/each}
          
          {#if users.length === 0}
            <Table.Row>
              <Table.Cell colspan={4} class="h-32 text-center">
                <EmptyState
                  icon={Shield}
                  title="Aucun utilisateur"
                  description="Ajoutez des accès pour permettre à d'autres membres d'administrer l'association."
                />
              </Table.Cell>
            </Table.Row>
          {/if}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
</div>
