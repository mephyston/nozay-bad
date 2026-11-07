<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { ChevronRight, QrCode } from '@lucide/svelte';
  import { dateTime, euros, MOVEMENT_LABELS, signedEuros } from '../lib/format';

  interface Wallet {
    email: string;
    balanceCents: number;
    reservedCents: number;
    movements: { id: number; type: string; amountCents: number; createdAt: string }[];
  }

  let { initial }: { initial: Wallet | null } = $props();

  // svelte-ignore state_referenced_locally
  let wallet = $state<Wallet | null>(initial);
  let timer: ReturnType<typeof setInterval> | undefined;

  // Le solde suit la buvette : un achat apparaît sans recharger la page.
  async function refresh() {
    if (document.visibilityState !== 'visible') return;
    const res = await fetch('/api/wallet', { cache: 'no-store' }).catch(() => null);
    if (res?.status === 401) location.reload();
    const payload = (await res?.json().catch(() => null)) as any;
    if (payload?.ok) wallet = payload.data;
  }

  onMount(() => {
    timer = setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
  });

  onDestroy(() => {
    clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refresh);
  });
</script>

<section class="bg-card rounded-2xl border p-5">
  <p class="text-muted-foreground text-sm">Mon solde</p>
  <p class="text-4xl font-semibold tabular-nums">{wallet ? euros(wallet.balanceCents) : '—'}</p>
  {#if wallet && wallet.reservedCents > 0}
    <p class="text-muted-foreground mt-1 text-sm">dont {euros(wallet.reservedCents)} réservés par une vente en cours</p>
  {/if}
  <a href="/qr" class="bg-primary text-primary-foreground mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl font-semibold no-underline">
    <QrCode class="size-5" />Afficher mon QR code
  </a>
</section>

<section class="space-y-2">
  <h1 class="text-lg font-semibold">Mes transactions</h1>
  {#if wallet?.movements.length}
    <ul class="bg-card divide-y overflow-hidden rounded-2xl border">
      {#each wallet.movements as movement (movement.id)}
        <li>
          <a href={`/transactions/${movement.id}`} class="active:bg-muted flex min-h-[3.25rem] items-center gap-3 px-4 py-2.5 no-underline">
            <span class="min-w-0 flex-1">
              <span class="text-foreground block truncate text-sm font-semibold">{MOVEMENT_LABELS[movement.type]}</span>
              <span class="text-muted-foreground block text-xs">{dateTime(movement.createdAt)}</span>
            </span>
            <span class="text-foreground shrink-0 text-sm font-medium tabular-nums">{signedEuros(movement.amountCents)}</span>
            <ChevronRight class="text-muted-foreground size-4 shrink-0" />
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-muted-foreground text-sm">Aucune transaction pour l'instant. Passez à la buvette pour recharger votre carte.</p>
  {/if}
</section>
