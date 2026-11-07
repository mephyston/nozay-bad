<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import qrcode from 'qrcode-generator';
  import { euros } from '../lib/format';

  let qrImage = $state('');
  let code = $state('');
  let order = $state<{ number: number; totalCents: number; lines: { itemId: number; name: string; quantity: number }[] } | null>(null);
  let error = $state('');
  let timer: ReturnType<typeof setInterval> | undefined;
  let wakeLock: { release: () => Promise<void> } | null = null;

  async function refresh() {
    if (document.visibilityState !== 'visible') return;
    try {
      const res = await fetch('/api/qr-token', { cache: 'no-store' });
      if (res.status === 401) {
        await fetch('/api/logout', { method: 'POST' });
        location.href = '/connexion';
        return;
      }
      const payload = (await res.json()) as any;
      if (!payload?.ok) throw new Error();
      const qr = qrcode(0, 'M');
      qr.addData(payload.data.token);
      qr.make();
      qrImage = qr.createDataURL(10, 2);
      code = payload.data.code;
      error = '';
      const current = (await (await fetch('/api/order', { cache: 'no-store' })).json().catch(() => null)) as any;
      order = current?.ok ? current.data : null;
    } catch {
      qrImage = '';
      code = '';
      error = 'Connexion impossible. Vérifiez votre réseau.';
    }
  }

  // L'écran reste allumé devant la caisse, là où le navigateur le permet.
  async function keepAwake() {
    try {
      wakeLock = await (navigator as any).wakeLock?.request('screen');
    } catch {
      wakeLock = null;
    }
  }

  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    refresh();
    keepAwake();
  }

  onMount(() => {
    onVisible();
    // Le QR code vit 60 secondes : on le renouvelle avant qu'il n'expire.
    timer = setInterval(refresh, 45_000);
    document.addEventListener('visibilitychange', onVisible);
  });

  onDestroy(() => {
    clearInterval(timer);
    wakeLock?.release().catch(() => {});
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
  });
</script>

{#if error}
  <p role="alert" class="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</p>
{/if}

<!-- Fond blanc, même en thème sombre : un QR code sur fond sombre se lit mal à la caméra. -->
<div class="flex aspect-square w-full items-center justify-center rounded-2xl bg-white p-3">
  {#if qrImage}
    <img src={qrImage} alt="QR code de votre carte" class="w-full" style="image-rendering: pixelated" />
  {:else if !error}
    <p class="text-sm text-black">Préparation du QR code…</p>
  {/if}
</div>
{#if code}
  <p class="text-center font-mono text-2xl font-semibold tracking-wider" aria-label="Code à donner si le QR code ne se lit pas">{code}</p>
{/if}
{#if order}
  <section class="bg-card rounded-2xl border p-4 text-center">
    <p class="text-lg font-semibold">Commande n° {order.number} · {euros(order.totalCents)}</p>
    <p class="text-muted-foreground text-sm">{order.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ')}</p>
  </section>
{/if}
<p class="text-muted-foreground text-center text-sm">
  {order ? 'Présentez ce QR code à la buvette, ou donnez votre numéro de commande.' : 'Présentez ce QR code à la buvette, ou donnez le code affiché dessous. Ils se renouvellent tout seuls.'}
</p>
