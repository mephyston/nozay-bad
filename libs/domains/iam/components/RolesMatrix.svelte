<script lang="ts">
  import { Table, Badge, Button, Input, SwitchField, FormSheet, ListView, ListRow, submitForm } from '@nba/ui';
  import { Check, Minus, AlertTriangle, RotateCcw, Search, ChevronDown, Shield } from '@lucide/svelte';
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
   * Un rôle s'ouvre **en tiroir**, jamais dans la matrice.
   *
   * La matrice fait 64 droits × 7 rôles : sur un téléphone il fallait la faire défiler
   * horizontalement pour atteindre la colonne du rôle, puis la garder alignée avec la
   * ligne du droit. Comme on n'ouvre de toute façon qu'un rôle à la fois, la comparaison
   * entre colonnes n'a d'intérêt que là où elle tient à l'écran : la matrice reste pour
   * la lecture au-dessus de 768 px, le rôle se lit et se modifie dans sa feuille.
   *
   * `ouvert` est le rôle du tiroir — modifiable ou non ; `editing` n'est renseigné que
   * lorsqu'on peut écrire, et c'est lui que la sauvegarde regarde.
   */
  let ouvert = $state<string | null>(null);
  let query = $state('');
  let onlyGranted = $state(false);

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
  /** Le rôle du tiroir, qu'on l'y modifie ou qu'on s'y contente de lire. */
  const roleOuvert = $derived(ouvert ? roles.find((r) => r.role === ouvert) : undefined);
  const needle = $derived(query.trim().toLowerCase());
  const searching = $derived(needle.length > 0);

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
          (p) => matches(p) && (editing || !onlyGranted || has(ouvert ?? '', p))
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
   * Ouvre le tiroir d'un rôle. Modifiable seulement si le compte en a le droit **et**
   * si le rôle l'est : le super administrateur détient tout par construction, sa feuille
   * se consulte.
   */
  function ouvrir(role: RoleSummary) {
    ouvert = role.role;
    editing = canEdit && role.editable ? (role.role as Role) : null;
    query = '';
    onlyGranted = false;
    listOpen = new Set();
  }

  /**
   * Referme le tiroir en abandonnant la saisie.
   *
   * Appelée par la feuille elle-même — croix, échappement, voile — comme par le bouton
   * d'annulation : une fermeture qui laisserait `draft` modifié rouvrirait le rôle sur
   * des cases cochées que personne n'a enregistrées.
   */
  function fermer() {
    if (editing) {
      const role = editing;
      draft = { ...draft, [role]: new Set(roles.find((r) => r.role === role)?.permissions ?? []) };
    }
    ouvert = null;
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
      close: () => {
        editing = null;
        ouvert = null;
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

<!-- Une ligne de droit : interrupteur quand on peut écrire, coche sinon. -->
{#snippet permissionRow(role: string, permission: Permission, editable: boolean)}
  {#if editable}
    <!--
      Un interrupteur, et non une case à cocher : la rangée porte son intitulé à gauche
      et son état à droite, au même endroit sur les soixante-quatre lignes. Une case
      posait l'état avant des libellés de longueurs différentes.
    -->
    <SwitchField
      sansCadre
      id={`droit-${role}-${permission}`}
      label={PERMISSION_LABELS[permission]}
      hint={permission}
      checked={has(role, permission)}
      onChange={() => toggle(role, permission)}
    />
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
          <button
            type="button"
            class="flex-1 flex items-center justify-between gap-2 py-2.5 pl-3 text-left min-h-11"
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
            {#if editable}
              <!--
                Donner « toute la comptabilité » à un trésorier, c'était dix-huit
                interrupteurs dispersés dans une liste de soixante-quatre. Le geste est
                nommé plutôt que porté par une case tri-état, que rien n'explique.
              -->
              <div class="flex justify-end pt-1">
                <Button size="sm" variant="ghost-muted" onclick={() => toggleGroupAll(role, group.permissions)}>
                  {all ? 'Tout retirer' : 'Tout accorder'}
                </Button>
              </div>
            {/if}
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

<div class="space-y-6">
  <!--
    Les rôles en rangées, et non en cartes.

    Sept cartes de cent pixels de haut faisaient défiler deux écrans pour lire ce que
    chacune dit en une ligne : son nom, ce qu'il recouvre, et le nombre de droits qu'il
    accorde. Une rangée ouvre le rôle ; c'est là qu'on lit ses droits et qu'on les
    modifie, sans quitter la page ni chercher où le formulaire s'est déplié.
  -->
  <ListView
    items={roles}
    emptyIcon={Shield}
    emptyTitle="Aucun rôle"
    emptyDescription="Les rôles sont définis par l'application."
  >
    {#snippet listRow(role)}
      <ListRow
        item={role}
        onclick={() => ouvrir(role)}
        title={role.label}
        subtitle={role.description}
        value={`${draft[role.role]?.size ?? role.permissions.length} droits`}
        valueTone={role.role === 'super_admin' ? 'destructive' : 'muted'}
      >
        {#snippet badge()}
          <!--
            Tant que les rôles vivaient en code, git disait qui avait changé quoi et
            pourquoi. Cet écart le remplace : il rend la dérive visible, et c'est la
            seule chose qu'une rangée signale.
          -->
          {#if role.added.length > 0 || role.removed.length > 0}
            <Badge variant="warning" size="xs">
              <AlertTriangle class="w-3 h-3" />
              Modifié
            </Badge>
          {/if}
        {/snippet}
      </ListRow>
    {/snippet}
  </ListView>

  <!--
    La matrice, au-dessus de 768 px seulement : elle sert à comparer les rôles entre
    eux, ce qui demande de les voir côte à côte. Au doigt, on ouvre un rôle.
  -->
  <div class="hidden space-y-3 md:block">
    <div>
      <h3 class="text-foreground text-sm font-bold">Tous les droits, rôle par rôle</h3>
      <p class="text-muted-foreground text-xs">
        Lecture seule : un rôle se modifie depuis sa rangée.
      </p>
    </div>

    {@render searchField('Rechercher un droit…')}

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
</div>

<!--
  Le rôle ouvert, en tiroir.

  Le formulaire se dépliait sous les cartes, et il fallait le faire défiler jusqu'en bas
  pour retrouver « Enregistrer » — une barre collante y suppléait. La feuille porte sa
  validation dans sa propre barre, et la croix annule.

  `{#key}` sur le rôle : sans lui, Svelte réemploie la feuille d'un rôle à l'autre, avec
  la recherche et les rubriques dépliées du précédent.
-->
{#key ouvert}
  <FormSheet
    open={ouvert !== null}
    onOpenChange={(o) => {
      if (!o) fermer();
    }}
    title={roleOuvert?.label ?? 'Rôle'}
    description={editing
      ? `${draft[editing]?.size ?? 0} droits accordés sur ${groups.reduce((n, g) => n + g.permissions.length, 0)}.`
      : roleOuvert?.description}
    lectureSeule={!editing}
    isSubmitting={saving}
    submitLabel="Enregistrer"
    onSubmit={(e) => {
      e.preventDefault();
      if (editing) void save(editing);
    }}
  >
    {#if roleOuvert}
      {@const changes = editing ? pendingChanges(editing) : { added: 0, removed: 0 }}

      {#if editing}
        <div class="flex flex-wrap items-center justify-between gap-2">
          {#if changes.added || changes.removed}
            <span class="text-muted-foreground text-xs">
              {#if changes.added}+{changes.added}{/if}{#if changes.added && changes.removed},
              {/if}{#if changes.removed}−{changes.removed}{/if} en attente
            </span>
          {:else}
            <span></span>
          {/if}
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
      {:else}
        <!-- En lecture, dérouler soixante-quatre lignes barrées n'apprend rien. -->
        <SwitchField
          id="droits-accordes"
          label="Droits accordés seulement"
          bind:checked={onlyGranted}
        />
      {/if}

      <!--
        La recherche reste **en haut de la feuille**, et non dans la barre du bas : le
        menu contextuel appartient à l'écran hôte, que le voile du tiroir recouvre — on
        ne l'atteindrait pas, et il filtrerait une liste qu'on ne le verrait pas réduire.

        Elle colle en revanche au haut de la zone défilante : soixante-quatre droits
        font plusieurs écrans, et un champ qui défile avec eux oblige à remonter pour
        changer de terme. Le fond opaque évite que les rangées transparaissent dessous.
      -->
      <div class="sticky top-0 z-10 -mx-6 bg-card px-6 pb-2 pt-1">
        {@render searchField(editing ? 'Rechercher un droit à accorder…' : 'Rechercher un droit…')}
      </div>

      {@render roleList(roleOuvert.role, !!editing)}
    {/if}
  </FormSheet>
{/key}
