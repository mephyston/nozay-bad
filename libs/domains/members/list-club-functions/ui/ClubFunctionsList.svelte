<script lang="ts">
  import { Plus, Pencil, Trash2 } from '@lucide/svelte';
  import { Badge, ListSection, ListRow, MemberAvatar, type SwipeAction } from '@nba/ui';
  import { CLUB_FUNCTION_LABELS, type ClubFunction } from '../../shared/club-functions';
  import { memberPhotoUrl } from '../../shared/member-photo';
  import type { ClubFunctionAssignment } from '../dto';

  /**
   * Les fonctions du club, en sections.
   *
   * Une grille de cartes à deux colonnes n'a pas de sens sur 390 px : chaque carte
   * s'y empile de toute façon, en emportant sa bordure et son rembourrage pour une
   * ou deux lignes de contenu. Des sections disent la même chose sans les cadres —
   * et une fonction sans titulaire garde sa place, puisque c'est précisément ce
   * qu'il faut voir après une assemblée générale.
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

  /**
   * Changer la fonction, ou la retirer.
   *
   * Remplacent les deux boutons de 20 px que portait chaque ligne — deux cibles
   * qu'aucun pouce ne vise, et qui se touchaient l'une pour l'autre. Le retrait
   * vient en second : le balayage long exécute la première, et ce n'est pas à lui
   * de défaire ce qu'une assemblée a décidé.
   */
  const actions = (holder: ClubFunctionAssignment): SwipeAction<ClubFunctionAssignment>[] => [
    { id: 'changer', label: 'Changer la fonction', icon: Pencil, tone: 'primary', run: onEdit },
    { id: 'retirer', label: 'Retirer la fonction', icon: Trash2, tone: 'destructive', run: onRemove }
  ];
</script>

<div class="space-y-5 md:hidden">
  {#each groupes as groupe (groupe.fn)}
    <div class="space-y-1.5">
      <div class="flex items-center justify-between gap-2 px-4">
        <ListSection label={groupe.label} class="px-0" />
        {#if groupe.holders.length === 0}
          <Badge variant="warning" size="xs">Non attribuée</Badge>
        {/if}
      </div>

      <ul class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {#each groupe.holders as holder (holder.licence)}
          <ListRow
            item={holder}
            href={`/admin/members/${holder.licence}?season=${encodeURIComponent(season)}`}
            title={nomAffiche(holder)}
            subtitle={`Licence ${holder.licence}`}
            actions={canWrite ? actions(holder) : []}
          >
            {#snippet leading()}
              <MemberAvatar
                src={memberPhotoUrl(holder.licence, holder.photoUpdatedAt)}
                name={nomAffiche(holder)}
                class="size-9"
              />
            {/snippet}
            {#snippet badge()}
              {#if holder.memberId === null}
                <!-- Licence sans dossier : l'adhérent a quitté le référentiel, la
                     fonction reste — la retirer est une décision humaine. -->
                <Badge variant="destructive" size="xs">Sans dossier</Badge>
              {/if}
            {/snippet}
          </ListRow>
        {/each}

        {#if canWrite}
          <ListRow
            title="Attribuer…"
            onclick={() => onCreate(groupe.fn)}
            chevron={false}
            class="text-primary"
          >
            {#snippet leading()}
              <Plus class="size-5 text-primary" aria-hidden="true" />
            {/snippet}
          </ListRow>
        {:else if groupe.holders.length === 0}
          <li class="px-4 py-3 text-sm text-muted-foreground">Personne pour cette saison.</li>
        {/if}
      </ul>
    </div>
  {/each}
</div>
