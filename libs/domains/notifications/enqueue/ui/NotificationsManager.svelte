<script lang="ts">
  import { Plus, Send } from '@lucide/svelte';
  import {
    ResponsiveSheet,
    dockDePage,
    toast,
    uiAlert,
    uiConfirm,
    type SwipeAction
  } from '@nba/ui';
  import type { ScheduledNotificationView } from '../../shared/scheduled-registry';
  import NotificationRubricsList from './NotificationRubricsList.svelte';
  import NotificationHistoryList from './NotificationHistoryList.svelte';
  import NotificationSubscribersPanel from './NotificationSubscribersPanel.svelte';
  import NotificationSendSheet from './NotificationSendSheet.svelte';
  import ScheduledNotificationsList from './ScheduledNotificationsList.svelte';
  import {
    audienceDe,
    refusDEnvoi,
    rubriquesDeNotifications,
    type AbonneLike,
    type MessageLike,
    type Rubrique,
    type StatsLike
  } from './notifications-row-model';

  /**
   * L'écran des notifications : un index de rubriques, et une action.
   *
   * Il empilait quatre blocs de trois formes — une carte-formulaire en tête, trois
   * sections repliables, une carte à compteurs — dans une grille à deux colonnes, plus
   * un dialogue d'appareils atteint par un lien souligné. On arrivait donc sur une page
   * d'information par un formulaire d'envoi qu'il fallait dépasser pour lire quoi que
   * ce soit. L'envoi est une action : il descend dans le menu, et les rubriques
   * prennent toutes la même forme.
   */
  let {
    stats: statsInitiales,
    messages: messagesInitiaux,
    groups: groupesInitiaux = [],
    canSend = false,
    scheduled = []
  }: {
    stats: StatsLike;
    messages: MessageLike[];
    groups?: { type: string; members: number }[];
    canSend?: boolean;
    scheduled?: ScheduledNotificationView[];
  } = $props();

  let stats = $state<StatsLike>(statsInitiales);
  let messages = $state<MessageLike[]>(messagesInitiaux);
  const groupes = groupesInitiaux;

  const rubriques = $derived(rubriquesDeNotifications({ stats, messages, programmees: scheduled }));
  const cron = $derived(scheduled.filter((s) => s.trigger === 'cron'));
  const evenements = $derived(scheduled.filter((s) => s.trigger === 'event'));

  /** La rubrique ouverte, ou `null`. Une seule à la fois : c'est une navigation. */
  let rubriqueOuverte = $state<Rubrique['id'] | null>(null);
  const rubriqueCourante = $derived(rubriques.find((r) => r.id === rubriqueOuverte) ?? null);

  let abonnes = $state<AbonneLike[] | null>(null);
  let erreurAbonnes = $state('');

  let envoiOuvert = $state(false);
  let envoiEnCours = $state(false);
  let title = $state('');
  let body = $state('');
  let page = $state('');
  let cible = $state<'all' | 'unpaid' | 'groups'>('all');
  let groupesRetenus = $state<string[]>([]);

  /*
    Un envoi manuel est toujours une communication du bureau : les autres catégories
    ne sont émises que par les crons et les événements métier. Les proposer ici
    n'offrirait que des façons de se tromper de destinataires.
  */
  const CATEGORIE_MANUELLE = 'announcement';

  /*
    Envoyer descend dans la barre du bas. Le formulaire vivait en haut de la page et
    poussait l'information sous le pli ; l'action, elle, est toujours à portée du pouce.
  */
  $effect(() => {
    if (!canSend) return;
    const actions: SwipeAction[] = [
      { id: 'envoyer', label: 'Nouvelle notification', icon: Send, run: () => (envoiOuvert = true) }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Nouvelle notification' });
  });

  function ouvrirRubrique(id: Rubrique['id']) {
    rubriqueOuverte = id;
    if (id === 'abonnements') void chargerAbonnes();
  }

  async function lireReponse(res: Response, secours: string): Promise<any> {
    const brut = await res.text();
    let json: any = null;
    try {
      json = brut ? JSON.parse(brut) : null;
    } catch {
      throw new Error(`${secours} (HTTP ${res.status} — réponse inattendue du serveur).`);
    }
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `${secours} (HTTP ${res.status}).`);
    }
    return json;
  }

  async function rafraichir() {
    const res = await fetch('/api/notifications/overview');
    const json = await lireReponse(res, 'Actualisation impossible');
    stats = json.data.stats;
    messages = json.data.messages;
  }

  /** La liste des appareils ne se charge qu'à l'ouverture de sa rubrique. */
  async function chargerAbonnes() {
    if (abonnes) return;
    erreurAbonnes = '';
    try {
      const res = await fetch('/api/notifications/subscribers');
      const json = await lireReponse(res, 'Liste des abonnés indisponible');
      abonnes = json.data;
    } catch (e) {
      erreurAbonnes = e instanceof Error ? e.message : 'Liste des abonnés indisponible.';
    }
  }

  async function envoyer(event: Event) {
    event.preventDefault();
    /*
      Toute la fonction est protégée : une exception dans le dialogue de confirmation
      ou dans la lecture d'une réponse laissait le bouton sans réaction et sans
      message, impossible à diagnostiquer côté utilisateur.
    */
    try {
      const brouillon = { title, body, target: cible, selectedGroups: groupesRetenus };
      const refus = refusDEnvoi(brouillon, stats);
      if (refus) {
        // Une cible sans abonné n'est pas une faute de saisie : elle s'annonce, et
        // l'envoi s'arrête là plutôt que de partir dans le vide.
        if (cible === 'all' && stats.devices === 0) toast.warning(refus);
        else uiAlert(refus);
        return;
      }

      const confirme = await uiConfirm(
        `Envoyer cette notification à ${audienceDe(brouillon, stats)} ? Une notification envoyée ne peut pas être rappelée.`
      );
      if (!confirme) return;

      envoiEnCours = true;

      const res = await fetch('/api/notifications/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: page || undefined,
          target: cible,
          groups: cible === 'groups' ? groupesRetenus : undefined,
          category: CATEGORIE_MANUELLE
        })
      });
      const json = await lireReponse(res, "L'envoi a échoué");

      if (json.data.queued === 0) {
        toast.warning(
          "Aucun appareil abonné dans cette cible : rien n'a été envoyé. Les adhérents ayant coupé cette catégorie sont exclus."
        );
      } else {
        toast.success(`${json.data.queued} notification(s) en file d'envoi.`);
      }

      title = '';
      body = '';
      page = '';
      groupesRetenus = [];
      envoiOuvert = false;

      /*
        Déclenche le drain immédiatement : sans cela l'envoi attendrait le prochain
        passage du cron, jusqu'à une minute plus tard. Un échec ici n'annule pas
        l'envoi (le cron reprendra la file) mais doit rester visible.
      */
      try {
        const drain = await fetch('/api/notifications/dispatch', { method: 'POST' });
        await lireReponse(drain, 'Envoi immédiat impossible');
      } catch (e) {
        console.error('[notifications] drain immédiat en échec', e);
        toast.info("Notifications en file : elles partiront d'ici une minute.");
      }

      abonnes = null;
      await rafraichir();
    } catch (e) {
      console.error('[notifications] envoi en échec', e);
      uiAlert(e instanceof Error ? e.message : "L'envoi a échoué.");
    } finally {
      envoiEnCours = false;
    }
  }
</script>

<NotificationRubricsList {rubriques} onOuvrir={ouvrirRubrique} />

<!--
  Une seule feuille pour les quatre rubriques : elles ne s'ouvrent jamais ensemble, et
  quatre feuilles montées en permanence auraient chacune leur piège à focus.
-->
<ResponsiveSheet
  open={rubriqueOuverte !== null}
  onOpenChange={(ouvert) => {
    if (!ouvert) rubriqueOuverte = null;
  }}
  title={rubriqueCourante?.titre ?? ''}
  description={rubriqueCourante?.sousTitre}
  size="lg"
>
  {#if rubriqueOuverte === 'historique'}
    <NotificationHistoryList {messages} />
  {:else if rubriqueOuverte === 'abonnements'}
    <NotificationSubscribersPanel {stats} {abonnes} erreur={erreurAbonnes} />
  {:else if rubriqueOuverte === 'programmees'}
    <ScheduledNotificationsList entrees={cron} />
  {:else if rubriqueOuverte === 'evenements'}
    <ScheduledNotificationsList entrees={evenements} parCategorie />
  {/if}
</ResponsiveSheet>

{#if canSend}
  <NotificationSendSheet
    bind:open={envoiOuvert}
    {stats}
    {groupes}
    {envoiEnCours}
    onSubmit={envoyer}
    bind:title
    bind:body
    bind:page
    bind:cible
    bind:groupesRetenus
  />
{/if}
