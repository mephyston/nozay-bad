<script lang="ts">
  import { untrack } from 'svelte';
  import { CalendarPlus } from '@lucide/svelte';
  import DiscoveryBubble from './DiscoveryBubble.svelte';
  import { Sheet } from '@nba/ui';
  import { androidBrowserLink, calendarLinks, calendarMailLink, isAndroid, type CalendarLinks } from '../lib/calendar-feed';

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
    /** L'adresse commune des rencontres de toutes les équipes, quand le club en a. */
    clubFeedUrl?: string | null;
  }

  let { firstName, clubFeedUrl = null }: Props = $props();
  const clubLinks = $derived(clubFeedUrl ? calendarLinks(clubFeedUrl) : null);
  let clubCopied = $state(false);

  async function copyClub() {
    if (!clubLinks) return;
    try {
      await navigator.clipboard.writeText(clubLinks.feed);
      clubCopied = true;
    } catch {
      error = "La copie a échoué : sélectionnez l'adresse à la main.";
    }
  }

  const ENDPOINT = '/api/agenda/abonnement';

  let open = $state(false);
  let loading = $state(false);
  let error = $state('');
  let subscribed = $state<boolean | null>(null);
  let links = $state<CalendarLinks | null>(null);
  let confirming = $state<'replace' | 'stop' | null>(null);
  let copied = $state(false);
  /**
   * Le bouton n'a jamais été ouvert sur cet appareil : il s'éclaire, comme l'avatar du compte à
   * la première visite. Même clé que la bulle de la barre du bas : l'ouvrir range les deux.
   */
  const DISCOVERY_KEY = 'nba:calendar-feed-hint:v1';
  let fresh = $state(false);
  /** Une bulle à la fois : celle-ci attend que la bulle du compte ait été vue. */
  let accountSeen = $state(false);
  $effect(() => {
    const read = () => {
      try {
        fresh = localStorage.getItem(DISCOVERY_KEY) !== '1';
        accountSeen = localStorage.getItem('nba:account-hint:v1') === '1';
      } catch {
        fresh = false;
      }
    };
    read();
    window.addEventListener('nba:hint-dismissed', read);
    return () => window.removeEventListener('nba:hint-dismissed', read);
  });
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
      forgetDiscovery();
      android = typeof navigator !== 'undefined' && isAndroid(navigator.userAgent);
      void load();
    }
  }

  // Arrivée depuis la bulle de nouveauté (`/agenda?abonnement`) : la feuille s'ouvre d'elle-même.
  $effect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('abonnement')) return;
    url.searchParams.delete('abonnement');
    history.replaceState(history.state, '', url);
    untrack(() => onOpenChange(true));
  });

  /** La découverte est faite : ni l'éclairage ni les bulles (ici et dans la barre du bas) ne reviennent. */
  function forgetDiscovery() {
    fresh = false;
    try {
      localStorage.setItem(DISCOVERY_KEY, '1');
    } catch {}
    // La bulle suivante (l'onglet Interclubs) attendait celle-ci.
    window.dispatchEvent(new Event('nba:hint-dismissed'));
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
<span class="relative inline-flex">
  <button
    type="button"
    class={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted hover:text-foreground ${fresh ? 'text-primary ring-2 ring-primary' : 'text-muted-foreground'}`}
    aria-label="S'abonner depuis mon agenda"
    title="S'abonner depuis mon agenda"
    data-testid="calendar-subscribe"
    onclick={() => onOpenChange(true)}
  >
    <CalendarPlus class="size-5" aria-hidden="true" />
    {#if fresh}
      <span class="pointer-events-none absolute -right-0.5 -top-0.5 flex size-2.5" aria-hidden="true">
        <span class="absolute inline-flex size-full rounded-full bg-primary opacity-75 motion-safe:animate-ping"></span>
        <span class="relative inline-flex size-2.5 rounded-full bg-primary"></span>
      </span>
    {/if}
  </button>
  {#if fresh && accountSeen && !open}
    <!-- La même bulle que celle du compte : elle pointe l'icône, une fois par appareil. -->
    <DiscoveryBubble
      testid="calendar-subscribe-hint"
      class="absolute left-0 top-full mt-2 w-64"
      arrowStyle="left: 1rem"
      title="Votre agenda, dans votre téléphone"
      text="Ajoutez les rendez-vous du club et vos rencontres à Google Agenda, Apple Calendrier ou Outlook : ils suivront les changements."
      primary={{ label: 'Découvrir', onclick: () => onOpenChange(true) }}
      secondary={{ label: 'Plus tard', onclick: forgetDiscovery }}
    />
  {/if}
</span>

<Sheet.Root {open} {onOpenChange}>
  <!--
    Les marges vivent sur un conteneur intérieur : pour un tiroir du bas, `Sheet.Content` pose en
    style en ligne `padding-top: 0` et `padding-bottom: env(safe-area-inset-bottom)`, qui
    écrasent toute classe `p-*` posée ici. Le contenu touchait le haut et le bas de l'écran.
  -->
  <Sheet.Content side="bottom" class="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-2xl p-0" data-testid="calendar-sheet">
    <div class="space-y-4 px-4 pt-6 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] sm:px-6">
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

      {#if clubLinks}
        <!--
          Une adresse commune, sans jeton : elle ne porte que ce que tout adhérent voit déjà dans
          le calendrier (quand, où, contre qui), et peut donc se partager.
        -->
        <section class="space-y-2 border-t border-border pt-3" data-testid="calendar-club-feed">
          <p class="font-medium text-foreground">Suivre toutes les équipes du club</p>
          <p class="text-muted-foreground">Les rencontres datées de toutes les équipes, sans les compositions. Une adresse commune, qui peut se partager.</p>
          {#if android}
            <button type="button" class={secondary} onclick={copyClub} data-testid="calendar-club-copy">
              {clubCopied ? 'Adresse copiée' : "Copier l'adresse des rencontres"}
            </button>
            <p class="text-muted-foreground">Puis ajoutez-la depuis la page de Google, comme ci-dessus, et activez « Synchroniser ».</p>
            <a href={androidBrowserLink()} class={secondary}>Ouvrir Google Agenda dans Chrome</a>
          {:else}
            <a href={clubLinks.google} target="_blank" rel="noopener noreferrer" class={secondary}>Google Agenda</a>
            <a href={clubLinks.webcal} class={secondary}>Apple Calendrier, Outlook</a>
            <button type="button" class={secondary} onclick={copyClub} data-testid="calendar-club-copy">
              {clubCopied ? 'Adresse copiée' : "Copier l'adresse des rencontres"}
            </button>
          {/if}
        </section>
      {/if}
    </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
