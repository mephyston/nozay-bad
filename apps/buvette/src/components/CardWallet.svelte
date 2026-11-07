<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import qrcode from 'qrcode-generator';
  import { Button } from '@nba/ui';

  interface Props {
    clubName: string;
  }

  interface Wallet {
    email: string;
    balanceCents: number;
    movements: { id: number; type: 'recharge' | 'debit' | 'refund' | 'cancel'; amountCents: number; createdAt: string }[];
  }

  let { clubName }: Props = $props();

  const LABELS = { recharge: 'Recharge', debit: 'Achat', refund: 'Remboursement', cancel: 'Annulation' };

  let wallet = $state<Wallet | null>(null);
  let qrImage = $state('');
  let error = $state('');
  let notice = $state('');
  let timers: ReturnType<typeof setInterval>[] = [];

  const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const day = (value: string) => new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  async function get(path: string) {
    const res = await fetch(`/api/${path}`, { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    // Appareil déconnecté depuis un autre : retour à l'écran de connexion.
    if (res.status === 401) {
      await fetch('/api/logout', { method: 'POST' });
      location.reload();
    }
    if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Connexion impossible. Vérifiez votre réseau.');
    return payload.data;
  }

  async function refreshQr() {
    try {
      const { token } = await get('qr-token');
      const qr = qrcode(0, 'M');
      qr.addData(token);
      qr.make();
      qrImage = qr.createDataURL(6, 2);
      error = '';
    } catch (e) {
      qrImage = '';
      error = e instanceof Error ? e.message : 'Connexion impossible.';
    }
  }

  async function refreshWallet() {
    try {
      wallet = await get('wallet');
    } catch {
      // Le QR code signale déjà un défaut de réseau : le dernier solde reste affiché.
    }
  }

  function refreshAll() {
    if (document.visibilityState !== 'visible') return;
    refreshQr();
    refreshWallet();
  }

  onMount(() => {
    refreshAll();
    // Le QR code vit 60 secondes : on le renouvelle avant qu'il n'expire.
    timers = [setInterval(refreshQr, 45_000), setInterval(refreshWallet, 15_000)];
    document.addEventListener('visibilitychange', refreshAll);
  });

  onDestroy(() => {
    timers.forEach(clearInterval);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refreshAll);
  });

  async function revoke() {
    const res = await fetch('/api/revoke-devices', { method: 'POST' });
    notice = res.ok ? 'Les autres appareils sont déconnectés. Le solde ne change pas.' : "Cette action n'a pas abouti. Réessayez.";
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
  }
</script>

<h1 class="text-xl font-semibold">{clubName ? `Carte buvette ${clubName}` : 'Carte buvette'}</h1>

{#if wallet}
  <p class="text-4xl font-semibold">{euros(wallet.balanceCents)}</p>
{/if}

{#if error}
  <p role="alert" class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</p>
{/if}

<div class="bg-card flex aspect-square items-center justify-center rounded-lg border p-4">
  {#if qrImage}
    <!-- Fond blanc obligatoire : un QR code sur fond sombre se lit mal à la caméra. -->
    <img src={qrImage} alt="QR code de votre carte" class="w-full rounded bg-white" style="image-rendering: pixelated" />
  {:else}
    <p class="text-muted-foreground">Préparation du QR code…</p>
  {/if}
</div>
<p class="text-muted-foreground text-center text-sm">Présentez ce code à la buvette. Il se renouvelle tout seul.</p>

{#if notice}
  <p role="status" class="bg-muted rounded-md p-3 text-sm">{notice}</p>
{/if}

{#if wallet?.movements.length}
  <section class="space-y-2">
    <h2 class="font-medium">Historique</h2>
    <ul class="divide-y rounded-lg border">
      {#each wallet.movements as movement (movement.id)}
        <li class="flex justify-between gap-2 p-2 text-sm">
          <span>{LABELS[movement.type]}<span class="text-muted-foreground"> · {day(movement.createdAt)}</span></span>
          <span class="font-medium">{movement.amountCents > 0 ? '+' : ''}{euros(movement.amountCents)}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<section class="space-y-2">
  {#if wallet}
    <p class="text-muted-foreground text-sm">Carte rattachée à {wallet.email}. Pour récupérer votre solde, demandez un remboursement à la buvette.</p>
  {/if}
  <Button variant="outline" class="w-full" onclick={revoke}>Déconnecter les autres appareils</Button>
  <Button variant="ghost" class="w-full" onclick={logout}>Fermer sur cet appareil</Button>
</section>
