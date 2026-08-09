<script lang="ts">
  import { Button, Input, Label, Select, EmptyState, toast, uiConfirm, flashAndReload } from '@nba/ui';
  import { AUDIENCE_LABELS, WEEKDAY_LABELS } from '../../shared/schema';

  interface SlotRow {
    id: number; weekday: number; startTime: string; endTime: string;
    audience: keyof typeof AUDIENCE_LABELS; label: string | null; active: boolean;
    venue: { name: string } | null;
  }
  interface VenueRow { id: number; name: string }

  let { slots = [], venues = [], seasonCode = '', canWrite = false } = $props<{
    slots: SlotRow[]; venues: VenueRow[]; seasonCode?: string; canWrite?: boolean;
  }>();

  let weekday = $state('1');
  let startTime = $state('18:00');
  let endTime = $state('19:30');
  let audience = $state<keyof typeof AUDIENCE_LABELS>('jeunes');
  let venueId = $state(venues[0] ? String(venues[0].id) : '');
  let label = $state('');
  let busy = $state(false);

  async function post(body: unknown, fallback: string) {
    const response = await fetch('', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (busy || !venueId) return;
    busy = true;
    try {
      await post({
        action: 'create', seasonCode, venueId: Number(venueId), weekday: Number(weekday),
        startTime, endTime, audience, label: label.trim() || undefined
      }, 'La création a échoué.');
      flashAndReload('Créneau ajouté.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La création a échoué.');
      busy = false;
    }
  }

  async function toggle(row: SlotRow) {
    try {
      await post({ action: 'update', id: row.id, active: !row.active }, "L'opération a échoué.");
      flashAndReload(row.active ? 'Créneau masqué du site.' : 'Créneau réaffiché.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
    }
  }

  async function remove(row: SlotRow) {
    const confirmed = await uiConfirm({
      title: 'Supprimer ce créneau ?',
      description: "Pour le retirer temporairement du site, préférez le masquer : l'historique est conservé.",
      confirmLabel: 'Supprimer', destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Créneau supprimé.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

{#if canWrite && venues.length > 0}
  <form class="border-border mb-6 rounded-lg border p-4" onsubmit={create}>
    <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:items-end">
      <div>
        <Label for="slot-day">Jour</Label>
        <Select.Root type="single" bind:value={weekday}>
          <Select.Trigger id="slot-day">{WEEKDAY_LABELS[Number(weekday)]}</Select.Trigger>
          <Select.Content>
            {#each [1, 2, 3, 4, 5, 6, 7] as day}
              <Select.Item value={String(day)}>{WEEKDAY_LABELS[day]}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div><Label for="slot-start">Début</Label><Input id="slot-start" type="time" bind:value={startTime} /></div>
      <div><Label for="slot-end">Fin</Label><Input id="slot-end" type="time" bind:value={endTime} /></div>
      <div>
        <Label for="slot-audience">Groupe</Label>
        <Select.Root type="single" bind:value={audience}>
          <Select.Trigger id="slot-audience">{AUDIENCE_LABELS[audience]}</Select.Trigger>
          <Select.Content>
            {#each Object.entries(AUDIENCE_LABELS) as [value, text]}
              <Select.Item {value}>{text}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div>
        <Label for="slot-venue">Gymnase</Label>
        <Select.Root type="single" bind:value={venueId}>
          <Select.Trigger id="slot-venue">{venues.find((v) => String(v.id) === venueId)?.name ?? '—'}</Select.Trigger>
          <Select.Content>
            {#each venues as venue}
              <Select.Item value={String(venue.id)}>{venue.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <Button type="submit" disabled={busy}>Ajouter</Button>
    </div>
  </form>
{:else if canWrite}
  <p class="text-muted-foreground mb-6 text-sm">
    Enregistrez d'abord un gymnase : un créneau s'y rattache obligatoirement.
  </p>
{/if}

{#if slots.length === 0}
  <EmptyState title="Aucun créneau" description="Ajoutez les créneaux de la saison." />
{:else}
  <ul class="divide-border divide-y">
    {#each slots as row (row.id)}
      <li class="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
        <span class:opacity-50={!row.active}>
          <span class="font-medium">{WEEKDAY_LABELS[row.weekday]}</span>
          <span class="tabular-nums"> {row.startTime}–{row.endTime}</span>
          <span> · {row.label ?? AUDIENCE_LABELS[row.audience]}</span>
          <span class="text-muted-foreground"> · {row.venue?.name ?? '—'}</span>
          {#if !row.active}<span class="text-muted-foreground"> · masqué</span>{/if}
        </span>
        {#if canWrite}
          <span class="flex gap-2">
            <Button variant="ghost" size="sm" onclick={() => toggle(row)}>{row.active ? 'Masquer' : 'Afficher'}</Button>
            <Button variant="ghost" size="sm" onclick={() => remove(row)}>Supprimer</Button>
          </span>
        {/if}
      </li>
    {/each}
  </ul>
{/if}
