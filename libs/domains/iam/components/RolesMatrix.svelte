<script lang="ts">
  import { Card, Table, Badge } from '@nba/ui';
  import { Check, Minus } from '@lucide/svelte';
  import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, type Role } from '../shared/roles';
  import { PERMISSION_LABELS, groupedPermissions } from '../shared/catalog';
  import type { Permission } from '../shared/permissions';

  const groups = groupedPermissions();

  // Un Set par rôle : la matrice fait ~45 lignes × 5 colonnes, autant ne pas
  // parcourir un tableau à chaque cellule.
  const granted = new Map<Role, Set<string>>(
    ROLES.map((role) => [role, new Set<string>(ROLE_PERMISSIONS[role])])
  );

  function has(role: Role, permission: Permission): boolean {
    return granted.get(role)!.has(permission);
  }

  const counts = new Map<Role, number>(ROLES.map((r) => [r, ROLE_PERMISSIONS[r].length]));
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Que permet chaque rôle ?</Card.Title>
    <Card.Description>
      Les rôles sont définis dans le code de l'application : ils ne se modifient pas depuis cet
      écran, ce qui garantit qu'ils restent identiques d'un environnement à l'autre. Un compte
      peut cumuler plusieurs rôles ; ses droits sont alors l'union des leurs.
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-6">
    <!-- Rappel de ce que recouvre chaque rôle, avant le détail ligne à ligne. -->
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each ROLES as role (role)}
        <div class="rounded-lg border border-border p-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-bold text-foreground">{ROLE_LABELS[role]}</span>
            <Badge variant={role === 'super_admin' ? 'destructive' : role === 'membre' ? 'outline' : 'secondary'} size="xs">
              {counts.get(role)} droits
            </Badge>
          </div>
          <p class="mt-1 text-xs text-muted-foreground leading-snug">{ROLE_DESCRIPTIONS[role]}</p>
        </div>
      {/each}
    </div>

    <!-- La matrice déborde en largeur sur petit écran : elle défile dans son propre
         conteneur, la page ne défile jamais horizontalement. -->
    <div class="overflow-x-auto rounded-lg border border-border">
      <Table.Root class="min-w-[640px]">
        <Table.Header>
          <Table.Row>
            <Table.Head class="sticky left-0 bg-card z-10 min-w-[260px]">Droit</Table.Head>
            {#each ROLES as role (role)}
              <Table.Head class="text-center whitespace-nowrap">{ROLE_LABELS[role]}</Table.Head>
            {/each}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each groups as group (group.label)}
            <Table.Row class="bg-muted/50 hover:bg-muted/50">
              <Table.Cell
                colspan={ROLES.length + 1}
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
                {#each ROLES as role (role)}
                  <Table.Cell class="text-center">
                    {#if has(role, permission)}
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
  </Card.Content>
</Card.Root>
