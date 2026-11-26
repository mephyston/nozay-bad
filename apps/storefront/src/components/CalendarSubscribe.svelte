<script lang="ts">
  import { CalendarPlus } from '@lucide/svelte';
  import { Sheet } from '@nba/ui';
  import { androidBrowserLink, calendarMailLink, isAndroid, type CalendarLinks } from '../lib/calendar-feed';

  /**
   * L'abonnement du profil actif à son agenda.
   *
   * L'état n'est lu qu'à l'ouverture : la page Calendrier n'a pas à payer une lecture de
   * base à chaque affichage pour un bouton qu'on n'utilise qu'une fois. L'adresse ne se
   * montre qu'à sa création — seule son empreinte est gardée —, d'où « Remplacer » plutôt
   * que « Revoir » quand elle existe déjà.
   */
  interface Props {
    firstName: string;
  }

  let { firstName }: Props = $props();

  const ENDPOINT = '/api/agenda/abonnement';

  let open = $state(false);
  let loading = $state(false);
  let error = $state('');
  let subscribed = $state<boolean | null>(null);
  let links = $state<CalendarLinks | null>(null);
  let confirming = $state<'replace' | 'stop' | null>(null);
  let copied = $state(false);
  // Lu à l'ouverture, jamais au rendu serveur : le tiroir n'existe qu'au navigateur.
  let android = $state(false);

  async function call(method: string): Promise<any> {
    loading = true;
    error = '';
    try {
      const res = await fetch(ENDPOINT, { method, headers: { 'Content-Type': 'application/json' } });
      const json = (await res.json()) as any;
      if (!res.ok || !json.ok) throw new Error(json.error || 'Abonnement indisponible.');
      return json;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Abonnement indisponible.';
      return null;
    } finally {
      loading = false;
    }
  }

  async function load() {
    const json = await call('GET');
    if (json) subscribed = json.subscribed;
  }

  function onOpenChange(next: boolean) {
    open = next;
    if (!next) {
      // L'adresse secrète ne reste pas à l'écran une fois le tiroir refermé.
      links = null;
      confirming = null;
      copied = false;
      subscribed = null;
      error = '';
    } else {
      android = typeof navigator !== 'undefined' && isAndroid(navigator.userAgent);
      void load();
    }
  }

  async function create() {
    const json = await call('POST');
    if (json) {
      links = json.links;
      subscribed = true;
      confirming = null;
    }
  }

  async function stop() {
    const json = await call('DELETE');
    if (json) {
      links = null;
      subscribed = false;
      confirming = null;
    }
  }

  async function copy() {
    if (!links) return;
    try {
      await navigator.clipboard.writeText(links.feed);
      copied = true;
    } catch {
      error = "La copie a échoué : sélectionnez l'adresse à la main.";
    }
  }

  const button = 'inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-50';
  const primary = `${button} bg-primary text-primary-foreground`;
  const secondary = `${button} border border-border bg-card text-foreground`;
</script>

<!-- Une simple icône à côté du titre : son nom passe par aria-label, et par title au survol. -->
<button
  type="button"
  class="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
  aria-label="S'abonner depuis mon agenda"
  title="S'abonner depuis mon agenda"
  data-testid="calendar-subscribe"
  onclick={() => onOpenChange(true)}
>
  <CalendarPlus class="size-5" aria-hidden="true" />
</button>

<Sheet.Root {open} {onOpenChange}>
  <Sheet.Content side="bottom" class="max-h-[90dvh] gap-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" data-testid="calendar-sheet">
    <Sheet.Header class="p-0 pr-10">
      <Sheet.Title>L'agenda de {firstName} dans votre calendrier</Sheet.Title>
      <Sheet.Description>
        Les rendez-vous du club, ainsi que les rencontres d'interclubs et les inscriptions au jeu libre de
        {firstName}, s'ajoutent à Google Agenda, Apple Calendrier ou Outlook, et suivent les changements.
      </Sheet.Description>
    </Sheet.Header>

    <div class="space-y-3 text-sm">
      {#if error}
        <p class="rounded-lg border border-destructive/40 p-3 text-destructive" role="alert">{error}</p>
      {/if}

      {#if links && android}
        <!--
          Android : l'application Google Agenda ne sait pas s'abonner à une adresse et intercepte le
          lien ?cid= sans rien en faire ; webcal:// n'y ouvre rien. L'abonnement passe par le site,
          en version ordinateur, puis la synchronisation s'active dans l'application.
        -->
        <p class="font-medium text-foreground">Votre adresse est prête. Sur Android, l'abonnement se fait une fois, sur le site de Google Agenda :</p>
        <ol class="list-decimal space-y-3 pl-5" data-testid="calendar-android-steps">
          <li class="space-y-2">
            <span>Copiez l'adresse.</span>
            <button type="button" class={primary} onclick={copy} data-testid="calendar-copy">
              {copied ? 'Adresse copiée' : "Copier l'adresse"}
            </button>
          </li>
          <li class="space-y-2">
            <span>
              Ouvrez la page « Ajouter à partir de l'URL » de Google, collez l'adresse, puis touchez « Ajouter un agenda ».
              Si Google vous renvoie vers l'application ou n'affiche pas ce champ, cochez « Version pour ordinateur » dans le menu ⋮ de Chrome.
            </span>
            <a href={androidBrowserLink()} class={secondary} data-testid="calendar-android-google">Ouvrir Google Agenda dans Chrome</a>
          </li>
          <li>
            Dans l'application Google Agenda : menu ☰, Paramètres, touchez le nom du nouvel agenda, puis activez « Synchroniser ».
            Sans cela, ses rendez-vous n'apparaissent pas sur le téléphone.
          </li>
        </ol>
        <p class="text-muted-foreground">Plus simple depuis un ordinateur ? Envoyez-vous l'adresse : elle ne sera plus affichée ici.</p>
        <a href={calendarMailLink(links.feed, firstName)} class={secondary} data-testid="calendar-mail">M'envoyer l'adresse par e-mail</a>
        <p class="break-all rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground" data-testid="calendar-address">{links.feed}</p>
      {:else if links}
        <p class="font-medium text-foreground">Votre adresse est prête : choisissez votre application.</p>
        <a href={links.google} target="_blank" rel="noopener noreferrer" class={primary}>Google Agenda</a>
        <a href={links.webcal} class={secondary}>Apple Calendrier, Outlook</a>
        <button type="button" class={secondary} onclick={copy} data-testid="calendar-copy">
          {copied ? 'Adresse copiée' : "Copier l'adresse"}
        </button>
        <p class="break-all rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground" data-testid="calendar-address">{links.feed}</p>
        <p class="text-muted-foreground">Cette adresse ne sera plus affichée.</p>
      {:else if subscribed === false}
        <button type="button" class={primary} disabled={loading} onclick={create} data-testid="calendar-create">
          Créer mon adresse d'abonnement
        </button>
      {:else if subscribed === true}
        <p class="font-medium text-foreground">L'abonnement de {firstName} est actif.</p>
        {#if confirming === 'replace'}
          <p class="text-muted-foreground">L'ancienne adresse cessera de fonctionner d'ici une heure : il faudra vous réabonner avec la nouvelle.</p>
          <button type="button" class={primary} disabled={loading} onclick={create} data-testid="calendar-confirm-replace">Remplacer l'adresse</button>
          <button type="button" class={secondary} onclick={() => (confirming = null)}>Annuler</button>
        {:else if confirming === 'stop'}
          <p class="text-muted-foreground">Le calendrier cessera de se mettre à jour d'ici une heure.</p>
          <button type="button" class={primary} disabled={loading} onclick={stop} data-testid="calendar-confirm-stop">Arrêter l'abonnement</button>
          <button type="button" class={secondary} onclick={() => (confirming = null)}>Annuler</button>
        {:else}
          <button type="button" class={secondary} onclick={() => (confirming = 'replace')} data-testid="calendar-replace">Obtenir une nouvelle adresse</button>
          <button type="button" class={secondary} onclick={() => (confirming = 'stop')} data-testid="calendar-stop">Arrêter l'abonnement</button>
        {/if}
      {:else if loading}
        <p class="text-muted-foreground">Chargement…</p>
      {/if}

      {#if subscribed !== null || links}
        <ul class="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Les rencontres d'interclubs apparaissent une fois leur date fixée par le capitaine.</li>
          <li>Les changements peuvent mettre plusieurs heures à arriver, parfois une journée avec Google : pour une annulation de dernière minute, fiez-vous aux notifications.</li>
          <li>Cette adresse donne accès à l'agenda de {firstName} : ne la partagez pas.</li>
        </ul>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
