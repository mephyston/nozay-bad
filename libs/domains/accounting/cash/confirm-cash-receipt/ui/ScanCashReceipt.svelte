<script lang="ts">
  import { ScanLine, CheckCircle } from '@lucide/svelte';
  import { Button, QrScanner, ErrorAlert } from '@nba/ui';
  import type { CashReceiptPreview } from '../handler';

  /**
   * Côté payeur (RF-ACC-003 §3.3) : il scanne le QR code affiché par l'encaisseur, voit
   * ce qu'il s'apprête à signer, et confirme. Connecté à son espace : c'est ce qui prouve
   * que c'est bien lui.
   */
  let { endpoint = '/api/recu' }: { endpoint?: string } = $props();

  let step = $state<'intro' | 'scan' | 'preview' | 'done'>('intro');
  let qr = $state('');
  let preview = $state<CashReceiptPreview | null>(null);
  let error = $state<string | null>(null);
  let busy = $state(false);

  const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  async function call(action: 'preview' | 'confirm'): Promise<CashReceiptPreview | null> {
    busy = true; error = null;
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, qr }) });
      const body = (await res.json().catch(() => ({}))) as { data?: CashReceiptPreview; error?: string };
      if (!res.ok) { error = body.error || 'Ce QR code ne peut pas être signé.'; return null; }
      return body.data ?? null;
    } catch {
      error = 'Connexion impossible. Réessayez.';
      return null;
    } finally {
      busy = false;
    }
  }

  async function scanned(value: string) {
    qr = value;
    preview = await call('preview');
    step = preview ? 'preview' : 'intro';
  }

  async function confirmer() {
    const r = await call('confirm');
    if (r) { preview = r; step = 'done'; }
  }
</script>

<div class="space-y-4" data-testid="scan-cash-receipt">
  {#if error}<ErrorAlert message={error} />{/if}

  {#if step === 'intro'}
    <p class="text-sm text-muted-foreground">Vous remettez des espèces à un entraîneur ou au bureau ? Scannez le QR code affiché sur son téléphone pour signer votre reçu.</p>
    <Button class="w-full" onclick={() => { error = null; step = 'scan'; }}><ScanLine data-icon="inline-start" />Scanner un reçu</Button>
  {:else if step === 'scan'}
    <QrScanner title="QR code du reçu" hint="Visez le QR code affiché sur le téléphone de celui qui encaisse." onScan={scanned} onCancel={() => (step = 'intro')} />
  {:else if step === 'preview' && preview}
    <div class="rounded-xl border border-border bg-card p-4 space-y-1">
      <p class="text-sm text-muted-foreground">Je remets en espèces</p>
      <p class="text-3xl font-bold tabular-nums text-foreground">{euros(preview.amountCents)}</p>
      <p class="text-sm text-foreground">à <strong>{preview.collectorName}</strong></p>
      <p class="text-sm text-muted-foreground">Pour {preview.payerName} — {preview.motif}{preview.description ? ` (${preview.description})` : ''}</p>
    </div>
    <Button class="w-full" onclick={confirmer} disabled={busy}>Je confirme avoir remis cette somme</Button>
    <Button variant="ghost-muted" class="w-full" onclick={() => (step = 'intro')} disabled={busy}>Ce n'est pas ce que je remets</Button>
  {:else if step === 'done' && preview}
    <div class="flex flex-col items-center gap-2 py-4 text-center">
      <CheckCircle class="w-12 h-12 text-success" />
      <p class="text-lg font-semibold text-foreground">Reçu n° {preview.id} signé</p>
      <p class="text-sm text-muted-foreground">{euros(preview.amountCents)} remis à {preview.collectorName}. Votre exemplaire arrive par courriel.</p>
      <Button variant="outline" onclick={() => { preview = null; qr = ''; step = 'intro'; }}>Scanner un autre reçu</Button>
    </div>
  {/if}
</div>
