<script lang="ts">
  import { Plus, Edit, Ban, Users, RotateCcw, CalendarPlus } from '@lucide/svelte';
  import {
    Button, Badge, Card, Table, DataTable, DataTableToolbar, DataTableRowActions, DropdownMenu,
    toast, uiConfirm, flashAndReload
  } from '@nba/ui';
  import IndivSessionForm from './IndivSessionForm.svelte';
  import IndivGenerateForm from './IndivGenerateForm.svelte';

  /**
   * Les soirées d'indiv, vues de l'entraîneur.
   *
   * Une ligne par soirée : combien demandent, combien sont retenus, et où en est
   * l'annonce. Le choix lui-même se fait sur un écran à part — c'est là qu'il faut de la
   * place pour lire l'âge, le classement et l'historique de chacun.
   */

  export interface SessionRow {
    id: number; date: string; startTime: string; endTime: string;
    venueId: number; venue: { name: string } | null;
    slotCount: number; slotMinutes: number; capacityPerSlot: number;
    status: 'open' | 'announced' | 'cancelled';
    label: string | null; notes: string | null; cancelledReason: string | null;
    requestCount: number; selectedCount: number;
  }
  interface VenueRow { id: number; name: string }
  interface SlotRow { id: number; weekday: number; startTime: string; endTime: string; label: string | null; venue?: { name: string } | null }

  let {
    sessions = [], venues = [], slots = [],
    canWrite = false,
    endpoint = '/admin/api/schedules/indiv',
    selectionHref = (id: number) => `/admin/entrainement/indiv/selection?id=${id}`
  } = $props<{
    sessions: SessionRow[]; venues: VenueRow[]; slots?: SlotRow[];
    canWrite?: boolean;
    /** Relais du domaine, destination nommée des écritures. */
    endpoint?: string;
    selectionHref?: (id: number) => string;
  }>();

  let searchTerm = $state('');
  let onlyToAnnounce = $state(false);
  let showForm = $state(false);
  let editing = $state<SessionRow | null>(null);
  let showGenerate = $state(false);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = $derived(
    sessions.filter((row: SessionRow) => {
      if (onlyToAnnounce && !(row.status === 'open' && row.date >= today)) return false;
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return row.date.includes(term) || (row.venue?.name ?? '').toLowerCase().includes(term) || (row.label ?? '').toLowerCase().includes(term);
    })
  );

  async function post(body: unknown, fallback: string) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  async function cancel(row: SessionRow) {
    const reason = window.prompt("Pourquoi la soirée est-elle annulée ? Les candidats liront ce motif.", row.cancelledReason ?? '');
    if (reason === null || !reason.trim()) return;
    try {
      await post({ action: 'update', id: row.id, status: 'cancelled', cancelledReason: reason.trim() }, "L'annulation a échoué.");
      flashAndReload('Soirée annulée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'annulation a échoué.");
    }
  }

  async function reopen(row: SessionRow) {
    const confirmed = await uiConfirm({
      title: 'Rouvrir cette soirée ?',
      description: 'Les candidatures redeviennent possibles et le motif disparaît. Les retenus restent marqués, à vous de ré-annoncer.',
      confirmLabel: 'Rouvrir'
    });
    if (!confirmed) return;
    try {
      await post({ action: 'update', id: row.id, status: 'open' }, 'La réouverture a échoué.');
      flashAndReload('Soirée rouverte.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La réouverture a échoué.');
    }
  }

  function statusLabel(row: SessionRow): { text: string; variant: 'primary-soft' | 'outline' | 'destructive' | 'secondary' } {
    if (row.status === 'cancelled') return { text: 'Annulée', variant: 'destructive' };
    if (row.status === 'announced') return { text: 'Annoncée', variant: 'primary-soft' };
    if (row.date < today) return { text: 'Passée', variant: 'secondary' };
    return { text: 'Candidatures ouvertes', variant: 'outline' };
  }
</script>

{#if canWrite && venues.length === 0}
  <p class="text-muted-foreground mb-6 text-sm">Enregistrez d'abord un gymnase : une soirée s'y rattache obligatoirement.</p>
{/if}

<DataTable
  data={filtered}
  mobileSpacing="spaced"
  emptyTitle="Aucune soirée"
  emptyDescription={searchTerm.trim() || onlyToAnnounce ? 'Aucune soirée ne correspond à votre recherche.' : 'Programmez les soirées d’indiv depuis les créneaux marqués « séances individuelles » dans les horaires.'}
>
  {#snippet toolbar()}
    <DataTableToolbar bind:searchValue={searchTerm} searchPlaceholder="Rechercher une soirée..." hasFilters={false}>
      {#snippet actions()}
        <Button variant={onlyToAnnounce ? 'default' : 'outline'} onclick={() => (onlyToAnnounce = !onlyToAnnounce)} class="h-9 shrink-0 gap-1.5 text-sm font-semibold">
          À annoncer
        </Button>
        {#if canWrite && slots.length > 0}
          <Button variant="outline" onclick={() => (showGenerate = true)} class="h-9 shrink-0 gap-1.5 font-semibold">
            <CalendarPlus class="h-4 w-4" />
            <span>Programmer les soirées</span>
          </Button>
        {/if}
        {#if canWrite && venues.length > 0}
          <Button onclick={() => { editing = null; showForm = true; }} class="h-9 shrink-0 gap-1.5 font-bold">
            <Plus class="h-4 w-4" />
            <span>Nouvelle soirée</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#each filtered as row (row.id)}
      {@const status = statusLabel(row)}
      <Card.Root>
        <Card.Content class="space-y-3 p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-foreground">{row.date} <span class="tabular-nums font-normal">{row.startTime}–{row.endTime}</span></h4>
              <p class="mt-1 text-xs text-muted-foreground">{row.venue?.name ?? '—'} · {row.requestCount} candidat{row.requestCount > 1 ? 's' : ''}, {row.selectedCount} retenu{row.selectedCount > 1 ? 's' : ''}</p>
            </div>
            <Badge variant={status.variant} size="xs">{status.text}</Badge>
          </div>
          <div class="flex items-center justify-end gap-2 border-t border-border/50 pt-2">
            <Button href={selectionHref(row.id)} variant="outline" size="sm" class="h-8 flex-1 gap-1.5 text-xs font-semibold">
              <Users class="h-3.5 w-3.5" /><span>Candidats</span>
            </Button>
            {#if canWrite}
              <Button variant="outline" size="sm" onclick={() => { editing = row; showForm = true; }} class="h-8 flex-1 gap-1.5 text-xs font-semibold">
                <Edit class="h-3.5 w-3.5" /><span>Modifier</span>
              </Button>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    {/each}
  {/snippet}

  {#snippet header()}
    <Table.Head>Date</Table.Head>
    <Table.Head>Horaire</Table.Head>
    <Table.Head>Gymnase</Table.Head>
    <Table.Head>Créneaux</Table.Head>
    <Table.Head>Candidats</Table.Head>
    <Table.Head>État</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(session)}
    {@const status = statusLabel(session)}
    <Table.Row class={session.status === 'cancelled' ? 'opacity-60' : ''}>
      <Table.Cell class="font-medium tabular-nums">{session.date}</Table.Cell>
      <Table.Cell class="tabular-nums">{session.startTime}–{session.endTime}</Table.Cell>
      <Table.Cell class="text-muted-foreground">{session.venue?.name ?? '—'}</Table.Cell>
      <Table.Cell class="tabular-nums">{session.slotCount} × {session.capacityPerSlot} places</Table.Cell>
      <Table.Cell class="tabular-nums">
        <span class="text-foreground">{session.requestCount}</span>
        <span class="block text-xs text-muted-foreground">{session.selectedCount} retenu{session.selectedCount > 1 ? 's' : ''}</span>
      </Table.Cell>
      <Table.Cell><Badge variant={status.variant}>{status.text}</Badge></Table.Cell>
      <Table.Cell class="relative text-right">
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          <DropdownMenu.Item onclick={() => (window.location.href = selectionHref(session.id))} class="cursor-pointer">
            <Users class="mr-2 h-3.5 w-3.5" />Candidats et sélection
          </DropdownMenu.Item>
          {#if canWrite}
            <DropdownMenu.Item onclick={() => { editing = session; showForm = true; }} class="cursor-pointer">
              <Edit class="mr-2 h-3.5 w-3.5" />Modifier
            </DropdownMenu.Item>
            {#if session.status === 'cancelled'}
              <DropdownMenu.Item onclick={() => reopen(session)} class="cursor-pointer">
                <RotateCcw class="mr-2 h-3.5 w-3.5" />Rouvrir
              </DropdownMenu.Item>
            {:else}
              <DropdownMenu.Item onclick={() => cancel(session)} class="cursor-pointer text-destructive focus:text-destructive">
                <Ban class="mr-2 h-3.5 w-3.5" />Annuler la soirée
              </DropdownMenu.Item>
            {/if}
          {/if}
        </DataTableRowActions>
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<IndivSessionForm bind:open={showForm} session={editing} {venues} {endpoint} />
<IndivGenerateForm bind:open={showGenerate} {slots} {endpoint} />
