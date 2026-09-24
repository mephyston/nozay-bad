<script lang="ts">
  import { Button, ResponsiveSheet, ListView, ListRow } from '@nba/ui';
  import { Users } from '@lucide/svelte';

  /**
   * « Qui vient ? », déplié à la demande.
   *
   * Chargé au clic et non avec la page : une liste de séances en compte facilement
   * cinquante, et faire descendre tous les noms à chaque affichage serait à la fois
   * lourd et indiscret pour ceux que personne n'est venu chercher.
   *
   * Comme les autres îlots du jeu libre, il ignore l'identité : la page qui le porte
   * détient la session, lui ne fait que demander et afficher.
   */

  interface GuestName { firstName: string; lastName: string }
  interface Attendee { firstName: string; lastName: string; guests: GuestName[] }

  let { sessionId, playerCount = 0, endpoint = '' } = $props<{
    sessionId: number;
    playerCount?: number;
    endpoint?: string;
  }>();

  let open = $state(false);
  let busy = $state(false);
  let errorMsg = $state('');
  let attendees = $state<Attendee[] | null>(null);

  /**
   * La liste s'ouvre **en feuille**, et non plus en repli sous un bouton fantôme.
   *
   * « Voir qui vient » était un bouton gris de huit pixels de haut, sans bordure, posé
   * sous l'encart : personne ne le voyait. Il est maintenant nommé, compté et cerclé,
   * et la liste monte du bas comme tout le reste — un dépli de vingt noms au milieu
   * d'un calendrier repoussait les séances suivantes hors de l'écran.
   */
  async function toggle() {
    if (open) {
      open = false;
      return;
    }
    open = true;
    // Relu à chaque ouverture : entre deux dépliages, quelqu'un a pu s'inscrire.
    busy = true;
    errorMsg = '';

    try {
      const response = await fetch(endpoint || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attendees', sessionId })
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

{#if playerCount > 0}
  <div class="mt-2">
    <Button
      variant="outline"
      onclick={toggle}
      disabled={busy}
      class="min-h-[44px] w-full gap-2 sm:w-auto"
    >
      <Users class="size-4" />
      Voir qui vient ({playerCount})
    </Button>
  </div>

  <ResponsiveSheet
    bind:open
    size="sm"
    title="Qui vient ?"
    description={`${playerCount} joueur${playerCount > 1 ? 's' : ''} attendu${playerCount > 1 ? 's' : ''} sur cette séance.`}
  >
    {#if busy}
      <p class="py-6 text-center text-sm text-muted-foreground">Un instant…</p>
    {:else if errorMsg}
      <p class="py-6 text-center text-sm font-medium text-destructive" role="alert">{errorMsg}</p>
    {:else if attendees && attendees.length > 0}
      <ListView
        items={attendees}
        emptyTitle="Personne pour l'instant"
        emptyDescription="Soyez le premier à vous inscrire."
      >
        {#snippet listRow(attendee)}
          <ListRow
            title={`${attendee.firstName} ${attendee.lastName}`}
            subtitle={attendee.guests.length > 0
              ? `avec ${attendee.guests.map((guest: GuestName) => `${guest.firstName} ${guest.lastName}`).join(', ')}`
              : undefined}
            value={attendee.guests.length > 0 ? `+${attendee.guests.length}` : undefined}
          />
        {/snippet}
      </ListView>
    {:else}
      <p class="py-6 text-center text-sm text-muted-foreground">Personne pour l'instant.</p>
    {/if}
  </ResponsiveSheet>
{/if}
