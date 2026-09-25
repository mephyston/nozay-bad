<script lang="ts">
  import { Button, ResponsiveSheet, ListView, ListRow } from '@nba/ui';
  import { Users } from '@lucide/svelte';

  /**
   * « Qui vient ? » d'un rendez-vous, déplié à la demande.
   *
   * Le pendant exact du bouton du jeu libre (`OpenPlayAttendees`) : même intitulé, même
   * feuille qui monte du bas, pour qu'un adhérent lise un stage ou une soirée comme une
   * séance. Chargé au clic et non avec la page : faire descendre tous les noms de
   * l'agenda à chaque affichage serait lourd, et indiscret pour ceux que personne n'est
   * venu chercher.
   *
   * L'inscription à un rendez-vous ne nomme pas les accompagnants, elle les compte : la
   * ligne dit donc « +2 », sans noms.
   */

  interface Attendee { firstName: string; lastName: string; guests: number }

  let { eventId, attendeeCount = 0, titre = '', endpoint = '' } = $props<{
    eventId: number;
    /** Personnes attendues, accompagnants compris : le chiffre que l'encart affiche déjà. */
    attendeeCount?: number;
    /** Le rendez-vous, rappelé en tête de la feuille. */
    titre?: string;
    endpoint?: string;
  }>();

  let open = $state(false);
  let busy = $state(false);
  let errorMsg = $state('');
  let attendees = $state<Attendee[] | null>(null);

  async function ouvrir() {
    open = true;
    // Relu à chaque ouverture : entre deux dépliages, quelqu'un a pu s'inscrire.
    busy = true;
    errorMsg = '';

    try {
      const response = await fetch(endpoint || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attendees', eventId })
      });
      if (!response.ok) throw new Error('Liste indisponible.');
      const payload = (await response.json()) as { data?: { attendees: Attendee[] } };
      attendees = payload.data?.attendees ?? [];
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : 'Liste indisponible.';
      attendees = null;
    } finally {
      busy = false;
    }
  }
</script>

{#if attendeeCount > 0}
  <div class="mt-2">
    <Button variant="outline" onclick={ouvrir} disabled={busy} class="w-full gap-2 sm:w-auto">
      <Users class="size-4" />
      Voir qui vient ({attendeeCount})
    </Button>
  </div>

  <ResponsiveSheet
    bind:open
    size="sm"
    title="Qui vient ?"
    description={`${titre ? `${titre} — ` : ''}${attendeeCount} personne${attendeeCount > 1 ? 's' : ''} attendue${attendeeCount > 1 ? 's' : ''}.`}
  >
    {#if busy}
      <p class="py-6 text-center text-sm text-muted-foreground">Un instant…</p>
    {:else if errorMsg}
      <p class="py-6 text-center text-sm font-medium text-destructive" role="alert">{errorMsg}</p>
    {:else if attendees && attendees.length > 0}
      <ListView items={attendees} emptyTitle="Personne pour l'instant" emptyDescription="Soyez le premier à vous inscrire.">
        {#snippet listRow(attendee)}
          <ListRow
            title={`${attendee.firstName} ${attendee.lastName}`}
            subtitle={attendee.guests > 0
              ? `avec ${attendee.guests} accompagnant${attendee.guests > 1 ? 's' : ''}`
              : undefined}
            value={attendee.guests > 0 ? `+${attendee.guests}` : undefined}
          />
        {/snippet}
      </ListView>
    {:else}
      <p class="py-6 text-center text-sm text-muted-foreground">Personne pour l'instant.</p>
    {/if}
  </ResponsiveSheet>
{/if}
