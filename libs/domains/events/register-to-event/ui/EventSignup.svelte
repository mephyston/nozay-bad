<script lang="ts">
  import { Button, Select, Label } from '@nba/ui';
  import { MAX_GUESTS } from '../../shared/event';

  /**
   * Bouton d'inscription d'un adhérent à un événement.
   *
   * Volontairement ignorant de l'endroit où il est posé : il reçoit l'identifiant de
   * l'événement et l'état courant, il rend compte à la page qui le porte. C'est cette
   * page — l'agenda de l'espace adhérent, ou une actualité qui annonce l'événement —
   * qui détient la session et impose l'identité de l'inscrit. L'îlot n'en connaît rien,
   * et ne pourrait donc pas inscrire quelqu'un d'autre même si on le lui demandait.
   */
  let {
    eventId,
    /** Accompagnants annoncés, ou `null` si l'adhérent n'est pas inscrit. */
    myGuests = null,
    /** Faux quand les inscriptions sont closes : l'encart informe au lieu d'agir. */
    open = true,
    attendeeCount = 0,
    endpoint = ''
  } = $props<{
    eventId: number;
    myGuests?: number | null;
    open?: boolean;
    attendeeCount?: number;
    /** Page à qui poster. Vide = la page courante, cas de l'agenda. */
    endpoint?: string;
  }>();

  const registered = $derived(myGuests !== null);

  let guests = $state(myGuests ?? 0);
  let busy = $state(false);
  let errorMsg = $state('');

  const GUEST_CHOICES = Array.from({ length: MAX_GUESTS + 1 }, (_, index) => index);

  function guestLabel(count: number): string {
    if (count === 0) return 'Je viens seul·e';
    return `Accompagné·e de ${count} personne${count > 1 ? 's' : ''}`;
  }

  async function send(action: 'register' | 'unregister') {
    busy = true;
    errorMsg = '';

    try {
      const response = await fetch(endpoint || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, eventId, guests })
      });

      if (!response.ok) {
        let message = "L'opération a échoué.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          /* message générique */
        }
        throw new Error(message);
      }

      // Rechargement plutôt qu'une mise à jour locale : les compteurs affichés à côté
      // ont bougé pour tout le monde, et rien ne garantit qu'ils n'aient bougé que de
      // notre fait pendant que la page était ouverte.
      window.location.reload();
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : "L'opération a échoué.";
      busy = false;
    }
  }
</script>

<div class="rounded-lg border border-border bg-muted/30 p-3">
  {#if !open}
    <p class="text-sm text-muted-foreground">
      {registered
        ? 'Les inscriptions sont closes. Vous êtes inscrit·e.'
        : 'Les inscriptions sont closes.'}
    </p>
  {:else if registered}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-foreground">
        Vous êtes inscrit·e{myGuests > 0
          ? ` avec ${myGuests} accompagnant${myGuests > 1 ? 's' : ''}`
          : ''}.
      </p>
      <Button variant="outline" onclick={() => send('unregister')} disabled={busy} class="min-h-[44px]">
        {busy ? 'Un instant…' : 'Me désinscrire'}
      </Button>
    </div>
  {:else}
    <div class="flex flex-wrap items-end gap-2">
      <div class="min-w-0 flex-1">
        <Label for={`guests-${eventId}`} class="mb-1 block text-xs text-muted-foreground">
          Venez-vous accompagné·e ?
        </Label>
        <Select id={`guests-${eventId}`} bind:value={guests}>
          {#each GUEST_CHOICES as count}
            <option value={count}>{guestLabel(count)}</option>
          {/each}
        </Select>
      </div>
      <Button onclick={() => send('register')} disabled={busy} class="min-h-[44px] font-bold">
        {busy ? 'Un instant…' : "Je m'inscris"}
      </Button>
    </div>
  {/if}

  {#if attendeeCount > 0}
    <p class="mt-2 text-xs text-muted-foreground">
      {attendeeCount} personne{attendeeCount > 1 ? 's' : ''} attendue{attendeeCount > 1 ? 's' : ''}.
    </p>
  {/if}

  {#if errorMsg}
    <p class="mt-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
  {/if}
</div>
