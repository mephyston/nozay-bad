<script lang="ts">
  import { Input, Button, Badge, Table, Card, EmptyState, uiConfirm, toast, Sheet, FormField, DataTable, DataTableToolbar, Popover, Checkbox } from '@nba/ui';
  import { Plus, Trash2, Shield, ChevronDown, Pencil } from '@lucide/svelte';
  
  let { users = [] } = $props<{ users: any[] }>();

  let newEmail = $state('');
  let newName = $state('');
  let selectedPermissions = $state<string[]>([]);
  let isSheetOpen = $state(false);
  let searchTerm = $state('');
  let editUserId = $state<number | null>(null);

  const PERMISSIONS_GROUPS = [
    {
      name: 'Général',
      permissions: [
        { value: '*', label: 'Super Admin', desc: 'Accès total à toute la plateforme' },
        { value: 'settings:*', label: 'Configuration', desc: 'Gestion des réglages généraux' },
        { value: 'iam:*', label: 'Accès & Permissions', desc: 'Gestion des administrateurs' }
      ]
    },
    {
      name: 'Comptabilité',
      permissions: [
        { value: 'accounting:*', label: 'Accès complet', desc: 'Trésorier' },
        { value: 'accounting:reports', label: 'Rapports uniquement', desc: 'Lecture du tableau de bord et rapports' },
        { value: 'accounting:invoices', label: 'Gestion des factures', desc: 'Consulter et ajouter des factures' },
        { value: 'expenses:*', label: 'Notes de frais (Complet)', desc: 'Gestion complète des notes de frais' },
        { value: 'expenses:read', label: 'Notes de frais (Lecture)', desc: 'Consulter les notes de frais existantes' },
        { value: 'expenses:create', label: 'Notes de frais (Création)', desc: 'Soumettre de nouvelles notes de frais' },
        { value: 'expenses:update', label: 'Notes de frais (Modification)', desc: 'Modifier les notes de frais' },
        { value: 'expenses:validate', label: 'Notes de frais (Validation)', desc: 'Approuver et rembourser les notes de frais' }
      ]
    },
    {
      name: 'Boutique & Commandes',
      permissions: [
        { value: 'shop:*', label: 'Accès complet', desc: 'Gestion complète de la boutique' },
        { value: 'shop:products', label: 'Gestion des produits', desc: 'Ajouter/Modifier des articles (Coach)' },
        { value: 'orders:*', label: 'Commandes (Complet)', desc: 'Gestion complète des commandes' },
        { value: 'orders:read', label: 'Commandes (Lecture)', desc: 'Consulter l\'historique des commandes' },
        { value: 'orders:create', label: 'Commandes (Création)', desc: 'Créer de nouvelles commandes' },
        { value: 'orders:update', label: 'Commandes (Modification)', desc: 'Modifier des commandes existantes' },
        { value: 'orders:validate', label: 'Commandes (Validation)', desc: 'Valider et encaisser les commandes' }
      ]
    },
    {
      name: 'Adhérents',
      permissions: [
        { value: 'members:*', label: 'Accès complet', desc: 'Secrétaire' },
        { value: 'members:read', label: 'Lecture seule', desc: 'Voir la liste des adhérents' },
        { value: 'members:import', label: 'Import Poona', desc: 'Importer de nouveaux adhérents' }
      ]
    },
    {
      name: 'Assistant IA',
      permissions: [
        { value: 'ai:*', label: 'Accès complet', desc: 'Accès complet à l\'assistant' },
        { value: 'ai:chat', label: 'Discussion', desc: 'Utiliser l\'assistant IA' }
      ]
    }
  ];

  function getLabelForPerm(val: string) {
    for (const g of PERMISSIONS_GROUPS) {
      const p = g.permissions.find(x => x.value === val);
      if (p) return `${g.name} : ${p.label}`;
    }
    return val;
  }

  function togglePermission(val: string) {
    if (selectedPermissions.includes(val)) {
      selectedPermissions = selectedPermissions.filter(p => p !== val);
    } else {
      selectedPermissions = [...selectedPermissions, val];
    }
  }

  function openAddSheet() {
    editUserId = null;
    newEmail = '';
    newName = '';
    selectedPermissions = [];
  }

  function openEditSheet(user: any) {
    editUserId = user.id;
    newEmail = user.email;
    newName = user.name;
    selectedPermissions = [...user.permissions];
    isSheetOpen = true;
  }

  async function saveUser() {
    if (!newEmail) return;
    const action = editUserId ? 'update_user' : 'create_user';
    const payload = editUserId 
      ? { action, id: editUserId, name: newName, permissions: selectedPermissions }
      : { action, email: newEmail, name: newName, permissions: selectedPermissions };

    const res = await fetch('/admin/iam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      toast.success(editUserId ? 'Utilisateur mis à jour' : 'Utilisateur créé avec succès');
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
                <Button {...props} class="font-bold flex items-center justify-center gap-1.5 shrink-0 h-9" onclick={openAddSheet}>
                  <Plus class="w-4 h-4" />
                  <span>Ajouter</span>
                </Button>
              {/snippet}
            </Sheet.Trigger>
            <Sheet.Content side="right" class="w-full sm:max-w-md">
              <Sheet.Header>
                <Sheet.Title>{editUserId ? 'Modifier l\'accès' : 'Ajouter un accès'}</Sheet.Title>
                <Sheet.Description>{editUserId ? 'Modifiez les droits du collaborateur.' : 'Donnez l\'accès à un nouveau collaborateur.'}</Sheet.Description>
              </Sheet.Header>
              <div class="space-y-4 py-6">
                <FormField id="name" label="Nom">
                  <Input id="name" bind:value={newName} placeholder="Jean Dupont" />
                </FormField>
                <FormField id="email" label="Email">
                  <Input id="email" type="email" bind:value={newEmail} placeholder="jean@example.com" disabled={!!editUserId} />
                </FormField>
                <FormField id="perms" label="Droits d'accès">
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      {#snippet child({ props })}
                        <Button 
                          {...props} 
                          variant="outline" 
                          role="combobox" 
                          class="w-full justify-between font-normal h-auto min-h-10 py-2 px-3"
                        >
                          <div class="flex flex-wrap gap-1 items-center">
                            {#if selectedPermissions.length === 0}
                              <span class="text-muted-foreground">Sélectionner des droits...</span>
                            {:else}
                              {#each selectedPermissions.slice(0, 2) as p}
                                <Badge variant={p === '*' ? 'destructive' : 'secondary'} size="xs">{getLabelForPerm(p)}</Badge>
                              {/each}
                              {#if selectedPermissions.length > 2}
                                <Badge variant="outline" size="xs">+{selectedPermissions.length - 2}</Badge>
                              {/if}
                            {/if}
                          </div>
                          <ChevronDown class="h-4 w-4 opacity-50 shrink-0 ml-2" />
                        </Button>
                      {/snippet}
                    </Popover.Trigger>
                    <Popover.Content class="w-[--bits-popover-anchor-width] p-0 max-h-[350px] overflow-y-auto">
                      <div class="flex flex-col">
                        {#each PERMISSIONS_GROUPS as group}
                          <div class="px-2 pt-2 pb-1 bg-muted/50 text-xs font-bold text-muted-foreground uppercase sticky top-0 backdrop-blur z-10 border-b border-border/50">
                            {group.name}
                          </div>
                          <div class="p-1">
                            {#each group.permissions as perm}
                              <label class="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                                <div class="mt-0.5">
                                  <Checkbox 
                                    checked={selectedPermissions.includes(perm.value)} 
                                    onCheckedChange={() => togglePermission(perm.value)}
                                    aria-label={perm.label}
                                  />
                                </div>
                                <div class="flex flex-col flex-1 leading-tight">
                                  <span class="text-sm font-bold text-foreground">{perm.label}</span>
                                  <span class="text-xs text-muted-foreground">{perm.desc}</span>
                                </div>
                              </label>
                            {/each}
                          </div>
                        {/each}
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                </FormField>
              </div>
              <Sheet.Footer>
                <Button onclick={saveUser} class="w-full">Enregistrer</Button>
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
                      <Badge variant={perm === '*' ? 'destructive' : 'secondary'} size="xs">{getLabelForPerm(perm)}</Badge>
                    {/each}
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => openEditSheet(user)}
                  class="h-8 text-xs font-semibold gap-1.5"
                >
                  <Pencil class="w-3.5 h-3.5" />
                  <span>Éditer</span>
                </Button>
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
              <Badge variant={perm === '*' ? 'destructive' : 'secondary'}>{getLabelForPerm(perm)}</Badge>
            {/each}
          </div>
        </Table.Cell>
        <Table.Cell class="text-right">
          <Button variant="ghost" size="icon" class="text-muted-foreground hover:text-foreground" onclick={() => openEditSheet(user)}>
            <Pencil class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" class="text-destructive hover:text-destructive" onclick={() => deleteUser(user.id)}>
            <Trash2 class="w-4 h-4" />
          </Button>
        </Table.Cell>
      </Table.Row>
    {/snippet}
  </DataTable>
</div>
