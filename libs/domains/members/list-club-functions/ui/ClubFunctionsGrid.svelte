<script lang="ts">
  import { Plus, Pencil, X } from '@lucide/svelte';
  import { Card, Badge, MemberAvatar } from '@nba/ui';
  import type { ClubFunction } from '../../shared/club-functions';
  import { memberPhotoUrl } from '../../shared/member-photo';
  import type { ClubFunctionAssignment } from '../dto';

  /**
   * Les fonctions du club, en grille — la présentation de bureau.
   *
   * Deux colonnes de cartes, et des boutons d'icône sur chaque ligne : c'est juste
   * à la souris, qui vise au pixel. Au doigt, c'est {@link ClubFunctionsList} qui
   * prend le relais, avec des sections et un balayage.
   */
  let {
    groupes,
    season,
    canWrite = false,
    nomAffiche,
    onEdit,
    onRemove,
    onCreate
  }: {
    groupes: { fn: ClubFunction; label: string; holders: ClubFunctionAssignment[] }[];
    season: string;
    canWrite?: boolean;
    nomAffiche: (a: ClubFunctionAssignment) => string;
    onEdit: (a: ClubFunctionAssignment) => void;
    onRemove: (a: ClubFunctionAssignment) => void;
    onCreate: (fn: ClubFunction) => void;
  } = $props();
</script>

  <div class="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2">
    {#each groupes as group (group.fn)}
      <Card.Root>
        <Card.Content class="p-4 space-y-2">
          <div class="flex items-center justify-between gap-2 border-b border-border pb-2">
            <h3 class="text-sm font-bold text-foreground">{group.label}</h3>
            {#if group.holders.length === 0}
              <Badge variant="warning" size="xs">Non attribuée</Badge>
            {/if}
          </div>
          {#each group.holders as holder (holder.licence)}
            <div class="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-accent/50 transition-colors">
              <a
                href={`/admin/members/${holder.licence}?season=${encodeURIComponent(season)}`}
                class="flex items-center gap-2 min-w-0 flex-1"
              >
                <MemberAvatar
                  src={memberPhotoUrl(holder.licence, holder.photoUpdatedAt)}
                  name={nomAffiche(holder)}
                  size="sm"
                />
                <span class="text-sm font-medium text-foreground truncate">{nomAffiche(holder)}</span>
                <span class="text-xs text-muted-foreground shrink-0">{holder.licence}</span>
                {#if holder.memberId === null}
                  <!-- Licence sans dossier : l'adhérent a quitté le référentiel, la
                       fonction reste — la retirer est une décision humaine. -->
                  <Badge variant="destructive" size="xs">Sans dossier</Badge>
                {/if}
              </a>
              {#if canWrite}
                <button
                  type="button"
                  class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                  title="Changer de fonction"
                  aria-label={`Changer la fonction de ${nomAffiche(holder)}`}
                  onclick={() => onEdit(holder)}
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  class="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive shrink-0"
                  title="Retirer la fonction"
                  aria-label={`Retirer la fonction de ${nomAffiche(holder)}`}
                  onclick={() => onRemove(holder)}
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              {/if}
            </div>
          {:else}
            <p class="text-xs text-muted-foreground italic">Personne pour cette saison.</p>
          {/each}
          {#if canWrite}
            <button
              type="button"
              class="text-xs text-primary hover:underline flex items-center gap-1"
              onclick={() => onCreate(group.fn)}
            >
              <Plus class="w-3 h-3" />
              Attribuer
            </button>
          {/if}
        </Card.Content>
      </Card.Root>
    {/each}
  </div>
