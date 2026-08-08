<script lang="ts">
  import {
    Button,
    Input,
    Textarea,
    Select,
    Checkbox,
    FormField,
    Card,
    Badge,
    Dialog,
    EmptyState,
    CollapsibleSection,
    toast,
    uiConfirm
  } from '@nba/ui';
  import { Bell, Send, ExternalLink } from '@lucide/svelte';
  import { NOTIFICATION_CATEGORIES } from '../../shared/categories';
  import { STOREFRONT_PAGES } from '../../shared/storefront-pages';

  interface Stats {
    devices: number;
    accounts: number;
    pending: number;
  }

  interface MessageRow {
    id: number;
    title: string;
    body: string;
    target: string;
    targetDetail: string | null;
    category: string;
    source: string;
    createdAt: string | number | Date;
    sent: number;
    failed: number;
    pending: number;
  }

  interface Group {
    type: string;
    members: number;
  }

  interface Subscriber {
    id: number;
    email: string;
    userAgent: string | null;
    createdAt: string | number | Date;
    lastSuccessAt: string | number | Date | null;
    members: { name: string; group: string }[];
  }

  let {
    stats: initialStats,
    messages: initialMessages,
    groups: initialGroups = [],
    canSend = false
  }: {
    stats: Stats;
    messages: MessageRow[];
    groups?: Group[];
    canSend?: boolean;
  } = $props();

  const STOREFRONT_URL = import.meta.env.PUBLIC_STOREFRONT_URL || '';

  let stats = $state<Stats>(initialStats);
  let messages = $state<MessageRow[]>(initialMessages);
  const groups = initialGroups;

  let title = $state('');
  let body = $state('');
  let page = $state('');
  // Un envoi manuel est toujours une communication du bureau : les autres catégories
  // ne sont émises que par les crons et les événements métier. Les proposer ici
  // n'offrirait que des façons de se tromper de destinataires.
  const MANUAL_CATEGORY = 'announcement';
  let target = $state<'all' | 'unpaid' | 'groups'>('all');
  let selectedGroups = $state<string[]>([]);
  let sending = $state(false);

  let historyOpen = $state(false);
  let subscribersOpen = $state(false);
  let subscribers = $state<Subscriber[] | null>(null);
  let subscribersError = $state('');

  const TARGET_LABELS: Record<string, string> = {
    all: 'Tous les abonnés',
    unpaid: 'Cotisation non soldée',
    groups: 'Groupes',
    emails: 'Destinataires ciblés'
  };

  const CATEGORY_LABELS = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((c) => [c.id, c.label])
  ) as Record<string, string>;

  const dateFr = (value: string | number | Date) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  };

  /** Réduit l'agent utilisateur à un appareil reconnaissable dans une liste. */
  function deviceLabel(userAgent: string | null): string {
    if (!userAgent) return 'Appareil inconnu';
    const ua = userAgent.toLowerCase();
    if (/iphone/.test(ua)) return 'iPhone';
    if (/ipad/.test(ua)) return 'iPad';
    if (/android/.test(ua)) return 'Android';
    if (/macintosh|mac os/.test(ua)) return 'Mac';
    if (/windows/.test(ua)) return 'Windows';
    return 'Autre';
  }

  function toggleGroup(type: string) {
    selectedGroups = selectedGroups.includes(type)
      ? selectedGroups.filter((g) => g !== type)
      : [...selectedGroups, type];
  }

  /** Ouvre la page dans un onglet : c'est le seul test honnête d'une destination. */
  function testPage() {
    if (!page) return;
    window.open(`${STOREFRONT_URL}${page}`, '_blank', 'noopener,noreferrer');
  }

  async function readApiResponse(res: Response, fallback: string): Promise<any> {
    const raw = await res.text();
    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      throw new Error(`${fallback} (HTTP ${res.status} — réponse inattendue du serveur).`);
    }
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `${fallback} (HTTP ${res.status}).`);
    }
    return json;
  }

  async function refresh() {
    const res = await fetch('/api/notifications/overview');
    const json = await readApiResponse(res, 'Actualisation impossible');
    stats = json.data.stats;
    messages = json.data.messages;
  }

  async function openSubscribers() {
    subscribersOpen = true;
    if (subscribers) return;
    subscribersError = '';
    try {
      const res = await fetch('/api/notifications/subscribers');
      const json = await readApiResponse(res, 'Liste des abonnés indisponible');
      subscribers = json.data;
    } catch (e) {
      subscribersError = e instanceof Error ? e.message : 'Liste des abonnés indisponible.';
    }
  }

  async function send() {
    // Toute la fonction est protégée : une exception dans le dialogue de
    // confirmation ou dans la lecture d'une réponse laissait le bouton sans
    // réaction et sans message, impossible à diagnostiquer côté utilisateur.
    try {
      if (!title.trim() || !body.trim()) {
        toast.error('Le titre et le message sont obligatoires.');
        return;
      }
      if (target === 'groups' && selectedGroups.length === 0) {
        toast.error('Sélectionnez au moins un groupe.');
        return;
      }
      if (target === 'all' && stats.devices === 0) {
        toast.warning(
          "Aucun appareil n'est abonné pour l'instant : les adhérents doivent activer les notifications depuis « Mon compte »."
        );
        return;
      }

      const audience =
        target === 'all'
          ? `${stats.devices} appareil(s)`
          : target === 'unpaid'
            ? 'les foyers dont la cotisation reste due'
            : `les groupes : ${selectedGroups.join(', ')}`;
      const confirmed = await uiConfirm(
        `Envoyer cette notification à ${audience} ? Une notification envoyée ne peut pas être rappelée.`
      );
      if (!confirmed) return;

      sending = true;

      const res = await fetch('/api/notifications/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: page || undefined,
          target,
          groups: target === 'groups' ? selectedGroups : undefined,
          category: MANUAL_CATEGORY
        })
      });
      const json = await readApiResponse(res, "L'envoi a échoué");

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
      selectedGroups = [];

      // Déclenche le drain immédiatement : sans cela l'envoi attendrait le prochain
      // passage du cron, jusqu'à une minute plus tard. Un échec ici n'annule pas
      // l'envoi (le cron reprendra la file) mais doit rester visible.
      try {
        const dispatchRes = await fetch('/api/notifications/dispatch', { method: 'POST' });
        await readApiResponse(dispatchRes, 'Envoi immédiat impossible');
      } catch (e) {
        console.error('[notifications] drain immédiat en échec', e);
        toast.info("Notifications en file : elles partiront d'ici une minute.");
      }

      subscribers = null;
      await refresh();
    } catch (e) {
      console.error('[notifications] envoi en échec', e);
      toast.error(e instanceof Error ? e.message : "L'envoi a échoué.");
    } finally {
      sending = false;
    }
  }
</script>

<div class="grid gap-6 lg:grid-cols-3">
  <div class="lg:col-span-2 space-y-6">
    {#if canSend}
      <Card.Root>
        <Card.Header>
          <Card.Title>Nouvelle notification</Card.Title>
          <Card.Description>
            Diffusée comme « communication du bureau » aux adhérents ayant activé les notifications.
            Ceux qui ont coupé cette catégorie dans leurs réglages ne la recevront pas.
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <FormField id="notif-title" label="Titre">
            <Input id="notif-title" bind:value={title} maxlength={80} placeholder="Tournoi interne samedi" />
          </FormField>

          <FormField id="notif-body" label="Message">
            <Textarea
              id="notif-body"
              bind:value={body}
              maxlength={300}
              rows={3}
              placeholder="Inscriptions ouvertes jusqu'à vendredi soir."
            />
          </FormField>

          <FormField id="notif-target" label="Destinataires">
            <Select id="notif-target" bind:value={target}>
              <option value="all">Tous les abonnés ({stats.devices})</option>
              <option value="unpaid">Cotisation non soldée</option>
              <option value="groups">Groupes d'adhérents…</option>
            </Select>
          </FormField>

          {#if target === 'groups'}
            <div class="rounded-lg border border-border p-3 space-y-2 max-h-64 overflow-y-auto">
              {#if groups.length === 0}
                <p class="text-xs text-muted-foreground">
                  Aucun groupe dans la saison active. Importez les adhérents depuis Poona.
                </p>
              {:else}
                {#each groups as group (group.type)}
                  <label class="flex items-center gap-3 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedGroups.includes(group.type)}
                      onCheckedChange={() => toggleGroup(group.type)}
                      aria-label={group.type}
                    />
                    <span class="flex-1 text-foreground">{group.type}</span>
                    <span class="text-xs text-muted-foreground">{group.members}</span>
                  </label>
                {/each}
              {/if}
            </div>
          {/if}

          <FormField id="notif-page" label="Page à ouvrir (optionnel)">
            <div class="flex items-center gap-2">
              <Select id="notif-page" bind:value={page}>
                <option value="">Aucune (ouvre l'accueil)</option>
                {#each STOREFRONT_PAGES as storefrontPage (storefrontPage.path)}
                  <option value={storefrontPage.path}>{storefrontPage.label}</option>
                {/each}
              </Select>
              <Button variant="outline" size="sm" class="shrink-0" disabled={!page} onclick={testPage}>
                <ExternalLink class="w-3.5 h-3.5 mr-1" /> Tester
              </Button>
            </div>
          </FormField>
        </Card.Content>
        <Card.Footer>
          <Button onclick={send} disabled={sending}>
            <Send class="w-4 h-4 mr-2" />
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}

    <CollapsibleSection
      title="Historique des envois"
      description="Les notifications déjà diffusées et leur distribution."
      badge={messages.length}
      bind:open={historyOpen}
    >
      {#if messages.length === 0}
        <EmptyState
          icon={Bell}
          title="Aucune notification envoyée"
          description="Les envois apparaîtront ici avec leur statut de distribution."
        />
      {:else}
        <div class="divide-y divide-border">
          {#each messages as message (message.id)}
            <div class="py-3 first:pt-0 last:pb-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-foreground truncate">{message.title}</div>
                  <p class="text-xs text-muted-foreground mt-0.5 line-clamp-2">{message.body}</p>
                  <div class="text-[11px] text-muted-foreground mt-1">
                    {dateFr(message.createdAt)} · {CATEGORY_LABELS[message.category] ?? message.category}
                    · {TARGET_LABELS[message.target] ?? message.target}{message.targetDetail
                      ? ` (${message.targetDetail})`
                      : ''}
                    {#if message.source !== 'admin'}· {message.source}{/if}
                  </div>
                </div>
                <div class="flex flex-wrap gap-1 justify-end shrink-0">
                  <Badge variant="outline">{message.sent} envoyée(s)</Badge>
                  {#if message.pending > 0}
                    <Badge variant="secondary">{message.pending} en attente</Badge>
                  {/if}
                  {#if message.failed > 0}
                    <Badge variant="destructive">{message.failed} en échec</Badge>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </CollapsibleSection>
  </div>

  <Card.Root class="h-fit">
    <Card.Header>
      <Card.Title>Abonnements</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3">
      <button
        type="button"
        class="w-full text-left rounded-lg -mx-2 px-2 py-1 hover:bg-accent transition-colors"
        onclick={openSubscribers}
      >
        <div class="text-2xl font-bold text-foreground">{stats.devices}</div>
        <div class="text-xs text-muted-foreground underline underline-offset-2">
          appareil(s) abonné(s) — voir le détail
        </div>
      </button>
      <div>
        <div class="text-2xl font-bold text-foreground">{stats.accounts}</div>
        <div class="text-xs text-muted-foreground">compte(s) adhérent(s)</div>
      </div>
      {#if stats.pending > 0}
        <div>
          <div class="text-2xl font-bold text-foreground">{stats.pending}</div>
          <div class="text-xs text-muted-foreground">envoi(s) en attente</div>
        </div>
      {/if}
      <p class="text-[11px] text-muted-foreground pt-2 border-t border-border">
        Les adhérents activent les notifications depuis « Mon compte » et choisissent les catégories
        qu'ils souhaitent recevoir. Sur iPhone et iPad, cela nécessite d'avoir installé
        l'application sur l'écran d'accueil.
      </p>
    </Card.Content>
  </Card.Root>
</div>

<Dialog.Root bind:open={subscribersOpen}>
  <Dialog.Content class="max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Appareils abonnés</Dialog.Title>
      <Dialog.Description>
        Adhérents joignables sur chaque appareil, d'après l'adresse du compte.
      </Dialog.Description>
    </Dialog.Header>

    <div class="max-h-[60vh] overflow-y-auto">
      {#if subscribersError}
        <p class="text-sm text-destructive">{subscribersError}</p>
      {:else if subscribers === null}
        <p class="text-sm text-muted-foreground">Chargement…</p>
      {:else if subscribers.length === 0}
        <EmptyState
          icon={Bell}
          title="Aucun appareil abonné"
          description="Les adhérents activent les notifications depuis leur espace."
        />
      {:else}
        <div class="divide-y divide-border">
          {#each subscribers as subscriber (subscriber.id)}
            <div class="py-3 first:pt-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  {#if subscriber.members.length > 0}
                    <div class="text-sm font-medium text-foreground">
                      {subscriber.members.map((m) => m.name).join(', ')}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {[...new Set(subscriber.members.map((m) => m.group))].join(' · ')}
                    </div>
                  {:else}
                    <div class="text-sm font-medium text-foreground">Compte non rattaché</div>
                    <div class="text-xs text-muted-foreground">
                      Aucun adhérent à cette adresse dans la saison active.
                    </div>
                  {/if}
                  <div class="text-[11px] text-muted-foreground mt-1 truncate">{subscriber.email}</div>
                </div>
                <div class="text-right shrink-0">
                  <Badge variant="outline">{deviceLabel(subscriber.userAgent)}</Badge>
                  <div class="text-[11px] text-muted-foreground mt-1">
                    Depuis le {dateFr(subscriber.createdAt)}
                  </div>
                  {#if subscriber.lastSuccessAt}
                    <div class="text-[11px] text-muted-foreground">
                      Dernier envoi {dateFr(subscriber.lastSuccessAt)}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
