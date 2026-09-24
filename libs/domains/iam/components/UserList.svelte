<script lang="ts">
  import { ListView, ListRow, Badge, type SwipeAction } from '@nba/ui';
  import { Pencil, Shield, Trash2 } from '@lucide/svelte';
  import { ligneDAcces, tonDeRole, libelleDeRole, type AccesLu } from '../shared/users-row-model';

  /**
   * Les accès, sur téléphone.
   *
   * Une carte faite main par accès, avec deux boutons en pied dont un rouge aussi
   * accessible que l'autre : supprimer un accès demandait le même geste que l'éditer.
   * Ici, la rangée mène à l'édition d'un appui, et la suppression se balaie — elle est
   * la seconde action, jamais celle qu'un balayage long exécute.
   */
  let {
    users = [],
    onEdit,
    onDelete
  }: {
    users: AccesLu[];
    onEdit: (user: AccesLu) => void;
    onDelete: (id: number) => void;
  } = $props();

  const lignes = $derived(users.map((u) => ({ user: u, ...ligneDAcces(u) })));

  const gestes = (u: AccesLu): SwipeAction<unknown>[] => [
    { id: 'editer', label: 'Modifier', icon: Pencil, run: () => onEdit(u) },
    {
      id: 'supprimer',
      label: 'Supprimer',
      icon: Trash2,
      tone: 'destructive',
      confirm: 'Sûr de vouloir supprimer cet accès ?',
      run: () => onDelete(u.id)
    }
  ];
</script>

<ListView
  items={lignes}
  emptyIcon={Shield}
  emptyTitle="Aucun utilisateur"
  emptyDescription="Ajoutez des accès pour permettre à d'autres membres d'administrer l'association."
>
  {#snippet listRow(l)}
    <ListRow
      item={l.user}
      onclick={() => onEdit(l.user)}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.exception ? 'warning' : 'muted'}
      actions={gestes(l.user)}
    >
      {#snippet badge()}
        <!-- Le seul rôle qui mérite d'être vu sans ouvrir la fiche : il peut tout. -->
        {#if (l.user.roles ?? []).includes('super_admin')}
          <Badge variant={tonDeRole('super_admin')} size="xs">{libelleDeRole('super_admin')}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
