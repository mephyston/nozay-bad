<script lang="ts">
  import { Input, Button, Badge, Table, Card, EmptyState, uiConfirm, toast, flashAndReload, submitForm, Sheet, FormField, DataTable, DataTableToolbar, Checkbox } from '@nba/ui';
  import { Plus, Trash2, Shield, Pencil } from '@lucide/svelte';
  import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, type Role } from '../shared/roles';

  /**
   * Destination des écritures : le relais du domaine, et non la page hôte.
   *
   * L'adresse de la page était écrite en dur ici, ce qui liait ce composant à l'écran qui
   * l'affiche sans que rien ne le rappelle.
   */
  const RELAIS = '/admin/api/iam/acces';

  let { users = [] } = $props<{ users: any[] }>();

  let newEmail = $state('');
  let newName = $state('');
  let selectedRoles = $state<Role[]>([]);
  let isSheetOpen = $state(false);
  let searchTerm = $state('');
  let editUserId = $state<number | null>(null);

  /**
   * Droits effectivement accordés par la sélection, affichés en lecture seule.
   *
   * Attribuer un rôle sans voir ce qu'il ouvre revient à signer à l'aveugle : la
   * liste développée rend la décision vérifiable au moment où on la prend.
   */
  const grantedPermissions = $derived(
    [...new Set(selectedRoles.flatMap((r) => [...ROLE_PERMISSIONS[r]]))].sort()
  );

  function toggleRole(role: Role) {
    selectedRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];
  }

  function roleVariant(role: string) {
    return role === 'super_admin' ? 'destructive' : role === 'membre' ? 'outline' : 'secondary';
  }

  function roleLabel(role: string) {
    return ROLE_LABELS[role as Role] ?? role;
  }

  function openAddSheet() {
    editUserId = null;
    newEmail = '';
    newName = '';
    selectedRoles = [];
    isSheetOpen = true;
  }

  function openEditSheet(user: any) {
    editUserId = user.id;
    newEmail = user.email;
    newName = user.name;
    selectedRoles = [...(user.roles ?? [])];
    isSheetOpen = true;
  }

  async function saveUser() {
    const action = editUserId ? 'update_user' : 'create_user';
    const payload = editUserId
      ? { action, id: editUserId, name: newName, roles: selectedRoles }
      : { action, email: newEmail, name: newName, roles: selectedRoles };

    await submitForm({
      validate: () => (newEmail ? null : "L'adresse e-mail est requise."),
      submit: async () => {
        const res = await fetch(RELAIS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
      },
      success: editUserId ? 'Utilisateur mis à jour.' : 'Utilisateur créé.',
      close: () => { isSheetOpen = false; }
    });
  }

  async function deleteUser(id: number) {
    if (!await uiConfirm('Sûr de vouloir supprimer cet accès ?')) return;
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_user', id })
    });
    if (res.ok) {
      flashAndReload('Utilisateur supprimé');
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
            <Sheet.Content side="right" size="md" class="w-full">
              <Sheet.Header>
                <Sheet.Title>{editUserId ? 'Modifier l\'accès' : 'Ajouter un accès'}</Sheet.Title>
                <Sheet.Description>{editUserId ? 'Modifiez les droits du collaborateur.' : 'Donnez l\'accès à un nouveau collaborateur.'}</Sheet.Description>
              </Sheet.Header>
              <!--
                Le corps défile, l'en-tête et le pied restent en place : la liste des
                rôles et l'aperçu des droits dépassent la hauteur de l'écran, et sans
                cela le bouton d'enregistrement sortait du cadre.
              -->
              <div class="flex-1 min-h-0 overflow-y-auto space-y-4 py-6 pr-1">
                <FormField id="name" label="Nom">
                  <Input id="name" bind:value={newName} placeholder="Jean Dupont" />
                </FormField>
                <FormField id="email" label="Email">
                  <Input id="email" type="email" bind:value={newEmail} placeholder="jean@example.com" disabled={!!editUserId} />
                </FormField>
                <FormField id="roles" label="Rôles">
                  <div class="space-y-1">
                    {#each ROLES as role}
                      <label class="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                        <div class="mt-0.5">
                          <Checkbox
                            checked={selectedRoles.includes(role)}
                            onCheckedChange={() => toggleRole(role)}
                            aria-label={ROLE_LABELS[role]}
                          />
                        </div>
                        <div class="flex flex-col flex-1 leading-tight">
                          <span class="text-sm font-bold text-foreground">{ROLE_LABELS[role]}</span>
                          <span class="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
                        </div>
                      </label>
                    {/each}
                  </div>
                </FormField>

                <FormField id="granted" label="Droits accordés">
                  {#if grantedPermissions.length === 0}
                    <p class="text-xs text-muted-foreground">
                      Aucun rôle sélectionné : le compte n'aura accès à rien. À défaut, le
                      rôle « Membre » lui sera attribué.
                    </p>
                  {:else}
                    <!-- Pas de défilement propre : il piégerait la molette à
                         l'intérieur du panneau alors que le corps défile déjà. -->
                    <div class="flex flex-wrap gap-1 rounded-md border border-border p-2">
                      {#each grantedPermissions as permission}
                        <Badge variant="outline" size="xs">{permission}</Badge>
                      {/each}
                    </div>
                  {/if}
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
                    {#each user.roles ?? [] as role}
                      <Badge variant={roleVariant(role)} size="xs">{roleLabel(role)}</Badge>
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
      <Table.Head>Rôles</Table.Head>
      <Table.Head class="text-right">Actions</Table.Head>
    {/snippet}

    {#snippet row(user)}
      <Table.Row>
        <Table.Cell class="font-medium">{user.name}</Table.Cell>
        <Table.Cell class="text-muted-foreground">{user.email}</Table.Cell>
        <Table.Cell>
          <div class="flex flex-wrap gap-1">
            {#each user.roles ?? [] as role}
              <Badge variant={roleVariant(role)}>{roleLabel(role)}</Badge>
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
