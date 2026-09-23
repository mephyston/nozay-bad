<script lang="ts">
  import { Dumbbell } from '@lucide/svelte';
  import { ChoiceField, Input, Textarea, FormField, FormSheet, submitForm, flashAndReload } from '@nba/ui';
  import { DEFAULT_CAPACITY_PER_SLOT, DEFAULT_SLOT_COUNT, DEFAULT_SLOT_MINUTES, MAX_CAPACITY_PER_SLOT, MAX_SLOT_COUNT, MAX_SLOT_MINUTES, isValidLayout } from '../../../shared/indiv';
  import type { SessionRow } from './IndivManager.svelte';

  /**
   * Créer ou corriger une soirée.
   *
   * Les nombres sont convertis avant l'envoi : le champ `type="number"` rend une chaîne,
   * que le validateur de l'API refuserait.
   */
  let { open = $bindable(false), session = null, venues = [], endpoint } = $props<{
    open: boolean;
    session?: SessionRow | null;
    venues: { id: number; name: string }[];
    endpoint: string;
  }>();

  let date = $state('');
  let startTime = $state('19:30');
  let venueId = $state('');
  let slotCount = $state(String(DEFAULT_SLOT_COUNT));
  let slotMinutes = $state(String(DEFAULT_SLOT_MINUTES));
  let capacityPerSlot = $state(String(DEFAULT_CAPACITY_PER_SLOT));
  let label = $state('');
  let notes = $state('');
  let error = $state<string | null>(null);
  let submitting = $state(false);

  // À l'ouverture, le formulaire reflète la soirée éditée — ou l'habitude du club.
  $effect(() => {
    if (!open) return;
    date = session?.date ?? '';
    startTime = session?.startTime ?? '19:30';
    venueId = String(session?.venueId ?? venues[0]?.id ?? '');
    slotCount = String(session?.slotCount ?? DEFAULT_SLOT_COUNT);
    slotMinutes = String(session?.slotMinutes ?? DEFAULT_SLOT_MINUTES);
    capacityPerSlot = String(session?.capacityPerSlot ?? DEFAULT_CAPACITY_PER_SLOT);
    label = session?.label ?? '';
    notes = session?.notes ?? '';
    error = null;
  });

  async function save(event: Event) {
    event.preventDefault();
    submitting = true;
    const id = session?.id ?? null;
    const body = {
      action: id ? 'update' : 'create',
      ...(id ? { id } : {}),
      venueId: Number(venueId),
      date,
      startTime,
      slotCount: Number(slotCount),
      slotMinutes: Number(slotMinutes),
      capacityPerSlot: Number(capacityPerSlot),
      label: label.trim() || null,
      notes: notes.trim() || null
    };
    await submitForm({
      validate: () => {
        if (!venueId) return 'Choisissez un gymnase.';
        if (!date) return 'Choisissez une date.';
        if (!isValidLayout({ startTime, slotCount: body.slotCount, slotMinutes: body.slotMinutes })) return 'Les créneaux doivent tenir dans la soirée.';
        return null;
      },
      submit: async () => {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!response.ok) {
          let message = id ? 'La modification a échoué.' : 'La création a échoué.';
          try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
          throw new Error(message);
        }
      },
      close: () => { open = false; flashAndReload(id ? 'Soirée mise à jour.' : 'Soirée ajoutée.'); },
      onError: (message) => { error = message; }
    });
    submitting = false;
  }
</script>

<FormSheet bind:open title={session ? 'Modifier la soirée' : 'Nouvelle soirée d’indiv'} description="Une soirée, ses créneaux de trente minutes et les places de chacun." icon={Dumbbell} {error} isSubmitting={submitting} onSubmit={save}>
  <!--
    Un `<select>` natif ouvre la roulette du système : au doigt, on y vise un gymnase
    dans une bande de trente pixels. La rangée mène à un écran de choix où chaque
    gymnase a sa ligne de 44 points.
  -->
  <FormField label="Gymnase" id="indiv-venue">
    <ChoiceField
      id="indiv-venue"
      label="Gymnase"
      value={venueId}
      onChange={(v) => (venueId = v)}
      options={venues.map((venue: { id: number; name: string }) => ({
        value: String(venue.id),
        label: venue.name
      }))}
    />
  </FormField>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <FormField label="Date" id="indiv-date"><Input id="indiv-date" type="date" bind:value={date} /></FormField>
    <FormField label="Début" id="indiv-start"><Input id="indiv-start" type="time" bind:value={startTime} /></FormField>
  </div>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <FormField label="Créneaux" id="indiv-count"><Input id="indiv-count" type="number" min="1" max={MAX_SLOT_COUNT} bind:value={slotCount} /></FormField>
    <FormField label="Minutes" id="indiv-minutes"><Input id="indiv-minutes" type="number" min="5" max={MAX_SLOT_MINUTES} step="5" bind:value={slotMinutes} /></FormField>
    <FormField label="Places" id="indiv-capacity"><Input id="indiv-capacity" type="number" min="1" max={MAX_CAPACITY_PER_SLOT} bind:value={capacityPerSlot} /></FormField>
  </div>
  <FormField label="Libellé (facultatif)" id="indiv-label"><Input id="indiv-label" bind:value={label} placeholder="Indiv mardi" /></FormField>
  <FormField label="Consigne (facultatif)" id="indiv-notes"><Textarea id="indiv-notes" bind:value={notes} rows={2} placeholder="Terrain 4, volants fournis" /></FormField>
</FormSheet>
