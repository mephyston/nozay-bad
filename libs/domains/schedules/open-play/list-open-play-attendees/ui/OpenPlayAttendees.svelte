<script lang="ts">
  import { Button } from '@nba/ui';

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
      variant="ghost"
      onclick={toggle}
      disabled={busy}
      aria-expanded={open}
      class="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      {open ? 'Masquer les inscrits' : 'Voir qui vient'}
    </Button>

    {#if open}
      {#if busy}
        <p class="mt-1 px-2 text-xs text-muted-foreground">Un instant…</p>
      {:else if errorMsg}
        <p class="mt-1 px-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
      {:else if attendees && attendees.length > 0}
        <ul class="mt-1 space-y-1 px-2">
          {#each attendees as attendee, index (index)}
            <li class="text-xs text-foreground">
              {attendee.firstName} {attendee.lastName}
              {#if attendee.guests.length > 0}
                <span class="text-muted-foreground">
                  · avec {attendee.guests
                    .map((guest) => `${guest.firstName} ${guest.lastName}`)
                    .join(', ')}
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="mt-1 px-2 text-xs text-muted-foreground">Personne pour l'instant.</p>
      {/if}
    {/if}
  </div>
{/if}
