<script lang="ts">
  import { Button, Input, Label, FormSheet } from '@nba/ui';
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
    endpoint = '',
    titre = 'Jeu libre',
    sousTitre = ''
  } = $props<{
    sessionId: number;
    myGuests?: GuestName[] | null;
    open?: boolean;
    playerCount?: number;
    minPlayers?: number;
    /** Page à qui poster. Vide = la page courante, cas de l'espace adhérent. */
    endpoint?: string;
    /** De quelle séance parle le tiroir : sans elle, la feuille s'ouvre sur « Jeu libre » et rien d'autre. */
    titre?: string;
    sousTitre?: string;
  }>();

  const registered = $derived(myGuests !== null);

  // Copie et non référence : l'adhérent doit pouvoir saisir puis abandonner sans que la
  // carte au-dessus reflète une liste qu'il n'a pas enregistrée.
  let guests = $state<GuestName[]>((myGuests ?? []).map((guest) => ({ ...guest })));
  let busy = $state(false);
  let errorMsg = $state('');

  /**
   * L'inscription se prend **dans un tiroir**, comme tous les formulaires.
   *
   * Elle était dépliée sous chaque séance : deux champs par invité, un bouton pour en
   * ajouter et deux pour trancher, sur chacune des quinze lignes de l'agenda. Le
   * calendrier se lisait donc à travers les formulaires de tout le monde. La ligne ne
   * porte plus qu'un bouton, et dit ce qu'il fera.
   */
  let ouvert = $state(false);

  /* Rouvrir après un abandon ne doit pas rejouer la saisie abandonnée. */
  function ouvrir() {
    guests = (myGuests ?? []).map((guest) => ({ ...guest }));
    errorMsg = '';
    ouvert = true;
  }

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

{#if !open || (errorMsg && !ouvert)}
  <!--
    L'encart gris ne dit plus qu'une chose : les inscriptions sont closes, ou le refus
    du serveur. Le remplissage — « il manque deux joueurs pour ouvrir » — est dit une
    seule fois, sur la ligne de la séance ; il l'était ici aussi, mot pour mot.
  -->
  <div class="rounded-lg border border-border bg-muted/30 p-3">
    {#if !open}
      <p class="text-sm text-muted-foreground">
        {registered ? 'Vous étiez inscrit·e.' : 'Les inscriptions sont closes.'}
      </p>
    {/if}


    {#if errorMsg && !ouvert}
      <p class="mt-2 text-xs font-medium text-destructive" role="alert">{errorMsg}</p>
    {/if}
  </div>
{/if}

{#if open}
  <div class="mt-2">
    <!-- Une seule commande sur la ligne, et elle dit où elle mène. -->
    <Button onclick={ouvrir} disabled={busy} class="w-full font-bold sm:w-auto">
      {registered ? 'Gérer mon inscription' : 'Je viens'}
    </Button>

    {#if registered}
      <p class="mt-2 text-xs text-muted-foreground">
        Vous êtes inscrit·e{guests.length > 0
          ? ` avec ${guests.length} invité${guests.length > 1 ? 's' : ''}`
          : ''}.
      </p>
    {/if}
  </div>
{/if}

<!--
  Les deux ronds de la barre : la croix à gauche, la validation à droite — la
  disposition d'une modale iOS, la même que pour l'indiv.

  « Je ne viens plus » ne peut donc pas vivre dans le pied, que les ronds remplacent
  sous 768 px : il est posé en fin de formulaire, nommé, là où on le lit après avoir vu
  ce qu'on s'apprête à changer.
-->
<FormSheet
  bind:open={ouvert}
  title={titre}
  description={sousTitre || undefined}
  error={errorMsg || null}
  isSubmitting={busy}
  submitLabel={registered ? 'Mettre à jour' : 'Je viens'}
  submittingLabel="Un instant…"
  onSubmit={(e) => {
    e.preventDefault();
    void send('register');
  }}
>
  <p class="text-sm text-muted-foreground">
    Vous venez seul·e ? Validez. Sinon, ajoutez vos invités : leur nom permet à l'ouvreur
    de savoir qui entre.
  </p>

  {#if guests.length > 0}
    <div class="space-y-2">
      <Label class="block text-xs text-muted-foreground">Vos invités</Label>
      {#each guests as guest, index (index)}
        <div class="flex items-center gap-2">
          <Input
            bind:value={guests[index].firstName}
            placeholder="Prénom"
            aria-label={`Prénom de l'invité ${index + 1}`}
            class="flex-1"
          />
          <Input
            bind:value={guests[index].lastName}
            placeholder="Nom"
            aria-label={`Nom de l'invité ${index + 1}`}
            class="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            onclick={() => removeGuest(index)}
            disabled={busy}
            aria-label={`Retirer l'invité ${index + 1}`}
            class="px-3 text-muted-foreground"
          >
            ✕
          </Button>
        </div>
      {/each}
    </div>
  {/if}

  {#if guests.length < MAX_OPEN_PLAY_GUESTS}
    <Button type="button" variant="outline" onclick={addGuest} disabled={busy} >
      + Inviter quelqu'un
    </Button>
  {/if}

  {#if registered}
    <div class="border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        onclick={() => send('unregister')}
        disabled={busy}
        class="w-full"
      >
        {busy ? 'Un instant…' : 'Je ne viens plus'}
      </Button>
      <p class="mt-2 text-xs text-muted-foreground">
        L'ouvreur compte sur le nombre annoncé : prévenir vaut mieux que ne pas venir.
      </p>
    </div>
  {/if}
</FormSheet>
