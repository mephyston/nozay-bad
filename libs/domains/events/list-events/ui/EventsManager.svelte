<script lang="ts">
  import { Button, Input, Label, Select, Badge, EmptyState, toast, uiConfirm, flashAndReload } from '@nba/ui';
  import { EVENT_CATEGORY_LABELS } from '../../shared/schema';

  interface EventRow {
    id: number; title: string; startsAt: string; venueLabel: string | null;
    category: keyof typeof EVENT_CATEGORY_LABELS; status: 'draft' | 'published' | 'cancelled';
  }

  let { events = [], canWrite = false, canDelete = false } = $props<{
    events: EventRow[]; canWrite?: boolean; canDelete?: boolean;
  }>();

  let title = $state('');
  let startsAt = $state('');
  let category = $state<keyof typeof EVENT_CATEGORY_LABELS>('competition');
  let venueLabel = $state('');
  let busy = $state(false);

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const when = (v: string) => formatter.format(new Date(`${v}:00`));

  const STATUS: Record<EventRow['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    published: { label: 'En ligne', variant: 'default' },
    draft: { label: 'Brouillon', variant: 'secondary' },
    cancelled: { label: 'Annulé', variant: 'destructive' }
  };

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
    if (busy || !title.trim() || !startsAt) return;
    busy = true;
    try {
      await post({
        action: 'create', title: title.trim(), startsAt, category,
        venueLabel: venueLabel.trim() || undefined
      }, 'La création a échoué.');
      flashAndReload('Événement créé en brouillon.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La création a échoué.');
      busy = false;
    }
  }

  async function setStatus(row: EventRow, status: EventRow['status']) {
    try {
      await post({ action: 'update', id: row.id, status }, "L'opération a échoué.");
      flashAndReload('Événement mis à jour.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
    }
  }

  async function remove(row: EventRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer « ${row.title} » ?`,
      description: "Pour un événement annulé, préférez le statut « Annulé » : la fiche reste en ligne et informe ceux qui comptaient s'y rendre.",
      confirmLabel: 'Supprimer', destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Événement supprimé.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

{#if canWrite}
  <form class="border-border mb-6 rounded-lg border p-4" onsubmit={create}>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:items-end">
      <div class="lg:col-span-2"><Label for="ev-title">Titre</Label><Input id="ev-title" bind:value={title} /></div>
      <div><Label for="ev-start">Début</Label><Input id="ev-start" type="datetime-local" bind:value={startsAt} /></div>
      <div>
        <Label for="ev-cat">Catégorie</Label>
        <Select.Root type="single" bind:value={category}>
          <Select.Trigger id="ev-cat">{EVENT_CATEGORY_LABELS[category]}</Select.Trigger>
          <Select.Content>
            {#each Object.entries(EVENT_CATEGORY_LABELS) as [value, text]}
              <Select.Item {value}>{text}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <Button type="submit" disabled={busy}>Ajouter</Button>
    </div>
    <div class="mt-3"><Label for="ev-venue">Lieu</Label><Input id="ev-venue" bind:value={venueLabel} placeholder="Halle des Sports, ou le gymnase du club adverse" /></div>
  </form>
{/if}

{#if events.length === 0}
  <EmptyState title="Agenda vide" description="Ajoutez les compétitions et animations de la saison." />
{:else}
  <ul class="divide-border divide-y">
    {#each events as row (row.id)}
      <li class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
        <span>
          <span class="font-medium">{row.title}</span>
          <span class="text-muted-foreground"> · {when(row.startsAt)}</span>
          <span class="text-muted-foreground"> · {EVENT_CATEGORY_LABELS[row.category]}</span>
          {#if row.venueLabel}<span class="text-muted-foreground"> · {row.venueLabel}</span>{/if}
        </span>
        <span class="flex items-center gap-2">
          <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
          {#if canWrite}
            {#if row.status !== 'published'}
              <Button variant="ghost" size="sm" onclick={() => setStatus(row, 'published')}>Publier</Button>
            {/if}
            {#if row.status === 'published'}
              <Button variant="ghost" size="sm" onclick={() => setStatus(row, 'cancelled')}>Annuler</Button>
            {/if}
          {/if}
          {#if canDelete}
            <Button variant="ghost" size="sm" onclick={() => remove(row)}>Supprimer</Button>
          {/if}
        </span>
      </li>
    {/each}
  </ul>
{/if}
