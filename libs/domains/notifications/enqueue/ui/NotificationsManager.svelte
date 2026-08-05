<script lang="ts">
  import { Button, Input, Textarea, Select, FormField, Card, Badge, EmptyState, toast, uiConfirm } from '@nba/ui';
  import { Bell, Send } from '@lucide/svelte';

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
    source: string;
    createdAt: string | number | Date;
    sent: number;
    failed: number;
    pending: number;
  }

  let { stats: initialStats, messages: initialMessages, canSend = false } = $props<{
    stats: Stats;
    messages: MessageRow[];
    canSend?: boolean;
  }>();

  let stats = $state<Stats>(initialStats);
  let messages = $state<MessageRow[]>(initialMessages);

  let title = $state('');
  let body = $state('');
  let url = $state('');
  let target = $state<'all' | 'unpaid'>('all');
  let sending = $state(false);

  const TARGET_LABELS: Record<string, string> = {
    all: 'Tous les abonnés',
    unpaid: 'Cotisation non soldée',
    emails: 'Destinataires ciblés'
  };

  const dateFr = (value: string | number | Date) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  };

  async function refresh() {
    const res = await fetch('/api/notifications/overview');
    if (!res.ok) return;
    const json = (await res.json()) as any;
    stats = json.data.stats;
    messages = json.data.messages;
  }

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast.error('Le titre et le message sont obligatoires.');
      return;
    }

    const audience =
      target === 'all' ? `${stats.devices} appareil(s)` : 'les foyers dont la cotisation reste due';
    const confirmed = await uiConfirm(
      `Envoyer cette notification à ${audience} ? Une notification envoyée ne peut pas être rappelée.`
    );
    if (!confirmed) return;

    sending = true;
    try {
      const res = await fetch('/api/notifications/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          target
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        throw new Error(json.error || "L'envoi a échoué.");
      }

      if (json.data.queued === 0) {
        toast.warning('Aucun appareil abonné dans cette cible : rien n\'a été envoyé.');
      } else {
        toast.success(`${json.data.queued} notification(s) en file d'envoi.`);
      }

      // Déclenche le drain immédiatement : sans cela l'envoi attendrait le prochain
      // passage du cron, jusqu'à une minute plus tard.
      await fetch('/api/notifications/dispatch', { method: 'POST' }).catch(() => {});

      title = '';
      body = '';
      url = '';
      await refresh();
    } catch (e) {
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
            Envoyée aux adhérents ayant activé les notifications depuis leur espace.
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

          <FormField id="notif-url" label="Page à ouvrir (optionnel)">
            <Input id="notif-url" bind:value={url} placeholder="/boutique" />
          </FormField>

          <FormField id="notif-target" label="Destinataires">
            <Select id="notif-target" bind:value={target}>
              <option value="all">Tous les abonnés ({stats.devices})</option>
              <option value="unpaid">Cotisation non soldée</option>
            </Select>
          </FormField>
        </Card.Content>
        <Card.Footer>
          <Button onclick={send} disabled={sending || stats.devices === 0}>
            <Send class="w-4 h-4 mr-2" />
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>Historique</Card.Title>
      </Card.Header>
      <Card.Content>
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
                      {dateFr(message.createdAt)} · {TARGET_LABELS[message.target] ?? message.target}
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
      </Card.Content>
    </Card.Root>
  </div>

  <Card.Root class="h-fit">
    <Card.Header>
      <Card.Title>Abonnements</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3">
      <div>
        <div class="text-2xl font-bold text-foreground">{stats.devices}</div>
        <div class="text-xs text-muted-foreground">appareil(s) abonné(s)</div>
      </div>
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
        Les adhérents activent les notifications depuis « Mon compte ». Sur iPhone et iPad, cela
        nécessite d'avoir installé l'application sur l'écran d'accueil.
      </p>
    </Card.Content>
  </Card.Root>
</div>
