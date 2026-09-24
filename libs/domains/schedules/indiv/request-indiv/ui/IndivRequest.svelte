<script lang="ts">
  import { Button, Input, FormField, ChoiceField, FormSheet } from '@nba/ui';

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
    endpoint = '/agenda',
    titre = 'Séance individuelle',
    sousTitre = ''
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
    /** De quelle soirée parle le tiroir. */
    titre?: string;
    sousTitre?: string;
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

  /**
   * La candidature se prend **dans un tiroir**, comme tous les formulaires.
   *
   * Elle était dépliée dans la carte de la soirée : une liste déroulante, un champ libre
   * et deux boutons, sous les créneaux qu'on venait lire. La carte ne porte plus qu'une
   * commande, et dit ce qu'elle fera.
   */
  let ouvert = $state(false);

  function ouvrir() {
    preferred = myRequest?.preferredSlot ? String(myRequest.preferredSlot) : '';
    note = myRequest?.note ?? '';
    errorMsg = '';
    ouvert = true;
  }

  const h = (t: string) => t.replace(':', 'h');

  /* « Indifférent » d'abord : c'est la réponse la plus fréquente, et la seule qui n'engage à rien. */
  const optionsDeCreneau = $derived([
    { value: '', label: 'Indifférent' },
    ...slots.map((slot: SlotWindow) => ({
      value: String(slot.index),
      label: `${slot.index === 1 ? '1er' : `${slot.index}e`} créneau (${h(slot.startTime)}-${h(slot.endTime)})`
    }))
  ]);

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
    <!-- Une seule commande sur la carte, et elle dit où elle mène. -->
    <Button onclick={ouvrir} disabled={busy} class="min-h-[44px] w-full font-bold sm:w-auto">
      {requested ? 'Gérer ma candidature' : 'Je candidate'}
    </Button>

    {#if requested}
      <p class="mt-2 text-xs text-muted-foreground">
        Candidature envoyée{myRequest?.preferredSlot
          ? ` · ${myRequest.preferredSlot === 1 ? '1er' : `${myRequest.preferredSlot}e`} créneau souhaité`
          : ' · créneau indifférent'}.
      </p>
    {/if}
  {/if}

  {#if errorMsg}
    <p class="mt-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
  {/if}
</div>

<!--
  `namedActions` : « Me retirer » rend une place à quelqu'un d'autre et l'entraîneur
  compose sa soirée avec ce qu'on lui annonce. Un rond ne nomme pas ce qu'il fait.
-->
<FormSheet
  bind:open={ouvert}
  namedActions
  title={titre}
  description={sousTitre || undefined}
  error={errorMsg || null}
  isSubmitting={busy}
  submitLabel={requested ? 'Mettre à jour' : 'Je candidate'}
  submittingLabel="Un instant…"
  onSubmit={(e) => {
    e.preventDefault();
    void send('request');
  }}
>
  <p class="text-sm text-muted-foreground">
    L'entraîneur compose la soirée et annonce les retenus la veille. Candidater ne
    garantit pas une place.
  </p>

  <FormField id={`indiv-slot-${sessionId}`} label="Créneau souhaité">
    <ChoiceField
      id={`indiv-slot-${sessionId}`}
      label="Créneau souhaité"
      options={optionsDeCreneau}
      bind:value={preferred}
    />
  </FormField>

  <FormField
    id={`indiv-note-${sessionId}`}
    label="Un mot pour l'entraîneur"
    hint="Facultatif — ce que vous aimeriez travailler."
  >
    <Input
      id={`indiv-note-${sessionId}`}
      bind:value={note}
      maxlength={200}
      placeholder="Travailler le service…"
      class="min-h-[44px]"
    />
  </FormField>

  {#snippet footer(formId)}
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {#if requested}
        <Button
          type="button"
          variant="outline"
          onclick={() => send('withdraw')}
          disabled={busy}
          class="min-h-[44px] w-full sm:w-auto"
        >
          {busy ? 'Un instant…' : 'Me retirer'}
        </Button>
      {/if}
      <Button type="submit" form={formId} disabled={busy} class="min-h-[44px] w-full font-bold sm:w-auto">
        {busy ? 'Un instant…' : requested ? 'Mettre à jour' : 'Je candidate'}
      </Button>
    </div>
  {/snippet}
</FormSheet>
