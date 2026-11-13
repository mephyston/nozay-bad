<script lang="ts">
  import { onDestroy } from 'svelte';
  import { CheckCircle } from '@lucide/svelte';
  import { Button, QrCode, SignaturePad, ErrorAlert } from '@nba/ui';
  import { cashAction, cashRead, euros, pollUntil } from '../../../shared/cash-ui';

  /**
   * La remise ouverte par le trésorier, en attente de la signature de l'encaisseur
   * (RF-ACC-003 §3.6) : il scanne ce QR code depuis l'admin, sur son propre téléphone,
   * ou signe au doigt ici en dernier recours. À la signature, les écritures sont passées.
   */
  let {
    handover,
    collectorName,
    onDone
  }: {
    handover: { id: number; expectedCents: number; countedCents: number; gapCents: number; qr: string; qrExpiresAt: string };
    collectorName: string;
    onDone: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let qr = $state(handover.qr);
  // svelte-ignore state_referenced_locally
  let expiresAt = $state(new Date(handover.qrExpiresAt).getTime());
  let now = $state(Date.now());
  let signing = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let sealed = $state(false);

  const clock = setInterval(() => (now = Date.now()), 1000);
  const remaining = $derived(Math.max(0, Math.ceil((expiresAt - now) / 1000)));

  $effect(() => {
    if (!sealed && !signing && remaining === 0 && !busy) void renew();
  });

  const stopPolling = pollUntil(async () => {
    const data = await cashRead<{ handover: { status: string } }>('cash-handover', handover.id);
    if (data?.handover.status === 'sealed') { sealed = true; return true; }
    if (data?.handover.status === 'cancelled') { onDone(); return true; }
    return false;
  });
  onDestroy(() => { stopPolling(); clearInterval(clock); });

  async function run(fn: () => Promise<void>) {
    busy = true; error = null;
    try { await fn(); } catch (e) { error = e instanceof Error ? e.message : 'Une erreur est survenue.'; } finally { busy = false; }
  }
  const renew = () => run(async () => {
    const r = await cashAction<{ qr: string; qrExpiresAt: string }>('renew_handover_token', { id: handover.id });
    qr = r.qr; expiresAt = new Date(r.qrExpiresAt).getTime();
  });
  const sign = (signature: string) => run(async () => { await cashAction('sign_handover', { id: handover.id, signature }); stopPolling(); sealed = true; });
  const cancel = () => run(async () => { await cashAction('cancel_handover', { id: handover.id }); stopPolling(); onDone(); });
</script>

<div class="space-y-4" data-testid="handover-signing">
  <dl class="grid grid-cols-3 gap-2 text-center">
    <div class="rounded-xl border border-border px-2 py-2"><dt class="text-xs text-muted-foreground">Reçus</dt><dd class="font-semibold tabular-nums">{euros(handover.expectedCents)}</dd></div>
    <div class="rounded-xl border border-border px-2 py-2"><dt class="text-xs text-muted-foreground">Compté</dt><dd class="font-semibold tabular-nums">{euros(handover.countedCents)}</dd></div>
    <div class="rounded-xl border px-2 py-2 {handover.gapCents === 0 ? 'border-border' : 'border-destructive/40 bg-destructive/5'}">
      <dt class="text-xs text-muted-foreground">Écart</dt><dd class="font-semibold tabular-nums {handover.gapCents === 0 ? '' : 'text-destructive'}">{euros(handover.gapCents)}</dd>
    </div>
  </dl>

  {#if error}<ErrorAlert message={error} />{/if}

  {#if sealed}
    <div class="flex flex-col items-center gap-2 py-3 text-center">
      <CheckCircle class="w-10 h-10 text-success" />
      <p class="font-semibold text-foreground">Remise signée, recettes passées en Caisse.</p>
      <Button onclick={onDone}>Terminer</Button>
    </div>
  {:else if signing}
    <SignaturePad label="{collectorName} signe la remise" disabled={busy} onSign={sign} onCancel={() => (signing = false)} />
  {:else}
    <div class="flex flex-col items-center gap-3 text-center">
      <p class="text-sm text-foreground"><strong>{collectorName}</strong> scanne ce QR code depuis l'admin, sur son téléphone : « Espèces » › « Scanner la remise du trésorier ».</p>
      <QrCode value={qr} label="QR code de la remise à scanner par l'encaisseur" />
      <p class="text-xs text-muted-foreground tabular-nums">Valable encore {remaining} s · en attente de signature…</p>
    </div>
    <div class="flex gap-2 border-t border-border pt-4">
      <Button variant="outline" size="sm" onclick={() => (signing = true)}>Signature au doigt</Button>
      <Button variant="ghost-danger" size="sm" class="ml-auto" onclick={cancel} disabled={busy}>Abandonner</Button>
    </div>
  {/if}
</div>
