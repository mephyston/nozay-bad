<script lang="ts">
  import { History, RotateCcw } from '@lucide/svelte';
  import {
    EmptyState,
    ListRow,
    ListView,
    ResponsiveSheet,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { restoreRevision } from './page-editor-actions';

  interface RevisionRow {
    id: number;
    revision: number;
    authorEmail: string;
    reason: string | null;
    createdAt: number | string;
    blockCount: number;
  }

  /**
   * L'historique d'une page, en tiroir.
   *
   * Il vivait en section repliable tout en bas de l'écran, après les blocs et les
   * anciennes adresses : sur une page de dix blocs, on ne l'atteignait qu'après un
   * long défilement, et on ne l'y cherchait donc jamais. C'est une consultation, pas
   * une étape de rédaction — elle s'ouvre depuis le menu et se referme.
   */
  let {
    open = $bindable(false),
    revisions = [],
    pageId,
    canRestore = false
  } = $props<{
    open?: boolean;
    revisions: RevisionRow[];
    /** Page dont on restaure une version : l'écriture la nomme, le relais la valide. */
    pageId: number;
    canRestore?: boolean;
  }>();

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  const when = (value: number | string) =>
    formatter.format(new Date(typeof value === 'number' ? value * 1000 : value));

  async function restore(row: RevisionRow) {
    const confirmed = await uiConfirm({
      title: `Restaurer la version ${row.revision} ?`,
      description:
        "Le contenu actuel sera remplacé, mais conservé dans l'historique : ce retour en arrière reste réversible. L'adresse et la mise en ligne ne changent pas.",
      confirmLabel: 'Restaurer'
    });
    if (!confirmed) return;

    try {
      await restoreRevision(pageId, row.id);
      flashAndReload(`Version ${row.revision} restaurée.`);
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La restauration a échoué.');
    }
  }

  /*
    Aucune question portée ici : l'écran en pose déjà une, et la sienne dit ce que la
    générique tairait — que le contenu remplacé est lui-même conservé, donc que le
    retour en arrière se défait.
  */
  const gestes = (row: RevisionRow): SwipeAction<RevisionRow>[] =>
    canRestore
      ? [{ id: 'restaurer', label: 'Restaurer', icon: RotateCcw, tone: 'primary', run: (r) => restore(r) }]
      : [];
</script>

<ResponsiveSheet
  bind:open
  title="Historique"
  description="Chaque enregistrement conserve une version de la page."
  size="lg"
>
  {#if revisions.length === 0}
    <EmptyState
      icon={History}
      title="Aucune version antérieure"
      description="Chaque enregistrement en conservera une."
    />
  {:else}
    <ListView items={revisions}>
      {#snippet listRow(row)}
        <ListRow
          item={row}
          title={`Version ${row.revision}`}
          subtitle={row.reason ? `${when(row.createdAt)} · ${row.reason}` : when(row.createdAt)}
          value={String(row.blockCount)}
          valueCaption="bloc(s)"
          chevron="none"
          actions={gestes(row)}
        />
      {/snippet}
    </ListView>
  {/if}
</ResponsiveSheet>
