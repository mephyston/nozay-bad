<script lang="ts">
  import { CollapsibleSection, Table, Badge, Button, Checkbox, submitForm } from '@nba/ui';
  import { Check, Minus, AlertTriangle, RotateCcw } from '@lucide/svelte';
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
   * la matrice fait une quarantaine de lignes par autant de colonnes que de rôles.
   */
  let draft = $state<Record<string, Set<Permission>>>(
    Object.fromEntries(roles.map((r) => [r.role, new Set(r.permissions)]))
  );
  let editing = $state<Role | null>(null);
  let saving = $state(false);

  const editedRole = $derived(editing ? roles.find((r) => r.role === editing) : undefined);

  function has(role: string, permission: Permission): boolean {
    return draft[role]?.has(permission) ?? false;
  }

  function toggle(role: string, permission: Permission) {
    const next = new Set(draft[role]);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    draft = { ...draft, [role]: next };
  }

  function dirty(role: string): boolean {
    const initial = roles.find((r) => r.role === role)?.permissions ?? [];
    const current = draft[role] ?? new Set<Permission>();
    return initial.length !== current.size || initial.some((p) => !current.has(p));
  }

  /** Revenir à la définition d'origine du code, sans enregistrer. */
  function resetToDefaults(role: Role) {
    draft = { ...draft, [role]: new Set(ROLE_PERMISSIONS[role]) };
  }

  function cancel() {
    const role = editing!;
    draft = { ...draft, [role]: new Set(roles.find((r) => r.role === role)?.permissions ?? []) };
    editing = null;
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
        <div class="rounded-lg border border-border p-3">
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
                <Button size="sm" onclick={() => save(role.role)} disabled={saving || !dirty(role.role)}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onclick={cancel} disabled={saving}>Annuler</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="gap-1.5"
                  onclick={() => resetToDefaults(role.role)}
                  disabled={saving}
                  title="Revenir aux droits d'origine, sans enregistrer"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  Réinitialiser
                </Button>
              {:else}
                <Button size="sm" variant="outline" onclick={() => (editing = role.role)}>
                  Modifier les droits
                </Button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if editing}
      <p class="text-xs text-muted-foreground">
        Modification en cours du rôle <strong>{editedRole?.label}</strong>. Les autres colonnes
        restent en lecture seule.
      </p>
    {/if}

    <!-- La matrice déborde en largeur sur petit écran : elle défile dans son propre
         conteneur, la page ne défile jamais horizontalement. -->
    <div class="overflow-x-auto rounded-lg border border-border">
      <Table.Root class="min-w-[640px]">
        <Table.Header>
          <Table.Row>
            <Table.Head class="sticky left-0 bg-card z-10 min-w-[260px]">Droit</Table.Head>
            {#each roles as role (role.role)}
              <Table.Head
                class="text-center whitespace-nowrap {editing === role.role ? 'text-primary' : ''}"
              >
                {role.label}
              </Table.Head>
            {/each}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each groups as group (group.label)}
            <Table.Row class="bg-muted/50 hover:bg-muted/50">
              <Table.Cell
                colspan={roles.length + 1}
                class="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {group.label}
              </Table.Cell>
            </Table.Row>
            {#each group.permissions as permission (permission)}
              <Table.Row>
                <Table.Cell class="sticky left-0 bg-card z-10">
                  <span class="text-sm text-foreground">{PERMISSION_LABELS[permission]}</span>
                  <span class="block text-[11px] text-muted-foreground font-mono">{permission}</span>
                </Table.Cell>
                {#each roles as role (role.role)}
                  <Table.Cell class="text-center">
                    {#if editing === role.role}
                      <Checkbox
                        checked={has(role.role, permission)}
                        onCheckedChange={() => toggle(role.role, permission)}
                        aria-label={`${PERMISSION_LABELS[permission]} pour ${role.label}`}
                      />
                    {:else if has(role.role, permission)}
                      <Check class="w-4 h-4 mx-auto text-primary" aria-label="accordé" />
                    {:else}
                      <Minus class="w-4 h-4 mx-auto text-muted-foreground/40" aria-label="non accordé" />
                    {/if}
                  </Table.Cell>
                {/each}
              </Table.Row>
            {/each}
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </div>
</CollapsibleSection>
