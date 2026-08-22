<script lang="ts">
  import { Button, Input, Label } from '@nba/ui';
  import { MAX_OPEN_PLAY_GUESTS } from '../../../shared/open-play';

  type GuestName = { firstName: string; lastName: string };

  /**
   * Inscription d'un adhérent à une séance de jeu libre.
   *
   * Volontairement ignorant de l'endroit où il est posé : il reçoit l'identifiant de la
   * séance et l'état courant, il rend compte à la page qui le porte. C'est cette page qui
   * détient la session et impose l'identité de l'inscrit — l'îlot n'en connaît rien, et ne
   * pourrait donc pas inscrire quelqu'un d'autre même si on le lui demandait. Il ne
   * choisit que les invités.
   *
   * Il n'y a pas d'action « modifier » : « Mettre à jour » réémet une inscription, que
   * l'index unique (séance, adhérent) rend idempotente. C'est tout l'intérêt de l'upsert,
   * et c'est ce qui permet à la liste d'invités d'être remplacée plutôt que complétée.
   */
  let {
    sessionId,
    /** Mes invités, ou `null` si je ne suis pas inscrit — ce n'est pas la même chose qu'un tableau vide. */
    myGuests = null,
    /** Faux quand la séance est annulée ou passée : l'encart informe au lieu d'agir. */
    open = true,
    playerCount = 0,
    minPlayers = 4,
    endpoint = ''
  } = $props<{
    sessionId: number;
    myGuests?: GuestName[] | null;
    open?: boolean;
    playerCount?: number;
    minPlayers?: number;
    /** Page à qui poster. Vide = la page courante, cas de l'espace adhérent. */
    endpoint?: string;
  }>();

  const registered = $derived(myGuests !== null);

  // Copie et non référence : l'adhérent doit pouvoir saisir puis abandonner sans que la
  // carte au-dessus reflète une liste qu'il n'a pas enregistrée.
  let guests = $state<GuestName[]>((myGuests ?? []).map((guest) => ({ ...guest })));
  let busy = $state(false);
  let errorMsg = $state('');

  function addGuest() {
    if (guests.length < MAX_OPEN_PLAY_GUESTS) guests = [...guests, { firstName: '', lastName: '' }];
  }

  // Réassignation plutôt que `splice` : le tableau est la source de vérité, le rendu en
  // découle.
  function removeGuest(index: number) {
    guests = guests.filter((_, i) => i !== index);
  }

  async function send(action: 'register' | 'unregister') {
    if (action === 'register' && guests.some((g) => !g.firstName.trim() || !g.lastName.trim())) {
      // Même phrase que le refus du serveur : l'écran ne doit ni proposer ce que l'API
      // refuserait, ni le refuser pour une autre raison que la sienne.
      errorMsg = 'Renseignez le prénom et le nom de chaque invité, ou retirez la ligne.';
      return;
    }

    busy = true;
    errorMsg = '';

    try {
      const response = await fetch(endpoint || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId,
          guests: guests.map((g) => ({ firstName: g.firstName.trim(), lastName: g.lastName.trim() }))
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

      // Rechargement plutôt qu'une mise à jour locale : le compteur affiché à côté a bougé
      // pour tout le monde, et le seuil a pu être franchi entre-temps — auquel cas la
      // carte doit changer d'allure, pas seulement de chiffre.
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
      {registered ? 'Vous étiez inscrit·e.' : 'Les inscriptions sont closes.'}
    </p>
  {:else}
    <div class="space-y-3">
      {#if guests.length > 0}
        <div class="space-y-2">
          <Label class="block text-xs text-muted-foreground">
            Vos invités — leur nom permet à l'ouvreur de savoir qui entre.
          </Label>
          {#each guests as guest, index (index)}
            <div class="flex items-center gap-2">
              <Input
                bind:value={guests[index].firstName}
                placeholder="Prénom"
                aria-label={`Prénom de l'invité ${index + 1}`}
                class="min-h-[44px] flex-1"
              />
              <Input
                bind:value={guests[index].lastName}
                placeholder="Nom"
                aria-label={`Nom de l'invité ${index + 1}`}
                class="min-h-[44px] flex-1"
              />
              <Button
                variant="ghost"
                onclick={() => removeGuest(index)}
                disabled={busy}
                aria-label={`Retirer l'invité ${index + 1}`}
                class="min-h-[44px] px-3 text-muted-foreground"
              >
                ✕
              </Button>
            </div>
          {/each}
        </div>
      {/if}

      <div class="flex flex-wrap items-center gap-2">
        {#if guests.length < MAX_OPEN_PLAY_GUESTS}
          <Button variant="outline" onclick={addGuest} disabled={busy} class="min-h-[44px]">
            + Inviter quelqu'un
          </Button>
        {/if}

        <div class="ml-auto flex flex-wrap items-center gap-2">
          {#if registered}
            <Button variant="outline" onclick={() => send('unregister')} disabled={busy} class="min-h-[44px]">
              {busy ? 'Un instant…' : 'Je ne viens plus'}
            </Button>
            <Button onclick={() => send('register')} disabled={busy} class="min-h-[44px] font-bold">
              {busy ? 'Un instant…' : 'Mettre à jour'}
            </Button>
          {:else}
            <Button onclick={() => send('register')} disabled={busy} class="min-h-[44px] font-bold">
              {busy ? 'Un instant…' : 'Je viens'}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if playerCount > 0}
    <p class="mt-2 text-xs text-muted-foreground">
      {playerCount} joueur{playerCount > 1 ? 's' : ''} attendu{playerCount > 1 ? 's' : ''}
      {#if playerCount < minPlayers}
        · il en faut {minPlayers} pour ouvrir
      {/if}
    </p>
  {/if}

  {#if errorMsg}
    <p class="mt-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
  {/if}
</div>
