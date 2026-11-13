<script lang="ts">
  import { Wallet, ScanLine, CheckCircle } from '@lucide/svelte';
  import { Button, Card, QrScanner, ErrorAlert } from '@nba/ui';
  import type { CashReceiptView } from '../../../shared/cash-store';
  import { cashAction, euros } from '../../../shared/cash-ui';

  /**
   * Ce que l'encaisseur détient : ses reçus signés, pas encore remis (RF-ACC-003 §3.5).
   *
   * C'est aussi d'ici qu'il signe sa remise : il scanne le QR code affiché chez le
   * trésorier, connecté avec son propre compte (§3.6).
   */
  let { receipts = [], totalCents = 0, onHandedOver }: {
    receipts: CashReceiptView[];
    totalCents: number;
    onHandedOver?: () => void;
  } = $props();

  let scanning = $state(false);
  let error = $state<string | null>(null);
  let done = $state<{ receipts: number; gapCents: number } | null>(null);

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '');

  async function scanned(qr: string) {
    scanning = false;
    error = null;
    try {
      done = await cashAction('confirm_handover', { qr });
      onHandedOver?.();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Une erreur est survenue.';
    }
  }
</script>

<Card.Root class="shadow-sm" data-testid="held-cash-receipts">
  <Card.Header class="px-5 py-4 border-b border-border flex flex-row items-center gap-3">
    <Wallet class="w-5 h-5 text-primary shrink-0" />
    <div class="flex-1">
      <Card.Title class="text-base font-semibold text-foreground">Espèces en ma possession</Card.Title>
      <p class="text-xs text-muted-foreground mt-0.5">À remettre au trésorier : il compte, puis vous scannez le QR code de la remise.</p>
    </div>
    <span class="text-lg font-bold tabular-nums text-foreground">{euros(totalCents)}</span>
  </Card.Header>
  <Card.Content class="p-4 sm:p-6 space-y-4">
    {#if error}<ErrorAlert message={error} />{/if}
    {#if done}
      <p class="flex items-center gap-2 text-sm text-foreground"><CheckCircle class="w-4 h-4 text-success" />Remise signée : {done.receipts} reçu(s){done.gapCents !== 0 ? `, écart de ${euros(done.gapCents)}` : ''}.</p>
    {/if}
    {#if scanning}
      <QrScanner title="QR code de la remise" hint="Visez le QR code affiché sur l'écran du trésorier." onScan={scanned} onCancel={() => (scanning = false)} />
    {:else if receipts.length === 0}
      <p class="text-sm text-muted-foreground">Vous ne détenez aucune espèce.</p>
    {:else}
      <ul class="divide-y divide-border rounded-xl border border-border">
        {#each receipts as r (r.id)}
          <li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span class="min-w-0">
              <span class="font-medium text-foreground">{r.payerName}</span>
              <span class="block text-xs text-muted-foreground">n° {r.id} · {r.categoryLabel} · {date(r.signedAt)}{r.signatureMethod === 'signature' ? ' · signé à l’écran' : ''}</span>
            </span>
            <span class="tabular-nums font-medium text-foreground whitespace-nowrap">{euros(r.amountCents)}</span>
          </li>
        {/each}
      </ul>
      <Button variant="outline" onclick={() => { done = null; scanning = true; }}><ScanLine data-icon="inline-start" />Scanner la remise du trésorier</Button>
    {/if}
  </Card.Content>
</Card.Root>
