<script lang="ts">
  import { onDestroy } from 'svelte';
  import { QrCode as QrIcon, Mail, PenLine, Check } from '@lucide/svelte';
  import { Button, Input, QrCode, SignaturePad, ErrorAlert } from '@nba/ui';
  import type { CashReceiptView } from '../../../shared/cash-store';
  import { cashAction, cashRead, euros, pollUntil } from '../../../shared/cash-ui';

  /**
   * Un reçu ouvert, en attente de la signature du payeur (RF-ACC-003 §3.3).
   *
   * Par défaut le QR code, que le payeur scanne dans son espace adhérent ; l'écran attend
   * la confirmation et passe au vert. En secours, un code par courriel ou la signature au
   * doigt. Le QR code ne vit que 2 minutes : l'écran en redemande un à l'expiration.
   */
  let {
    receipt,
    qr: firstQr,
    qrExpiresAt: firstExpiry,
    onSealed,
    onCancelled
  }: {
    receipt: CashReceiptView;
    qr: string;
    qrExpiresAt: string;
    onSealed: (receipt: CashReceiptView) => void;
    onCancelled: () => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let qr = $state(firstQr);
  // svelte-ignore state_referenced_locally
  let expiresAt = $state(new Date(firstExpiry).getTime());
  // Un payeur extérieur au club n'a pas d'espace adhérent : on part du code, sinon du doigt.
  // svelte-ignore state_referenced_locally
  let mode = $state<'qr' | 'code' | 'signature'>(receipt.payerMemberId ? 'qr' : receipt.payerEmailHint ? 'code' : 'signature');
  let codeSentTo = $state<string | null>(null);
  let code = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);
  let now = $state(Date.now());

  const clock = setInterval(() => (now = Date.now()), 1000);
  const remaining = $derived(Math.max(0, Math.ceil((expiresAt - now) / 1000)));

  // Le QR code expiré se renouvelle tant qu'on est sur cet écran et en mode QR.
  $effect(() => {
    if (mode === 'qr' && remaining === 0 && !busy) void renew();
  });

  const stopPolling = pollUntil(async () => {
    const data = await cashRead<{ receipt: CashReceiptView }>('cash-receipt', receipt.id);
    if (data?.receipt.status === 'sealed') { onSealed(data.receipt); return true; }
    if (data?.receipt.status === 'cancelled') { onCancelled(); return true; }
    return false;
  });

  onDestroy(() => { stopPolling(); clearInterval(clock); });

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    busy = true;
    error = null;
    try { return await fn(); }
    catch (e) { error = e instanceof Error ? e.message : 'Une erreur est survenue.'; }
    finally { busy = false; }
  }

  async function renew() {
    const r = await run(() => cashAction<{ qr: string; qrExpiresAt: string }>('renew_receipt_token', { id: receipt.id }));
    if (r) { qr = r.qr; expiresAt = new Date(r.qrExpiresAt).getTime(); }
  }

  async function sendCode() {
    const r = await run(() => cashAction<{ sentTo: string | null }>('send_code', { id: receipt.id }));
    if (r) { codeSentTo = r.sentTo; code = ''; }
  }

  async function verify(e: SubmitEvent) {
    e.preventDefault();
    const r = await run(() => cashAction<CashReceiptView>('verify_code', { id: receipt.id, code }));
    if (r) { stopPolling(); onSealed(r); }
  }

  async function sign(signature: string) {
    const r = await run(() => cashAction<CashReceiptView>('sign_receipt', { id: receipt.id, signature }));
    if (r) { stopPolling(); onSealed(r); }
  }

  async function cancel() {
    const r = await run(async () => { await cashAction('cancel_receipt', { id: receipt.id }); return true; });
    if (r) { stopPolling(); onCancelled(); }
  }
</script>

<div class="space-y-5" data-testid="cash-receipt-signing">
  <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
    <p class="text-2xl font-bold tabular-nums text-foreground">{euros(receipt.amountCents)}</p>
    <p class="text-sm text-muted-foreground">{receipt.payerName} · {receipt.categoryLabel}{receipt.description ? ` · ${receipt.description}` : ''}</p>
  </div>

  {#if error}<ErrorAlert message={error} />{/if}

  {#if mode === 'qr'}
    <div class="flex flex-col items-center gap-3 text-center">
      <p class="text-sm text-foreground">Le payeur scanne ce QR code avec <strong>« Scanner un reçu »</strong> dans son espace adhérent, puis confirme.</p>
      {#if receipt.payerMemberId}
        <QrCode value={qr} label="QR code du reçu à scanner par le payeur" />
        <p class="text-xs text-muted-foreground tabular-nums">Valable encore {remaining} s · en attente de confirmation…</p>
      {:else}
        <p class="text-sm text-muted-foreground">Ce payeur n'est pas adhérent : pas d'espace adhérent pour scanner. Passez par le code ou la signature.</p>
      {/if}
    </div>
  {:else if mode === 'code'}
    <div class="space-y-3">
      {#if codeSentTo}
        <p class="text-sm text-foreground">Code envoyé à <strong>{codeSentTo}</strong>. Le payeur vous le lit :</p>
        <form class="flex gap-2" onsubmit={verify}>
          <Input bind:value={code} inputmode="numeric" maxlength={4} placeholder="0000" aria-label="Code reçu par le payeur" autocomplete="one-time-code" />
          <Button type="submit" disabled={busy || !/^\d{4}$/.test(code)}><Check data-icon="inline-start" />Valider</Button>
        </form>
        <Button variant="link" onclick={sendCode} disabled={busy}>Renvoyer un code</Button>
      {:else}
        <p class="text-sm text-foreground">Un code à 4 chiffres part sur l'adresse du payeur ({receipt.payerEmailHint}). Il vous le lit, vous le saisissez.</p>
        <Button onclick={sendCode} disabled={busy}><Mail data-icon="inline-start" />Envoyer le code</Button>
      {/if}
    </div>
  {:else}
    <SignaturePad label="Le payeur signe dans le cadre" disabled={busy} onSign={sign} onCancel={receipt.payerMemberId ? () => (mode = 'qr') : undefined} />
  {/if}

  <div class="flex flex-wrap gap-2 border-t border-border pt-4">
    {#if mode !== 'qr' && receipt.payerMemberId}
      <Button variant="outline" size="sm" onclick={() => (mode = 'qr')}><QrIcon data-icon="inline-start" />QR code</Button>
    {/if}
    {#if mode !== 'code' && receipt.payerEmailHint}
      <Button variant="outline" size="sm" onclick={() => (mode = 'code')}><Mail data-icon="inline-start" />Code par courriel</Button>
    {/if}
    {#if mode !== 'signature'}
      <Button variant="outline" size="sm" onclick={() => (mode = 'signature')}><PenLine data-icon="inline-start" />Signature au doigt</Button>
    {/if}
    <Button variant="ghost-danger" size="sm" class="ml-auto" onclick={cancel} disabled={busy}>Abandonner</Button>
  </div>
</div>
