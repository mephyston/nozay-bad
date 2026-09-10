<script lang="ts">
  import { Button, Input, Label, Select } from '@nba/ui';

  type SlotWindow = { index: number; startTime: string; endTime: string };
  type MyRequest = { preferredSlot: number | null; note: string | null; selectedSlot: number | null };

  /**
   * Candidature d'un compétiteur à une soirée d'indiv.
   *
   * Volontairement ignorant de l'endroit où il est posé, comme l'inscription au jeu
   * libre : il reçoit la soirée et ma situation, il rend compte à la page qui le porte.
   * C'est cette page qui détient la session et impose l'identité du candidat — l'îlot ne
   * choisit qu'une préférence de créneau et un mot pour l'entraîneur.
   *
   * Trois écrans selon l'état : la soirée est ouverte (je candidate, je précise, je me
   * retire), les retenus sont annoncés (je lis ma réponse, et je peux encore me retirer
   * si je suis retenu·e), ou tout est clos.
   *
   * Les retours s'affichent dans l'îlot : l'espace adhérent ne monte pas de Toaster.
   */
  let {
    sessionId,
    slots = [],
    myRequest = null,
    status = 'open',
    open = true,
    endpoint = '/agenda'
  } = $props<{
    sessionId: number;
    slots?: SlotWindow[];
    /** Ma candidature, ou `null` si je n'ai pas demandé. */
    myRequest?: MyRequest | null;
    status?: 'open' | 'announced' | 'cancelled';
    /** Faux quand la soirée est annulée ou passée. */
    open?: boolean;
    /** Page qui porte le POST : l'agenda, même depuis l'accueil. */
    endpoint?: string;
  }>();

  const requested = $derived(myRequest !== null);
  const selectedWindow = $derived(
    myRequest?.selectedSlot ? (slots.find((s) => s.index === myRequest?.selectedSlot) ?? null) : null
  );

  // svelte-ignore state_referenced_locally
  let preferred = $state(myRequest?.preferredSlot ? String(myRequest.preferredSlot) : '');
  // svelte-ignore state_referenced_locally
  let note = $state(myRequest?.note ?? '');
  let busy = $state(false);
  let errorMsg = $state('');

  const h = (t: string) => t.replace(':', 'h');

  async function send(action: 'request' | 'withdraw') {
    busy = true;
    errorMsg = '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          indivId: sessionId,
          preferredSlot: preferred ? Number(preferred) : null,
          note: note.trim() || null
        })
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
      // Rechargement plutôt qu'une mise à jour locale : le compteur de la carte a bougé.
      window.location.reload();
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : "L'opération a échoué.";
      busy = false;
    }
  }
</script>

<div class="rounded-lg border border-border bg-muted/30 p-3">
  {#if status === 'announced'}
    {#if myRequest?.selectedSlot}
      <p class="text-sm font-semibold text-primary">
        Vous êtes retenu·e sur le créneau {myRequest.selectedSlot}{selectedWindow
          ? ` (${h(selectedWindow.startTime)}-${h(selectedWindow.endTime)})`
          : ''}.
      </p>
      <div class="mt-2 flex justify-end">
        <Button variant="outline" onclick={() => send('withdraw')} disabled={busy} class="min-h-[44px]">
          {busy ? 'Un instant…' : 'Je ne peux plus venir'}
        </Button>
      </div>
    {:else if requested}
      <p class="text-sm text-muted-foreground">
        Pas cette fois : les places sont allées à ceux qui en ont eu moins, ou aux plus jeunes.
        Recandidatez à la prochaine soirée.
      </p>
    {:else}
      <p class="text-sm text-muted-foreground">Les retenus ont été annoncés.</p>
    {/if}
  {:else if !open}
    <p class="text-sm text-muted-foreground">
      {requested ? 'Vous aviez candidaté.' : 'Les candidatures sont closes.'}
    </p>
  {:else}
    <div class="space-y-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <Label for={`indiv-slot-${sessionId}`} class="mb-1 block text-xs text-muted-foreground">Créneau souhaité</Label>
          <Select id={`indiv-slot-${sessionId}`} bind:value={preferred} class="min-h-[44px]">
            <option value="">Indifférent</option>
            {#each slots as slot (slot.index)}
              <option value={String(slot.index)}>
                {slot.index === 1 ? '1er' : `${slot.index}e`} créneau ({h(slot.startTime)}-{h(slot.endTime)})
              </option>
            {/each}
          </Select>
        </div>
        <div>
          <Label for={`indiv-note-${sessionId}`} class="mb-1 block text-xs text-muted-foreground">Un mot pour l'entraîneur (facultatif)</Label>
          <Input
            id={`indiv-note-${sessionId}`}
            bind:value={note}
            maxlength={200}
            placeholder="Travailler le service…"
            class="min-h-[44px]"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        {#if requested}
          <Button variant="outline" onclick={() => send('withdraw')} disabled={busy} class="min-h-[44px]">
            {busy ? 'Un instant…' : 'Me retirer'}
          </Button>
          <Button onclick={() => send('request')} disabled={busy} class="min-h-[44px] font-bold">
            {busy ? 'Un instant…' : 'Mettre à jour'}
          </Button>
        {:else}
          <Button onclick={() => send('request')} disabled={busy} class="min-h-[44px] font-bold">
            {busy ? 'Un instant…' : 'Je candidate'}
          </Button>
        {/if}
      </div>
    </div>
  {/if}

  {#if errorMsg}
    <p class="mt-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
  {/if}
</div>
