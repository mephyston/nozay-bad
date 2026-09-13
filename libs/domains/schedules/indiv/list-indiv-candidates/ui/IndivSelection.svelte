<script lang="ts">
  import { Sparkles, Save, Megaphone, Copy } from '@lucide/svelte';
  import { Button, Badge, Alert, toast, uiConfirm, flashAndReload } from '@nba/ui';
  import { formatWindow, type SlotWindow } from '../../../shared/indiv';
  import { ageAt, announcementText, proposeSelection, rankCandidates } from '../../../shared/indiv-selection';

  /**
   * L'écran du choix : les candidats classés par priorité, et l'affectation aux créneaux.
   *
   * L'ordre est celui de l'équité — moins souvent retenu cette saison, puis plus jeune,
   * puis premier arrivé. L'âge et le classement Poona viennent du relais, qui les a joints
   * par licence ; le domaine, lui, ne connaît que des nombres.
   *
   * « Proposer » remplit selon cet ordre en respectant les préférences ; l'entraîneur
   * ajuste, enregistre, puis annonce — c'est l'annonce qui ferme les candidatures et
   * prévient chacun. « Copier l'annonce » donne le texte du groupe WhatsApp.
   */
  interface Candidate {
    requestId: number; memberId: number; licence: string; firstName: string; lastName: string;
    memberGroup: string; preferredSlot: number | null; note: string | null; selectedSlot: number | null;
    requestedAt: number; requestCount: number; selectedCount: number; lastSelectedDate: string | null;
    birthDate?: string | null; category?: string | null; singles?: string | null; doubles?: string | null; mixed?: string | null;
  }
  interface Session {
    id: number; date: string; startTime: string; endTime: string; status: 'open' | 'announced' | 'cancelled';
    slotCount: number; capacityPerSlot: number; label: string | null; venueName: string | null; slots: SlotWindow[];
  }

  let { session, candidates = [], canWrite = false, endpoint = '/admin/api/schedules/indiv-candidats' } = $props<{
    session: Session; candidates: Candidate[]; canWrite?: boolean; endpoint?: string;
  }>();

  const enriched = $derived(candidates.map((c: Candidate) => ({ ...c, age: ageAt(c.birthDate, session.date) })));
  const ranked = $derived(rankCandidates(enriched));

  // svelte-ignore state_referenced_locally
  let assignments = $state<Record<number, number | null>>(Object.fromEntries(candidates.map((c: Candidate) => [c.requestId, c.selectedSlot])));
  let busy = $state(false);

  const counts = $derived(
    session.slots.map((slot: SlotWindow) => ({ slot, count: Object.values(assignments).filter((s) => s === slot.index).length }))
  );
  const selectedBySlot = $derived(
    Object.fromEntries(
      session.slots.map((slot: SlotWindow) => [
        slot.index,
        ranked.filter((c) => assignments[c.requestId] === slot.index).map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`)
      ])
    ) as Record<number, string[]>
  );
  const dirty = $derived(candidates.some((c: Candidate) => (assignments[c.requestId] ?? null) !== c.selectedSlot));
  const selectedTotal = $derived(Object.values(assignments).filter((s) => s !== null).length);

  const dateLabel = $derived(
    new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${session.date}T12:00:00Z`))
  );

  function assign(requestId: number, slot: number | null) {
    if (slot !== null && assignments[requestId] !== slot) {
      const taken = Object.values(assignments).filter((s) => s === slot).length;
      if (taken >= session.capacityPerSlot) { toast.error('Ce créneau a déjà toutes ses places.'); return; }
    }
    assignments = { ...assignments, [requestId]: slot };
  }

  function propose() {
    const picks = proposeSelection(ranked, session);
    const next: Record<number, number | null> = Object.fromEntries(candidates.map((c: Candidate) => [c.requestId, null]));
    for (const pick of picks) next[pick.requestId] = pick.slot;
    assignments = next;
  }

  async function post(action: 'select' | 'announce', extra: Record<string, unknown> = {}) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id: session.id, ...extra })
    });
    if (!response.ok) {
      let message = "L'opération a échoué.";
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  const selection = () =>
    Object.entries(assignments).filter(([, slot]) => slot !== null).map(([requestId, slot]) => ({ requestId: Number(requestId), slot: Number(slot) }));

  async function save() {
    busy = true;
    try { await post('select', { selection: selection() }); flashAndReload('Sélection enregistrée.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : "L'enregistrement a échoué."); busy = false; }
  }

  async function announce() {
    const confirmed = await uiConfirm({
      title: session.status === 'announced' ? 'Ré-annoncer les retenus ?' : 'Annoncer les retenus ?',
      description: `${selectedTotal} retenu${selectedTotal > 1 ? 's' : ''}. Chaque candidat reçoit une notification, retenu ou non, et les candidatures se ferment.`,
      confirmLabel: 'Annoncer'
    });
    if (!confirmed) return;
    busy = true;
    try {
      if (dirty) await post('select', { selection: selection() });
      await post('announce');
      flashAndReload('Retenus annoncés.');
    } catch (error) { toast.error(error instanceof Error ? error.message : "L'annonce a échoué."); busy = false; }
  }

  async function copy() {
    const text = announcementText({ dateLabel, venueName: session.venueName, slots: session.slots, selectedBySlot });
    try { await navigator.clipboard.writeText(text); toast.success('Annonce copiée, prête à coller.'); }
    catch { toast.error('Copie impossible : sélectionnez le texte à la main.'); }
  }

  const rankings = (c: Candidate) => [c.singles, c.doubles, c.mixed].map((r) => r ?? '—').join(' / ');
</script>

<div class="space-y-4">
  {#if session.status === 'announced'}
    <Alert.Root><Alert.Description>Les retenus ont été annoncés. Modifier puis ré-annoncer enverra une mise à jour à tous les candidats.</Alert.Description></Alert.Root>
  {:else if session.status === 'cancelled'}
    <Alert.Root variant="destructive"><Alert.Description>Soirée annulée : la sélection est en lecture seule.</Alert.Description></Alert.Root>
  {/if}

  <div class="flex flex-wrap items-center gap-2">
    {#each counts as { slot, count } (slot.index)}
      <Badge variant={count >= session.capacityPerSlot ? 'primary-soft' : 'outline'}>
        Créneau {slot.index} · {formatWindow(slot)} · {count}/{session.capacityPerSlot}
      </Badge>
    {/each}
    <div class="ml-auto flex flex-wrap gap-2">
      <Button variant="outline" onclick={copy} class="gap-1.5"><Copy class="h-4 w-4" />Copier l'annonce</Button>
      {#if canWrite && session.status !== 'cancelled'}
        <Button variant="outline" onclick={propose} disabled={busy || candidates.length === 0} class="gap-1.5"><Sparkles class="h-4 w-4" />Proposer</Button>
        <Button variant="outline" onclick={save} disabled={busy || !dirty} class="gap-1.5"><Save class="h-4 w-4" />Enregistrer</Button>
        <Button onclick={announce} disabled={busy || selectedTotal === 0} class="gap-1.5 font-bold"><Megaphone class="h-4 w-4" />Annoncer</Button>
      {/if}
    </div>
  </div>

  {#if ranked.length === 0}
    <p class="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Personne n'a encore candidaté.</p>
  {:else}
    <ol class="divide-y divide-border rounded-xl border border-border bg-card">
      {#each ranked as c, i (c.requestId)}
        <li class="flex flex-wrap items-center gap-3 p-3 sm:p-4" data-testid="candidate">
          <span class="w-6 text-center text-sm font-bold tabular-nums text-muted-foreground">{i + 1}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-foreground">
              {c.firstName} {c.lastName}
              <span class="ml-1 text-xs font-normal text-muted-foreground">{c.age !== null ? `${c.age} ans` : 'âge inconnu'}{c.category ? ` · ${c.category}` : ''}</span>
            </p>
            <p class="text-xs text-muted-foreground">
              S/D/M {rankings(c)} · retenu {c.selectedCount} fois sur {c.requestCount} demande{c.requestCount > 1 ? 's' : ''}{c.lastSelectedDate ? ` · dernière fois le ${c.lastSelectedDate}` : ''}
            </p>
            <p class="text-xs text-muted-foreground">
              Souhait : {c.preferredSlot ? `créneau ${c.preferredSlot}` : 'indifférent'}{c.note ? ` · « ${c.note} »` : ''}
            </p>
          </div>
          <div class="flex items-center gap-1" role="group" aria-label={`Créneau de ${c.firstName} ${c.lastName}`}>
            <Button size="sm" variant={assignments[c.requestId] === null || assignments[c.requestId] === undefined ? 'default' : 'outline'} onclick={() => assign(c.requestId, null)} disabled={!canWrite || busy} class="h-8 px-2 text-xs">—</Button>
            {#each session.slots as slot (slot.index)}
              <Button size="sm" variant={assignments[c.requestId] === slot.index ? 'default' : 'outline'} onclick={() => assign(c.requestId, slot.index)} disabled={!canWrite || busy} class="h-8 px-2 text-xs" aria-pressed={assignments[c.requestId] === slot.index}>{slot.index}</Button>
            {/each}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</div>
