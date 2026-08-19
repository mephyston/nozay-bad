<script lang="ts">
  import { tick } from 'svelte';
  import { CollapsibleSection, Table, Badge, Button, Checkbox, Input, Select, submitForm } from '@nba/ui';
  import { Check, Minus, AlertTriangle, RotateCcw, Search, ChevronDown } from '@lucide/svelte';
  import { ROLE_PERMISSIONS, type Role } from '../shared/roles';
  import { PERMISSION_LABELS, groupedPermissions } from '../shared/catalog';
  import type { Permission } from '../shared/permissions';
  import type { RoleSummary } from '../list-role-permissions/dto';

  let { roles = [], canEdit = false }: { roles?: RoleSummary[]; canEdit?: boolean } = $props();

  const groups = groupedPermissions();

  /**
   * Sélection en cours, par rôle.
   *
   * On travaille sur une copie : rien n'est appliqué tant que l'utilisateur n'a pas
   * enregistré, et il peut revenir en arrière. Un Set par rôle plutôt qu'un tableau —
   * la matrice fait une soixantaine de lignes par autant de colonnes que de rôles.
   *
   * Un `Set` n'est pas réactif en profondeur avec les runes : chaque écriture
   * reconstruit le Set *et* réaffecte `draft`. Muter le Set en place ne redessinerait
   * rien.
   */
  let draft = $state<Record<string, Set<Permission>>>(
    Object.fromEntries(roles.map((r) => [r.role, new Set(r.permissions)]))
  );
  let editing = $state<Role | null>(null);
  let saving = $state(false);

  /**
   * L'édition se fait rôle par rôle, dans une liste verticale — jamais dans la matrice.
   *
   * La matrice fait 64 droits × 7 rôles : sur un téléphone il fallait la faire défiler
   * horizontalement pour atteindre la colonne du rôle édité, puis la garder alignée avec
   * la ligne du droit. Comme on n'édite de toute façon qu'un rôle à la fois, la
   * comparaison entre colonnes ne sert à rien pendant la saisie : la matrice reste pour
   * la lecture sur grand écran, l'édition passe par une liste pleine largeur.
   */
  let query = $state('');
  let onlyGranted = $state(false);
  /**
   * Rôle affiché par la vue liste en lecture (mobile). On ouvre sur le premier rôle
   * modifiable : `super_admin` arrive en tête de la liste mais détient tout, sa colonne
   * n'apprend rien.
   */
  let viewedRole = $state<string>(
    (roles.find((r) => r.editable) ?? roles[0])?.role ?? ''
  );
  let editorEl = $state<HTMLElement | null>(null);

  /**
   * Repli des rubriques, par vue.
   *
   * Deux états distincts et pas un seul : la matrice est déjà entièrement visible sur
   * grand écran, tout replier par défaut y casserait la lecture d'ensemble et le Ctrl+F
   * du navigateur. La liste, elle, aligne 64 lignes : elle s'ouvre repliée.
   */
  let matrixOpen = $state<Set<string>>(new Set(groups.map((g) => g.label)));
  let listOpen = $state<Set<string>>(new Set());

  const editedRole = $derived(editing ? roles.find((r) => r.role === editing) : undefined);
  const needle = $derived(query.trim().toLowerCase());
  const searching = $derived(needle.length > 0);

  /** Le rôle dont la liste verticale montre les droits : celui édité, sinon celui choisi. */
  const listedRole = $derived(editing ? editedRole : roles.find((r) => r.role === viewedRole));

  function matches(permission: Permission): boolean {
    if (!searching) return true;
    return (
      permission.toLowerCase().includes(needle) ||
      PERMISSION_LABELS[permission].toLowerCase().includes(needle)
    );
  }

  /** Rubriques de la matrice, filtrées par la recherche ; les rubriques vides disparaissent. */
  const matrixGroups = $derived(
    groups
      .map((g) => ({ label: g.label, permissions: g.permissions.filter(matches) }))
      .filter((g) => g.permissions.length > 0)
  );

  /**
   * Rubriques de la liste verticale. En lecture, le filtre « accordés seulement » évite
   * de dérouler des dizaines de lignes barrées ; en édition il est hors sujet — on ne peut
   * pas cocher un droit qu'on a masqué.
   */
  const listGroups = $derived(
    groups
      .map((g) => ({
        label: g.label,
        permissions: g.permissions.filter(
          (p) =>
            matches(p) && (editing || !onlyGranted || has(listedRole?.role ?? '', p))
        )
      }))
      .filter((g) => g.permissions.length > 0)
  );

  /** Une recherche en cours déplie tout : sinon ses résultats resteraient cachés. */
  function isOpen(open: Set<string>, label: string): boolean {
    return searching || open.has(label);
  }

  function toggleMatrixGroup(label: string) {
    const next = new Set(matrixOpen);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    matrixOpen = next;
  }

  function toggleListGroup(label: string) {
    const next = new Set(listOpen);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    listOpen = next;
  }

  const allGroupsOpen = $derived(listGroups.length > 0 && listGroups.every((g) => listOpen.has(g.label)));

  function toggleAllGroups() {
    listOpen = allGroupsOpen ? new Set() : new Set(listGroups.map((g) => g.label));
  }

  function has(role: string, permission: Permission): boolean {
    return draft[role]?.has(permission) ?? false;
  }

  function toggle(role: string, permission: Permission) {
    const next = new Set(draft[role]);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    draft = { ...draft, [role]: next };
  }

  function grantedIn(role: string, permissions: Permission[]): number {
    return permissions.filter((p) => has(role, p)).length;
  }

  /**
   * Accorde ou retire toute une rubrique d'un coup.
   *
   * Donner « toute la comptabilité » à un trésorier, c'était 18 cases dispersées dans
   * une liste de 64. On agit sur les droits *affichés* : une recherche en cours restreint
   * donc la portée du bouton, ce que l'utilisateur voit à l'écran.
   */
  function toggleGroupAll(role: string, permissions: Permission[]) {
    const next = new Set(draft[role]);
    const allGranted = permissions.every((p) => next.has(p));
    for (const p of permissions) {
      if (allGranted) next.delete(p);
      else next.add(p);
    }
    draft = { ...draft, [role]: next };
  }

  function dirty(role: string): boolean {
    const initial = roles.find((r) => r.role === role)?.permissions ?? [];
    const current = draft[role] ?? new Set<Permission>();
    return initial.length !== current.size || initial.some((p) => !current.has(p));
  }

  /** Nombre de droits ajoutés et retirés depuis l'ouverture, pour la barre d'actions. */
  function pendingChanges(role: string): { added: number; removed: number } {
    const initial = new Set(roles.find((r) => r.role === role)?.permissions ?? []);
    const current = draft[role] ?? new Set<Permission>();
    let added = 0;
    for (const p of current) if (!initial.has(p)) added++;
    let removed = 0;
    for (const p of initial) if (!current.has(p)) removed++;
    return { added, removed };
  }

  /** Revenir à la définition d'origine du code, sans enregistrer. */
  function resetToDefaults(role: Role) {
    draft = { ...draft, [role]: new Set(ROLE_PERMISSIONS[role]) };
  }

  /**
   * Le formulaire d'édition s'affiche sous les cartes de rôle : sans ce défilement, on
   * clique « Modifier les droits » et rien ne semble se produire à l'écran.
   */
  async function startEditing(role: Role) {
    editing = role;
    query = '';
    onlyGranted = false;
    listOpen = new Set();
    await tick();
    editorEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancel() {
    const role = editing!;
    draft = { ...draft, [role]: new Set(roles.find((r) => r.role === role)?.permissions ?? []) };
    editing = null;
    query = '';
  }

  async function save(role: Role) {
    saving = true;
    await submitForm({
      submit: async () => {
        const res = await fetch(`/admin/api/roles/${role}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: [...draft[role]] })
        });
        if (!res.ok) throw new Error(await res.text());
      },
      success: 'Droits du rôle mis à jour.',
      close: () => {
        editing = null;
      }
    });
    saving = false;
  }
</script>

<!--
  Champ de recherche commun aux deux vues : 64 droits, on en cherche souvent un précis
  plutôt que de parcourir les treize rubriques.
-->
{#snippet searchField(placeholder: string)}
  <Input
    type="search"
    icon={Search}
    bind:value={query}
    {placeholder}
    aria-label="Rechercher un droit"
  />
{/snippet}

<!-- Une ligne de droit de la liste verticale : lecture seule, ou case à cocher. -->
{#snippet permissionRow(role: string, permission: Permission, editable: boolean)}
  {#if editable}
    <!-- Le <label> englobe toute la ligne : la cible tactile fait la largeur de l'écran. -->
    <label
      class="flex items-center gap-3 py-2 min-h-11 cursor-pointer border-b border-border/50 last:border-0"
    >
      <Checkbox checked={has(role, permission)} onCheckedChange={() => toggle(role, permission)} />
      <span class="min-w-0 flex-1">
        <span class="block text-sm text-foreground leading-snug">{PERMISSION_LABELS[permission]}</span>
        <span class="block text-[11px] text-muted-foreground font-mono">{permission}</span>
      </span>
    </label>
  {:else}
    <div class="flex items-center gap-3 py-2 min-h-11 border-b border-border/50 last:border-0">
      {#if has(role, permission)}
        <Check class="w-4 h-4 shrink-0 text-primary" aria-label="accordé" />
      {:else}
        <Minus class="w-4 h-4 shrink-0 text-muted-foreground/40" aria-label="non accordé" />
      {/if}
      <span class="min-w-0 flex-1 {has(role, permission) ? '' : 'opacity-60'}">
        <span class="block text-sm text-foreground leading-snug">{PERMISSION_LABELS[permission]}</span>
        <span class="block text-[11px] text-muted-foreground font-mono">{permission}</span>
      </span>
    </div>
  {/if}
{/snippet}

<!--
  Liste verticale d'un seul rôle, par rubriques repliables. Sert à l'édition (tous
  écrans) et à la lecture sur mobile.
-->
{#snippet roleList(role: string, editable: boolean)}
  <div class="space-y-2">
    <div class="flex justify-end">
      <Button size="sm" variant="ghost-muted" onclick={toggleAllGroups} disabled={searching}>
        {allGroupsOpen ? 'Tout replier' : 'Tout déplier'}
      </Button>
    </div>

    {#each listGroups as group (group.label)}
      {@const granted = grantedIn(role, group.permissions)}
      {@const all = granted === group.permissions.length}
      <div class="rounded-lg border border-border overflow-hidden">
        <div class="flex items-center gap-2 bg-muted/50 pr-2">
          {#if editable}
            <!-- Case de rubrique tri-état, hors du bouton de repli : deux commandes
                 distinctes, donc deux éléments interactifs séparés. -->
            <label
              class="flex items-center pl-3 py-2 cursor-pointer"
              title={all ? 'Retirer toute la rubrique' : 'Accorder toute la rubrique'}
            >
              <Checkbox
                checked={all}
                indeterminate={granted > 0 && !all}
                onCheckedChange={() => toggleGroupAll(role, group.permissions)}
                aria-label={`Accorder ou retirer toute la rubrique ${group.label}`}
              />
            </label>
          {/if}
          <button
            type="button"
            class="flex-1 flex items-center justify-between gap-2 py-2.5 {editable
              ? 'pl-1'
              : 'pl-3'} text-left min-h-11"
            aria-expanded={isOpen(listOpen, group.label)}
            onclick={() => toggleListGroup(group.label)}
          >
            <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </span>
            <span class="flex items-center gap-2 shrink-0">
              <!-- Sous filtre « accordés seulement », la fraction vaudrait toujours
                   n/n : on n'affiche alors que le nombre. -->
              <span class="text-xs text-muted-foreground tabular-nums">
                {#if !editing && onlyGranted}
                  {granted}
                {:else}
                  {granted}/{group.permissions.length}
                {/if}
              </span>
              <ChevronDown
                class="w-4 h-4 text-muted-foreground transition-transform duration-200 {isOpen(
                  listOpen,
                  group.label
                )
                  ? 'rotate-180'
                  : ''}"
              />
            </span>
          </button>
        </div>

        {#if isOpen(listOpen, group.label)}
          <div class="px-3 py-1">
            {#each group.permissions as permission (permission)}
              {@render permissionRow(role, permission, editable)}
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    {#if listGroups.length === 0}
      <p class="text-sm text-muted-foreground py-4 text-center">
        Aucun droit ne correspond{searching ? ' à cette recherche' : ''}.
      </p>
    {/if}
  </div>
{/snippet}

<CollapsibleSection
  title="Que permet chaque rôle ?"
  description={canEdit
    ? "Cochez les droits accordés par un rôle. Le super administrateur détient l'intégralité des droits par construction et n'est pas modifiable."
    : "Droits accordés par chaque rôle. Un compte peut en cumuler plusieurs ; ses droits sont l'union des leurs."}
  badge={`${roles.length} rôles`}
>
  <div class="space-y-6">
    <!-- Rappel de ce que recouvre chaque rôle, avec son écart éventuel. -->
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each roles as role (role.role)}
        <div
          class="rounded-lg border p-3 {editing === role.role
            ? 'border-primary ring-1 ring-primary/30'
            : 'border-border'}"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-foreground">{role.label}</span>
            <Badge
              variant={role.role === 'super_admin'
                ? 'destructive'
                : role.role === 'membre'
                  ? 'outline'
                  : 'secondary'}
              size="xs"
            >
              {draft[role.role]?.size ?? role.permissions.length} droits
            </Badge>
          </div>
          <p class="mt-1 text-xs text-muted-foreground leading-snug">{role.description}</p>

          {#if role.added.length > 0 || role.removed.length > 0}
            <!-- Tant que les rôles vivaient en code, git disait qui avait changé quoi
                 et pourquoi. Cet écart le remplace : il rend la dérive visible. -->
            <p class="mt-2 text-xs text-warning flex items-start gap-1.5">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Modifié depuis la définition d'origine :
                {#if role.added.length}{role.added.length} ajout{role.added.length > 1 ? 's' : ''}{/if}{#if role.added.length && role.removed.length},
                {/if}{#if role.removed.length}{role.removed.length} retrait{role.removed.length > 1
                    ? 's'
                    : ''}{/if}.
              </span>
            </p>
          {/if}

          {#if canEdit && role.editable}
            <div class="mt-3 flex flex-wrap items-center gap-2">
              {#if editing === role.role}
                <span class="text-xs text-primary font-medium">Modification en cours…</span>
              {:else}
                <!-- Passer d'un rôle à l'autre en cours d'édition abandonnerait la
                     saisie sans le dire : le bouton attend qu'on ait tranché. -->
                <Button
                  size="sm"
                  variant="outline"
                  disabled={editing !== null}
                  onclick={() => startEditing(role.role)}
                >
                  Modifier les droits
                </Button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if editing && editedRole}
      {@const changes = pendingChanges(editing)}
      <div bind:this={editorEl} class="scroll-mt-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-bold text-foreground">Droits de « {editedRole.label} »</p>
            <p class="text-xs text-muted-foreground">
              {draft[editing]?.size ?? 0} droits accordés sur {groups.reduce(
                (n, g) => n + g.permissions.length,
                0
              )}.
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            class="gap-1.5"
            onclick={() => resetToDefaults(editing!)}
            disabled={saving}
            title="Revenir aux droits d'origine, sans enregistrer"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            Réinitialiser
          </Button>
        </div>

        {@render searchField('Rechercher un droit à accorder…')}

        {@render roleList(editing, true)}

        <!--
          Barre d'actions collante : la liste fait 64 lignes, sur aucun écran on ne doit
          la parcourir en entier pour retrouver « Enregistrer ». `bottom-14` la pose
          au-dessus de MobileBottomNav (56 px), qui disparaît à partir de `md`.
        -->
        <div
          class="sticky bottom-14 md:bottom-0 z-30 -mx-4 px-4 py-3 bg-card border-t border-border flex flex-wrap items-center gap-2"
        >
          <Button size="sm" onclick={() => save(editing!)} disabled={saving || !dirty(editing)}>
            Enregistrer
          </Button>
          <Button size="sm" variant="ghost" onclick={cancel} disabled={saving}>Annuler</Button>
          {#if changes.added || changes.removed}
            <span class="text-xs text-muted-foreground">
              {#if changes.added}+{changes.added}{/if}{#if changes.added && changes.removed},
              {/if}{#if changes.removed}−{changes.removed}{/if} en attente
            </span>
          {/if}
        </div>
      </div>
    {:else}
      <div class="space-y-3">
        {@render searchField('Rechercher un droit…')}

        <!--
          Lecture sur mobile : un rôle à la fois. Sept colonnes dans 390 px sont
          illisibles, et la comparaison entre rôles n'a d'intérêt que là où elle tient à
          l'écran — au-delà de `md`, où la matrice reprend la main.
        -->
        <div class="md:hidden space-y-3">
          <Select bind:value={viewedRole} aria-label="Rôle affiché">
            {#each roles as role (role.role)}
              <option value={role.role}>{role.label}</option>
            {/each}
          </Select>

          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox bind:checked={onlyGranted} />
            <span class="text-muted-foreground">N'afficher que les droits accordés</span>
          </label>

          {#if listedRole}
            {@render roleList(listedRole.role, false)}
          {/if}
        </div>

        <!--
          La matrice déborde en largeur : elle défile dans son propre conteneur, la page
          ne défile jamais horizontalement.
        -->
        <div class="hidden md:block overflow-x-auto rounded-lg border border-border">
          <Table.Root class="min-w-[640px]">
            <Table.Header>
              <Table.Row>
                <Table.Head class="sticky left-0 bg-card z-10 min-w-[260px]">Droit</Table.Head>
                {#each roles as role (role.role)}
                  <Table.Head class="text-center whitespace-nowrap">{role.label}</Table.Head>
                {/each}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each matrixGroups as group (group.label)}
                <Table.Row class="bg-muted/50 hover:bg-muted/50">
                  <Table.Cell colspan={roles.length + 1} class="p-0">
                    <button
                      type="button"
                      class="w-full flex items-center gap-2 px-4 py-2 text-left"
                      aria-expanded={isOpen(matrixOpen, group.label)}
                      onclick={() => toggleMatrixGroup(group.label)}
                    >
                      <ChevronDown
                        class="w-4 h-4 text-muted-foreground transition-transform duration-200 {isOpen(
                          matrixOpen,
                          group.label
                        )
                          ? 'rotate-180'
                          : '-rotate-90'}"
                      />
                      <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </span>
                      <span class="text-xs text-muted-foreground tabular-nums">
                        ({group.permissions.length})
                      </span>
                    </button>
                  </Table.Cell>
                </Table.Row>
                {#if isOpen(matrixOpen, group.label)}
                  {#each group.permissions as permission (permission)}
                    <Table.Row>
                      <Table.Cell class="sticky left-0 bg-card z-10">
                        <span class="text-sm text-foreground">{PERMISSION_LABELS[permission]}</span>
                        <span class="block text-[11px] text-muted-foreground font-mono">
                          {permission}
                        </span>
                      </Table.Cell>
                      {#each roles as role (role.role)}
                        <Table.Cell class="text-center">
                          {#if has(role.role, permission)}
                            <Check class="w-4 h-4 mx-auto text-primary" aria-label="accordé" />
                          {:else}
                            <Minus
                              class="w-4 h-4 mx-auto text-muted-foreground/40"
                              aria-label="non accordé"
                            />
                          {/if}
                        </Table.Cell>
                      {/each}
                    </Table.Row>
                  {/each}
                {/if}
              {/each}
            </Table.Body>
          </Table.Root>

          {#if matrixGroups.length === 0}
            <p class="text-sm text-muted-foreground py-6 text-center">
              Aucun droit ne correspond à cette recherche.
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</CollapsibleSection>
