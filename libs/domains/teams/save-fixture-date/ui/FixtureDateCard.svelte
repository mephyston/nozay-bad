<script lang="ts">
  import { Button, Input, Alert } from '@nba/ui';
  import { CalendarClock, TriangleAlert, CircleCheck, Info } from '@lucide/svelte';
  import type { GetLineupOutput } from '../../get-lineup/dto';

  let {
    lineup,
    onSaved
  }: {
    lineup: GetLineupOutput;
    /**
     * Facultatif : une page Astro sérialise les props d'une île en JSON et ne peut donc
     * pas transmettre de fonction. Exiger ce rappel faisait lever « onSaved is not a
     * function » au premier enregistrement, alors que la page n'avait rien à en faire.
     */
    onSaved?: (playedAt: string | null, venue: string | null) => void;
  } = $props();

  let playedAt = $state(lineup.playedAt ?? '');
  let venue = $state(lineup.venue ?? '');
  let saving = $state(false);
  let feedback = $state<{ kind: 'success' | 'error' | 'warning'; message: string } | null>(null);
  /** Devient vrai quand le serveur a refusé une date hors semaine : le second envoi confirme. */
  let confirmOutsideWeek = $state(false);

  const frenchDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
    });

  async function save() {
    saving = true;
    feedback = null;
    try {
      const response = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-fixture-date',
          playedAt: playedAt || null,
          venue: venue.trim() || null,
          confirmOutsideWeek
        })
      });
      const payload = (await response.json()) as {
        data?: { playedAt: string | null; venue: string | null; outsideTheoreticalWeek: boolean; matchDay: string };
        error?: string;
      };

      if (!response.ok) {
        // Le refus d'une date hors semaine n'est pas définitif : il demande un aveu.
        confirmOutsideWeek = true;
        throw new Error(payload.error || "L'enregistrement a échoué.");
      }

      confirmOutsideWeek = false;
      const data = payload.data!;
      feedback = data.outsideTheoreticalWeek
        ? {
            kind: 'warning',
            message:
              'Date enregistrée hors de la semaine théorique. La journée, elle, reste inchangée : les règles de composition continuent de s’appliquer sur sa semaine.'
          }
        : data.matchDay === 'unusual'
          ? { kind: 'warning', message: 'Date enregistrée. Ce jour n’est pas celui où ce championnat se joue habituellement.' }
          : { kind: 'success', message: 'Date de la rencontre enregistrée.' };

      onSaved?.(data.playedAt, data.venue);
    } catch (error) {
      feedback = {
        kind: 'error',
        message: error instanceof Error ? error.message : "L'enregistrement a échoué."
      };
    } finally {
      saving = false;
    }
  }
</script>

<div class="rounded-lg border p-4 space-y-3">
  <div class="flex items-start gap-2">
    <CalendarClock class="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p class="font-semibold text-sm">Date de la rencontre</p>
      <p class="text-xs text-muted-foreground">
        Semaine de la journée : du {frenchDate(lineup.weekStart)} au {frenchDate(lineup.weekEnd)}.
        Cette semaine est fixée par le comité et ne change pas — c'est elle qui porte les
        règles de composition. La date ci-dessous ne concerne que votre équipe.
      </p>
    </div>
  </div>

  {#if lineup.canEdit}
    <div class="grid gap-2 sm:grid-cols-2">
      <div class="min-w-0 space-y-1">
        <label for="played-at" class="text-xs font-medium">Date et heure</label>
        <Input id="played-at" type="datetime-local" bind:value={playedAt} disabled={saving} />
      </div>
      <div class="min-w-0 space-y-1">
        <label for="venue" class="text-xs font-medium">Gymnase</label>
        <Input id="venue" bind:value={venue} disabled={saving} placeholder="Facultatif" />
      </div>
    </div>
  {:else if lineup.playedAt}
    <p class="text-sm">
      {frenchDate(lineup.playedAt.slice(0, 10))} à {lineup.playedAt.slice(11, 16)}
      {lineup.venue ? ` — ${lineup.venue}` : ''}
    </p>
  {:else}
    <p class="text-sm text-muted-foreground">Le capitaine n'a pas encore fixé la date.</p>
  {/if}

  {#if lineup.outsideTheoreticalWeek}
    <Alert.Root variant="warning">
      <TriangleAlert class="w-4 h-4" />
      <Alert.Description>
        Cette rencontre est reportée hors de la semaine de sa journée. La journée reste la
        même : les règles de valeur et de composition s'appliquent toujours sur sa semaine.
      </Alert.Description>
    </Alert.Root>
  {/if}

  {#if feedback}
    <Alert.Root
      variant={feedback.kind === 'success' ? 'success' : feedback.kind === 'warning' ? 'warning' : 'destructive'}
    >
      {#if feedback.kind === 'success'}
        <CircleCheck class="w-4 h-4" />
      {:else if feedback.kind === 'warning'}
        <Info class="w-4 h-4" />
      {:else}
        <TriangleAlert class="w-4 h-4" />
      {/if}
      <Alert.Description>{feedback.message}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if lineup.canEdit}
    <div class="flex justify-end">
      <Button variant="outline" size="sm" onclick={save} disabled={saving}>
        {saving ? 'Enregistrement…' : confirmOutsideWeek ? 'Confirmer le report' : 'Enregistrer la date'}
      </Button>
    </div>
  {/if}
</div>
