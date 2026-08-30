<script lang="ts">
  import { Button, CollapsibleSection, toast, uiConfirm, flashAndReload } from '@nba/ui';
  import { restoreRevision } from './page-editor-actions';

  interface RevisionRow {
    id: number;
    revision: number;
    authorEmail: string;
    reason: string | null;
    createdAt: number | string;
    blockCount: number;
  }

  let { revisions = [], pageId, canRestore = false } = $props<{
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
      toast.error(error instanceof Error ? error.message : 'La restauration a échoué.');
    }
  }
</script>

<CollapsibleSection title={`Historique (${revisions.length})`}>
  {#if revisions.length === 0}
    <p class="text-muted-foreground text-sm">
      Aucune version antérieure. Chaque enregistrement en conservera une.
    </p>
  {:else}
    <ul class="divide-border divide-y text-sm">
      {#each revisions as row (row.id)}
        <li class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span>
            <span class="font-medium">Version {row.revision}</span>
            <span class="text-muted-foreground"> · {when(row.createdAt)} · {row.blockCount} bloc(s)</span>
            {#if row.reason}<span class="text-muted-foreground"> · {row.reason}</span>{/if}
          </span>
          {#if canRestore}
            <Button variant="ghost" size="sm" onclick={() => restore(row)}>Restaurer</Button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</CollapsibleSection>
