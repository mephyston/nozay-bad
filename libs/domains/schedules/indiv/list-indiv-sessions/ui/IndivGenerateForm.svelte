<script lang="ts">
  import { CalendarPlus } from '@lucide/svelte';
  import { Input, Checkbox, Label, FormField, FormSheet, submitForm, flashAndReload } from '@nba/ui';
  import { DEFAULT_CAPACITY_PER_SLOT, DEFAULT_SLOT_COUNT, DEFAULT_SLOT_MINUTES, MAX_CAPACITY_PER_SLOT, MAX_SLOT_COUNT, MAX_SLOT_MINUTES } from '../../../shared/indiv';

  /**
   * Dérouler les créneaux marqués « séances individuelles » en soirées d'indiv, sur une période.
   *
   * Rejouable : ce qui existe déjà est ignoré, et le décompte le dit.
   */
  interface SlotRow { id: number; weekday: number; startTime: string; endTime: string; label: string | null; venue?: { name: string } | null }

  let { open = $bindable(false), slots = [], endpoint } = $props<{ open: boolean; slots: SlotRow[]; endpoint: string }>();

  const WEEKDAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  let from = $state('');
  let to = $state('');
  let startTime = $state('');
  let slotCount = $state(String(DEFAULT_SLOT_COUNT));
  let slotMinutes = $state(String(DEFAULT_SLOT_MINUTES));
  let capacityPerSlot = $state(String(DEFAULT_CAPACITY_PER_SLOT));
  let slotIds = $state<number[]>([]);
  let error = $state<string | null>(null);
  let submitting = $state(false);

  $effect(() => {
    if (!open) return;
    // Par défaut, tous les créneaux d'indiv : le cas courant est « déroule-moi la période ».
    slotIds = slots.map((slot: SlotRow) => slot.id);
    from = '';
    to = '';
    startTime = '';
    error = null;
  });

  function toggle(id: number) {
    slotIds = slotIds.includes(id) ? slotIds.filter((s) => s !== id) : [...slotIds, id];
  }

  async function generate(event: Event) {
    event.preventDefault();
    submitting = true;
    let result: { created: number; skipped: number } | null = null;
    await submitForm({
      validate: () => {
        if (!from || !to) return 'Choisissez une période.';
        if (to < from) return 'La fin de période doit suivre son début.';
        if (slotIds.length === 0) return 'Choisissez au moins un créneau.';
        return null;
      },
      submit: async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate', from, to, slotIds,
            startTime: startTime || undefined,
            slotCount: Number(slotCount), slotMinutes: Number(slotMinutes), capacityPerSlot: Number(capacityPerSlot)
          })
        });
        const payload = (await response.json().catch(() => ({}))) as { data?: { created: number; skipped: number }; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'La génération a échoué.');
        result = payload.data ?? null;
      },
      close: () => {
        open = false;
        const r = result;
        flashAndReload(
          !r || r.created === 0
            ? `Aucune nouvelle soirée : ${r?.skipped ?? 0} existaient déjà sur la période.`
            : `${r.created} soirée${r.created > 1 ? 's' : ''} créée${r.created > 1 ? 's' : ''}${r.skipped > 0 ? `, ${r.skipped} existaient déjà` : ''}.`
        );
      },
      onError: (message) => { error = message; }
    });
    submitting = false;
  }
</script>

<FormSheet bind:open title="Programmer les soirées d’indiv" description="Une soirée par occurrence des créneaux choisis, parmi ceux marqués « séances individuelles » dans les horaires. Rejouer une période ne crée rien en double." icon={CalendarPlus} {error} isSubmitting={submitting} submitLabel="Programmer" onSubmit={generate}>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <FormField label="Du" id="gen-from"><Input id="gen-from" type="date" bind:value={from} /></FormField>
    <FormField label="Au" id="gen-to"><Input id="gen-to" type="date" bind:value={to} /></FormField>
  </div>
  <div class="space-y-2">
    <Label class="text-sm font-medium">Créneaux d’indiv</Label>
    {#each slots as slot (slot.id)}
      <label class="flex items-center gap-2 text-sm">
        <Checkbox checked={slotIds.includes(slot.id)} onCheckedChange={() => toggle(slot.id)} aria-label={`${WEEKDAYS[slot.weekday]} ${slot.startTime}`} />
        <span>{WEEKDAYS[slot.weekday]} {slot.startTime}–{slot.endTime}{slot.label ? ` · ${slot.label}` : ''}{slot.venue?.name ? ` · ${slot.venue.name}` : ''}</span>
      </label>
    {/each}
  </div>
  <FormField label="Heure de début (vide = celle du créneau)" id="gen-start"><Input id="gen-start" type="time" bind:value={startTime} /></FormField>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <FormField label="Créneaux" id="gen-count"><Input id="gen-count" type="number" min="1" max={MAX_SLOT_COUNT} bind:value={slotCount} /></FormField>
    <FormField label="Minutes" id="gen-minutes"><Input id="gen-minutes" type="number" min="5" max={MAX_SLOT_MINUTES} step="5" bind:value={slotMinutes} /></FormField>
    <FormField label="Places" id="gen-capacity"><Input id="gen-capacity" type="number" min="1" max={MAX_CAPACITY_PER_SLOT} bind:value={capacityPerSlot} /></FormField>
  </div>
</FormSheet>
