<script lang="ts">
  import { Badge, Button, uiConfirm, uiAlert } from '@nba/ui';
  import { Eye, EyeOff } from '@lucide/svelte';
  import type { TeamListItem } from '../../list-teams/dto';
  import type { Championship } from '../../shared/championship';

  let {
    teams,
    seasonCode,
    canWrite = false,
    endpoint = '/admin/api/teams/teams',
    onSaved
  }: {
    teams: TeamListItem[];
    seasonCode: string;
    canWrite?: boolean;
    endpoint?: string;
    onSaved?: () => void;
  } = $props();

  /**
   * Un championnat par ligne, dans l'ordre de la liste des équipes.
   *
   * L'état vient des équipes elles-mêmes : la publication vaut pour tout le championnat,
   * donc toutes ses équipes portent la même valeur.
   */
  const championships = $derived(
    [...new Map(teams.map((t) => [t.championship, { championship: t.championship, label: t.championshipLabel, published: t.rostersPublished }])).values()]
  );

  let busy = $state<Championship | null>(null);

  async function toggle(item: { championship: Championship; label: string; published: boolean }) {
    const confirmed = await uiConfirm(
      item.published
        ? {
            title: `Retirer les effectifs de ${item.label} ?`,
            description:
              "Les adhérents ne verront plus ni l'effectif ni les capitaines de ces équipes, et personne ne pourra composer jusqu'à la prochaine publication.",
            confirmLabel: 'Retirer'
          }
        : {
            title: `Publier les effectifs de ${item.label} ?`,
            description:
              "Chaque adhérent verra son équipe et son capitaine dans l'application, et les capitaines pourront composer. Les retouches suivantes seront visibles aussitôt.",
            confirmLabel: 'Publier'
          }
    );
    if (!confirmed) return;

    busy = item.championship;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish-rosters', seasonCode, championship: item.championship, published: !item.published })
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'La publication a échoué.');
      }
      onSaved?.();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'La publication a échoué.');
    } finally {
      busy = null;
    }
  }
</script>

{#if championships.length > 0}
  <!--
    Au-dessus de la liste : tant qu'un championnat n'est pas publié, tout ce que le coach
    saisit en dessous reste un essai, et il doit le savoir avant de commencer.
  -->
  <div class="rounded-lg border divide-y mb-4">
    {#each championships as item (item.championship)}
      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm font-medium">{item.label}</span>
          {#if item.published}
            <Badge variant="success">Effectifs publiés</Badge>
          {:else}
            <Badge variant="warning">En préparation, invisible des adhérents</Badge>
          {/if}
        </div>
        {#if canWrite}
          <Button
            variant={item.published ? 'outline' : 'default'}
            size="sm"
            disabled={busy !== null}
            onclick={() => toggle(item)}
          >
            {#if item.published}
              <EyeOff class="w-4 h-4" /> Retirer
            {:else}
              <Eye class="w-4 h-4" /> Publier les effectifs
            {/if}
          </Button>
        {/if}
      </div>
    {/each}
  </div>
{/if}
