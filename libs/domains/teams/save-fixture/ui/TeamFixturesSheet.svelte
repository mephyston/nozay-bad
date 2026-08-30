<script lang="ts">
  import { Sheet, Button, Input, Badge, toast } from '@nba/ui';
  import { CalendarX } from '@lucide/svelte';
  import type { GetTeamOutput } from '../../get-team/dto';

  let {
    open = $bindable(false),
    detail,
    canWrite,
    onSaved,
    endpoint = '/admin/api/teams/teams'
  }: {
    open: boolean;
    detail: GetTeamOutput | null;
    canWrite: boolean;
    onSaved: () => void;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  /** Une ligne éditable par rencontre du calendrier. */
  type Draft = {
    number: number;
    dayId: number;
    slot: number;
    /** Transmis inchangés : `saveFixture` réécrit la rencontre entière. */
    home: boolean;
    status: 'scheduled' | 'bye' | 'forfeit';
    heading: string;
    weekStart: string;
    playedAt: string;
    venue: string;
    opponent: string;
  };

  let drafts = $state<Draft[]>([]);
  let saving = $state(false);

  $effect(() => {
    if (!open || !detail) return;
    drafts = detail.calendar.map((day) => ({
      number: day.number,
      dayId: day.dayId,
      slot: day.slot,
      home: day.home,
      status: day.status,
      heading: [day.label ?? `Journée ${day.number}`, day.fixtureLabel].filter(Boolean).join(' · '),
      weekStart: day.weekStart,
      // `datetime-local` n'accepte ni fuseau ni secondes : on tronque à la minute.
      playedAt: day.playedAt ? day.playedAt.slice(0, 16) : '',
      venue: day.venue ?? '',
      opponent: day.opponent ?? ''
    }));
  });

  const frenchDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', timeZone: 'UTC'
    });

  /** Ce que le formulaire modifie réellement, pour n'envoyer que les lignes touchées. */
  function changed(draft: Draft): boolean {
    const day = detail?.calendar.find((d) => d.number === draft.number && d.slot === draft.slot);
    if (!day) return false;
    return (
      (day.playedAt ? day.playedAt.slice(0, 16) : '') !== draft.playedAt ||
      (day.venue ?? '') !== draft.venue.trim() ||
      (day.opponent ?? '') !== draft.opponent.trim()
    );
  }

  async function save() {
    if (!detail) return;
    const touched = drafts.filter(changed);
    if (touched.length === 0) {
      open = false;
      return;
    }

    saving = true;
    try {
      /*
       * Une requête par rencontre : l'API expose `PUT /teams/:id/fixtures`, qui traite
       * une rencontre à la fois. Le calendrier régional compte au plus douze lignes et
       * l'on n'envoie que celles qui ont changé — un envoi groupé n'apporterait rien
       * qu'une route de plus à maintenir.
       */
      for (const draft of touched) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save-fixture',
            teamId: detail.id,
            dayId: draft.dayId,
            slot: draft.slot,
            playedAt: draft.playedAt || null,
            venue: draft.venue.trim() || null,
            opponent: draft.opponent.trim() || null,
            // Réécrits à l'identique : sans eux, une rencontre au repos ou à
            // l'extérieur repasserait en « programmée à domicile ».
            home: draft.home,
            status: draft.status
          })
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || `Enregistrement refusé pour ${draft.heading}.`);
        }
      }

      toast.success(
        touched.length === 1 ? 'Rencontre enregistrée.' : `${touched.length} rencontres enregistrées.`
      );
      open = false;
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'enregistrement a échoué.");
    } finally {
      saving = false;
    }
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="w-full sm:max-w-2xl flex flex-col">
    {#if detail}
      <Sheet.Header>
        <Sheet.Title>Rencontres — {detail.name}</Sheet.Title>
        <Sheet.Description>
          {detail.championshipLabel} · {detail.divisionLabel}
        </Sheet.Description>
      </Sheet.Header>

      <div class="flex-1 overflow-y-auto space-y-3 py-2">
        <p class="text-xs text-muted-foreground">
          La semaine de chaque journée est fixée par le comité et ne change pas — c'est elle
          qui porte les règles de composition. La date ci-dessous ne concerne que cette
          équipe, et peut en sortir en cas de report.
        </p>

        <ul class="divide-y rounded-lg border">
          {#each drafts as draft (`${draft.number}-${draft.slot}`)}
            <li class="p-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium">{draft.heading}</p>
                <Badge variant="outline" class="shrink-0">
                  semaine du {frenchDate(draft.weekStart)}
                </Badge>
              </div>

              {#if canWrite}
                <div class="grid gap-2 sm:grid-cols-3">
                  <Input
                    type="datetime-local"
                    bind:value={draft.playedAt}
                    disabled={saving}
                    aria-label={`Date de ${draft.heading}`}
                  />
                  <Input
                    bind:value={draft.venue}
                    disabled={saving}
                    placeholder="Gymnase"
                    aria-label={`Gymnase de ${draft.heading}`}
                  />
                  <Input
                    bind:value={draft.opponent}
                    disabled={saving}
                    placeholder="Équipe adverse"
                    aria-label={`Adversaire de ${draft.heading}`}
                  />
                </div>
              {:else}
                <p class="text-xs text-muted-foreground">
                  {draft.playedAt ? draft.playedAt.replace('T', ' à ') : 'Date non fixée'}
                  {draft.venue ? ` · ${draft.venue}` : ''}
                  {draft.opponent ? ` · contre ${draft.opponent}` : ''}
                </p>
              {/if}
            </li>
          {:else}
            <li class="p-4 text-sm text-muted-foreground flex items-center gap-2">
              <CalendarX class="w-4 h-4" />
              Le calendrier de ce championnat n'est pas encore saisi.
            </li>
          {/each}
        </ul>
      </div>

      <Sheet.Footer>
        <Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
        {#if canWrite && drafts.length > 0}
          <Button onclick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        {/if}
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
