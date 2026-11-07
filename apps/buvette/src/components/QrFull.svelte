<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import qrcode from 'qrcode-generator';

  let qrImage = $state('');
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
      error = '';
    } catch {
      qrImage = '';
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
<p class="text-muted-foreground text-center text-sm">Présentez ce code à la buvette. Il se renouvelle tout seul.</p>
