<script lang="ts">
  import { Dumbbell } from '@lucide/svelte';
  import { ChoiceField, Input, Textarea, FormField, FormSheet, submitForm, flashAndReload } from '@nba/ui';
  import { DEFAULT_CAPACITY_PER_SLOT, DEFAULT_SLOT_COUNT, DEFAULT_SLOT_MINUTES, MAX_CAPACITY_PER_SLOT, MAX_SLOT_COUNT, MAX_SLOT_MINUTES, isValidLayout } from '../../../shared/indiv';
  import { defaultIndivStartTime } from '../../../shared/session-hours';
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
  // Tant que l'heure n'a pas été touchée, elle suit le jour choisi : 10 h le dimanche, 19 h 30 sinon.
  let startTouched = false;

  /** Des listes plutôt qu'une saisie libre : au doigt, on choisit parmi quelques valeurs. */
  const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
  const COUNT_OPTIONS = range(1, MAX_SLOT_COUNT).map((n) => ({ value: String(n), label: n === 1 ? '1 créneau' : `${n} créneaux` }));
  const MINUTES_OPTIONS = range(15, MAX_SLOT_MINUTES, 15).map((n) => ({ value: String(n), label: `${n} min` }));
  const CAPACITY_OPTIONS = range(1, MAX_CAPACITY_PER_SLOT).map((n) => ({ value: String(n), label: n === 1 ? '1 place' : `${n} places` }));
  /** Une valeur enregistrée hors de la liste (25 min, par exemple) reste choisie et visible. */
  const withValue = (options: { value: string; label: string }[], value: string, unit: string) =>
    options.some((o) => o.value === value) ? options : [...options, { value, label: `${value} ${unit}` }].sort((a, b) => Number(a.value) - Number(b.value));

  // À l'ouverture, le formulaire reflète la soirée éditée — ou l'habitude du club.
  $effect(() => {
    if (!open) return;
    date = session?.date ?? '';
    startTime = session?.startTime ?? defaultIndivStartTime(date);
    startTouched = Boolean(session);
    venueId = String(session?.venueId ?? venues[0]?.id ?? '');
    slotCount = String(session?.slotCount ?? DEFAULT_SLOT_COUNT);
    slotMinutes = String(session?.slotMinutes ?? DEFAULT_SLOT_MINUTES);
    capacityPerSlot = String(session?.capacityPerSlot ?? DEFAULT_CAPACITY_PER_SLOT);
    label = session?.label ?? '';
    notes = session?.notes ?? '';
    error = null;
  });

  function onDateChange() {
    if (!startTouched) startTime = defaultIndivStartTime(date);
  }

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
    Une liste déroulante native ouvre la roulette du système : au doigt, on y vise un gymnase
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
    <FormField label="Date" id="indiv-date"><Input id="indiv-date" type="date" bind:value={date} onchange={onDateChange} /></FormField>
    <FormField label="Début" id="indiv-start"><Input id="indiv-start" type="time" bind:value={startTime} oninput={() => (startTouched = true)} /></FormField>
  </div>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <FormField label="Créneaux" id="indiv-count">
      <ChoiceField id="indiv-count" label="Créneaux" value={slotCount} onChange={(v) => (slotCount = v)} options={withValue(COUNT_OPTIONS, slotCount, 'créneaux')} />
    </FormField>
    <FormField label="Durée d'un créneau" id="indiv-minutes">
      <ChoiceField id="indiv-minutes" label="Durée d'un créneau" value={slotMinutes} onChange={(v) => (slotMinutes = v)} options={withValue(MINUTES_OPTIONS, slotMinutes, 'min')} />
    </FormField>
    <FormField label="Places par créneau" id="indiv-capacity" hint="Deux, à l'habitude du club.">
      <ChoiceField id="indiv-capacity" label="Places par créneau" value={capacityPerSlot} onChange={(v) => (capacityPerSlot = v)} options={withValue(CAPACITY_OPTIONS, capacityPerSlot, 'places')} />
    </FormField>
  </div>
  <FormField label="Libellé (facultatif)" id="indiv-label"><Input id="indiv-label" bind:value={label} placeholder="Indiv mardi" /></FormField>
  <FormField label="Consigne (facultatif)" id="indiv-notes"><Textarea id="indiv-notes" bind:value={notes} rows={2} placeholder="Terrain 4, volants fournis" /></FormField>
</FormSheet>
