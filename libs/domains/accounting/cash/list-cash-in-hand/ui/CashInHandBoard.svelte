<script lang="ts">
  import { Users } from '@lucide/svelte';
  import { Button, Card, FormField, Input, Select, ErrorAlert } from '@nba/ui';
  import { cashAction, centsFromInput, euros } from '../../../shared/cash-ui';

  /**
   * Les espèces en circulation, par personne, pour le trésorier (RF-ACC-003 §3.5-3.6).
   *
   * « Recevoir » ouvre la remise : il compte l'enveloppe, saisit le montant ; s'il y a un
   * écart, il choisit la catégorie où l'enregistrer. L'écran de signature prend le relais.
   */
  interface OpenedHandover { id: number; expectedCents: number; countedCents: number; gapCents: number; qr: string; qrExpiresAt: string }

  let {
    lines = [],
    categories = [],
    onOpened
  }: {
    lines: { collectorEmail: string; collectorName: string; count: number; totalCents: number; heldSince: string | null }[];
    categories: { id: number; label: string; adminLabel?: string }[];
    onOpened: (handover: OpenedHandover, collectorName: string) => void;
  } = $props();

  let selected = $state<string | null>(null);
  let counted = $state('');
  // La catégorie d'écart se propose d'elle-même si le plan en a une qui le dit.
  let gapCategoryId = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);

  const ligne = $derived(lines.find((l) => l.collectorEmail === selected) ?? null);
  const cents = $derived(centsFromInput(counted));
  const gap = $derived(ligne && Number.isFinite(cents) ? cents - ligne.totalCents : 0);
  const days = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : 0);

  function choisir(email: string) {
    selected = email;
    counted = '';
    error = null;
    const ecart = categories.find((c) => /[ée]cart/i.test(`${c.adminLabel ?? ''} ${c.label}`));
    gapCategoryId = ecart ? String(ecart.id) : '';
  }

  async function ouvrir(e: SubmitEvent) {
    e.preventDefault();
    if (!ligne) return;
    busy = true; error = null;
    try {
      const h = await cashAction<OpenedHandover>('open_handover', {
        collectorEmail: ligne.collectorEmail,
        countedCents: cents,
        gapCategoryId: gap !== 0 ? Number(gapCategoryId) || null : null
      });
      selected = null;
      onOpened(h, ligne.collectorName);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Une erreur est survenue.';
    } finally {
      busy = false;
    }
  }
</script>

<Card.Root class="shadow-sm" data-testid="cash-in-hand">
  <Card.Header class="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
    <Users class="w-5 h-5 text-primary shrink-0" />
    <div>
      <Card.Title class="text-base font-semibold text-foreground">Espèces en circulation</Card.Title>
      <p class="text-xs text-muted-foreground mt-0.5">Ce que chacun détient, reçus signés à l'appui. Au-delà de 7 jours, il est temps de remettre.</p>
    </div>
  </Card.Header>
  <Card.Content class="p-4 sm:p-6 space-y-4">
    {#if lines.length === 0}
      <p class="text-sm text-muted-foreground">Personne ne détient d'espèces.</p>
    {:else}
      <ul class="divide-y divide-border rounded-xl border border-border">
        {#each lines as l (l.collectorEmail)}
          <li class="flex items-center justify-between gap-3 px-3 py-2">
            <span class="min-w-0 text-sm">
              <span class="font-medium text-foreground">{l.collectorName}</span>
              <span class="block text-xs {days(l.heldSince) > 7 ? 'text-destructive' : 'text-muted-foreground'}">{l.count} reçu(s) · depuis {days(l.heldSince)} jour(s)</span>
            </span>
            <span class="tabular-nums font-semibold text-foreground">{euros(l.totalCents)}</span>
            <Button size="sm" variant="outline" onclick={() => choisir(l.collectorEmail)}>Recevoir</Button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if ligne}
      <form class="space-y-3 rounded-xl border border-border p-4" onsubmit={ouvrir}>
        <p class="text-sm text-foreground">Remise de <strong>{ligne.collectorName}</strong> : {ligne.count} reçu(s) pour {euros(ligne.totalCents)}. Comptez l'enveloppe.</p>
        {#if error}<ErrorAlert message={error} />{/if}
        <FormField id="counted" label="Montant compté (€)">
          <Input id="counted" inputmode="decimal" bind:value={counted} placeholder="0,00" class="tabular-nums font-semibold" required />
        </FormField>
        {#if counted && Number.isFinite(cents) && gap !== 0}
          <p class="text-sm text-destructive">Écart de {euros(gap)} : {gap < 0 ? 'il manque de l’argent' : 'il y a trop d’argent'}. Il sera enregistré au nom de {ligne.collectorName}.</p>
          <FormField id="gap-category" label="Catégorie de l'écart">
            <Select id="gap-category" bind:value={gapCategoryId} required>
              <option value="">Choisir…</option>
              {#each categories as c (c.id)}<option value={String(c.id)}>{c.adminLabel ?? c.label}</option>{/each}
            </Select>
          </FormField>
        {/if}
        <div class="flex gap-2">
          <Button type="submit" disabled={busy || !counted || !Number.isFinite(cents) || (gap !== 0 && !gapCategoryId)}>Ouvrir la remise</Button>
          <Button type="button" variant="ghost-muted" onclick={() => (selected = null)}>Annuler</Button>
        </div>
      </form>
    {/if}
  </Card.Content>
</Card.Root>
