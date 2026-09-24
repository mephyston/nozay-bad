<script lang="ts">
  import { Button, ChoiceField, FormField, FormSheet } from '@nba/ui';
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
    endpoint = '',
    titre = 'Inscription',
    sousTitre = ''
  } = $props<{
    eventId: number;
    myGuests?: number | null;
    open?: boolean;
    attendeeCount?: number;
    /** Page à qui poster. Vide = la page courante, cas de l'agenda. */
    endpoint?: string;
    /** De quel rendez-vous parle le tiroir : sans lui, la feuille s'ouvre sur « Inscription » et rien d'autre. */
    titre?: string;
    sousTitre?: string;
  }>();

  const registered = $derived(myGuests !== null);

  let busy = $state(false);
  let errorMsg = $state('');

  const GUEST_CHOICES = Array.from({ length: MAX_GUESTS + 1 }, (_, index) => index);

  function guestLabel(count: number): string {
    if (count === 0) return 'Je viens seul·e';
    return `Accompagné·e de ${count} personne${count > 1 ? 's' : ''}`;
  }

  /* `ChoiceField` parle en chaînes ; le nombre d'accompagnants reste un nombre. */
  const optionsDAccompagnants = GUEST_CHOICES.map((count) => ({
    value: String(count),
    label: guestLabel(count)
  }));
  let accompagnants = $state('0');

  /**
   * L'inscription se prend **dans un tiroir**, comme celles du jeu libre et de l'indiv.
   *
   * Elle était dépliée sous chaque rendez-vous : une liste déroulante et deux boutons
   * sur chacune des lignes de l'agenda, qui se lisait donc à travers les formulaires de
   * tout le monde. La ligne ne porte plus qu'une commande, et dit ce qu'elle fera.
   */
  let ouvert = $state(false);

  /* Rouvrir après un abandon repart de l'état enregistré, non de la saisie abandonnée. */
  function ouvrir() {
    accompagnants = String(myGuests ?? 0);
    errorMsg = '';
    ouvert = true;
  }

  async function send(action: 'register' | 'unregister') {
    busy = true;
    errorMsg = '';

    try {
      const response = await fetch(endpoint || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, eventId, guests: Number(accompagnants) })
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

{#if !open || attendeeCount > 0 || (errorMsg && !ouvert)}
  <!--
    L'encart gris dit un **état** : les inscriptions sont closes, ou combien de monde
    est attendu. Une commande posée dedans se lit comme une étiquette de plus.
  -->
  <div class="rounded-lg border border-border bg-muted/30 p-3">
    {#if !open}
      <p class="text-sm text-muted-foreground">
        {registered
          ? 'Les inscriptions sont closes. Vous êtes inscrit·e.'
          : 'Les inscriptions sont closes.'}
      </p>
    {/if}

    {#if attendeeCount > 0}
      <p class="text-xs text-muted-foreground" class:mt-2={!open}>
        {attendeeCount} personne{attendeeCount > 1 ? 's' : ''} attendue{attendeeCount > 1 ? 's' : ''}.
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
    <Button onclick={ouvrir} disabled={busy} class="min-h-[44px] w-full font-bold sm:w-auto">
      {registered ? 'Gérer mon inscription' : "Je m'inscris"}
    </Button>

    {#if registered}
      <p class="mt-2 text-xs text-muted-foreground">
        Vous êtes inscrit·e{myGuests > 0
          ? ` avec ${myGuests} accompagnant${myGuests > 1 ? 's' : ''}`
          : ''}.
      </p>
    {/if}
  </div>
{/if}

<!--
  Les deux ronds de la barre : la croix à gauche, la validation à droite. « Me
  désinscrire » ne peut donc pas vivre dans le pied, que les ronds remplacent sous
  768 px : il est posé en fin de formulaire, nommé, là où on le lit après avoir vu ce
  qu'on s'apprête à changer.
-->
<FormSheet
  bind:open={ouvert}
  title={titre}
  description={sousTitre || undefined}
  error={errorMsg || null}
  isSubmitting={busy}
  submitLabel={registered ? 'Mettre à jour' : "Je m'inscris"}
  submittingLabel="Un instant…"
  onSubmit={(e) => {
    e.preventDefault();
    void send('register');
  }}
>
  <FormField id={`guests-${eventId}`} label="Venez-vous accompagné·e ?">
    <ChoiceField
      id={`guests-${eventId}`}
      label="Venez-vous accompagné·e ?"
      options={optionsDAccompagnants}
      bind:value={accompagnants}
    />
  </FormField>

  {#if registered}
    <div class="border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        onclick={() => send('unregister')}
        disabled={busy}
        class="min-h-[44px] w-full"
      >
        {busy ? 'Un instant…' : 'Me désinscrire'}
      </Button>
      <p class="mt-2 text-xs text-muted-foreground">
        Votre place et celles de vos accompagnants sont rendues au groupe.
      </p>
    </div>
  {/if}
</FormSheet>
