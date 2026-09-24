<script lang="ts">
  import { Input, Button, Badge, Table, uiConfirm, flashAndReload, submitForm, FormSheet, FormField, DataTable, DataTableToolbar, MultiChoiceField, dockDePage, uiAlert } from '@nba/ui';
  import { Plus, Trash2, Pencil } from '@lucide/svelte';
  import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, type Role } from '../shared/roles';
  import { accesFiltres, libelleDeRole, tonDeRole } from '../shared/users-row-model';
  import UserList from './UserList.svelte';

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

  /*
    Les libellés et les tons viennent du modèle de rangée, que la liste mobile lit
    aussi : deux vocabulaires pour une même donnée finissent toujours par diverger.
  */
  const roleVariant = tonDeRole;
  const roleLabel = libelleDeRole;

  /*
    La recherche filtrait… rien. Le champ de la barre d'outils était bien lié à
    `searchTerm`, mais personne ne s'en servait : taper un nom ne réduisait pas la
    liste.

    Elle filtre maintenant, et c'est `dockSearch` de la barre d'outils qui la descend
    dans la loupe — une seule déclaration, qui masque du même geste le champ du haut
    sous 768 px. Déclarée à la main ici, elle s'ajoutait à celui-ci au lieu de le
    remplacer : deux champs pour une même question sur le même écran.
  */
  const visibles = $derived(accesFiltres(users, searchTerm));

  /* La création descend dans la barre du bas, comme sur tous les autres écrans. */
  $effect(() =>
    dockDePage.declarerActions([
      { id: 'acces', label: 'Ajouter un accès', icon: Plus, run: openAddSheet }
    ])
  );

  const optionsDeRole = ROLES.map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
    hint: ROLE_DESCRIPTIONS[r]
  }));

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
      uiAlert(await res.text());
    }
  }
</script>

<div class="space-y-6">
  <DataTable
    mobileSpacing="list"
    data={visibles}
    emptyTitle="Aucun utilisateur"
    emptyDescription="Ajoutez des accès pour permettre à d'autres membres d'administrer l'association."
  >
    {#snippet toolbar()}
      <DataTableToolbar
        bind:searchValue={searchTerm}
        searchPlaceholder="Rechercher un accès"
        hasFilters={false}
        dockSearch
      >
        {#snippet actions()}
          <!-- Sur téléphone, la création vit dans la barre du bas. -->
          <Button
            onclick={openAddSheet}
            class="hidden h-9 shrink-0 items-center justify-center gap-1.5 font-bold md:flex"
          >
            <Plus class="w-4 h-4" />
            <span>Ajouter</span>
          </Button>
        {/snippet}
      </DataTableToolbar>
    {/snippet}

    {#snippet mobileView()}
      <UserList users={visibles} onEdit={openEditSheet} onDelete={deleteUser} />
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

<!--
  Le formulaire monte du bas sur téléphone et porte sa validation dans la barre de la
  feuille. Il vivait dans une `Sheet` brute, avec un pied que le clavier logiciel
  recouvrait dès qu'on saisissait une adresse — et une liste de rôles assez haute pour
  que ce pied soit déjà loin.
-->
<FormSheet
  bind:open={isSheetOpen}
  title={editUserId ? "Modifier l'accès" : 'Ajouter un accès'}
  description={editUserId
    ? 'Modifiez les droits du collaborateur.'
    : "Donnez l'accès à un nouveau collaborateur."}
  onSubmit={(e) => {
    e.preventDefault();
    void saveUser();
  }}
>
  <FormField id="name" label="Nom">
    <Input id="name" bind:value={newName} placeholder="Jean Dupont" />
  </FormField>

  <FormField id="email" label="Email">
    <Input id="email" type="email" bind:value={newEmail} placeholder="jean@example.com" disabled={!!editUserId} />
  </FormField>

  <!--
    Sept rôles, dont on n'en coche presque jamais plus d'un : au doigt, une rangée qui
    dit ce qui est retenu et mène à l'écran de choix, plutôt que sept cases de 16 px
    empilées sur sept lignes. La grille reste à la souris, qui vise au pixel.
  -->
  <FormField id="roles" label="Rôles">
    <MultiChoiceField
      id="roles"
      label="Rôles"
      options={optionsDeRole}
      bind:values={selectedRoles}
      placeholder="Aucun rôle"
      description="Les droits accordés sont la réunion de ceux de chaque rôle."
    />
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
</FormSheet>
