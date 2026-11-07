<script lang="ts">
  import { Minus, Plus } from '@lucide/svelte';
  import { Button } from '@nba/ui';
  import { euros } from '../lib/format';

  interface Item {
    id: number;
    name: string;
    priceCents: number;
  }

  interface Order {
    id: number;
    number: number;
    totalCents: number;
    lines: { itemId: number; name: string; quantity: number; unitPriceCents: number }[];
  }

  let { open, items, current, balanceCents }: { open: boolean; items: Item[]; current: Order | null; balanceCents: number } = $props();

  // svelte-ignore state_referenced_locally
  let order = $state<Order | null>(current);
  // svelte-ignore state_referenced_locally
  let editing = $state(!current);
  let cart = $state(new Map<number, number>());
  let error = $state('');
  let busy = $state(false);

  const totalCents = $derived(items.reduce((sum, item) => sum + (cart.get(item.id) ?? 0) * item.priceCents, 0));
  const restCents = $derived(Math.max(0, totalCents - balanceCents));

  function add(id: number, delta: number) {
    const next = new Map(cart);
    const quantity = (next.get(id) ?? 0) + delta;
    if (quantity > 0) next.set(id, quantity);
    else next.delete(id);
    cart = next;
  }

  function edit() {
    cart = new Map(order?.lines.filter((l) => items.some((i) => i.id === l.itemId)).map((l) => [l.itemId, l.quantity]) ?? []);
    editing = true;
  }

  async function submit() {
    busy = true;
    error = '';
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: [...cart].map(([itemId, quantity]) => ({ itemId, quantity })) })
    }).catch(() => null);
    const payload = (await res?.json().catch(() => null)) as any;
    if (payload?.ok) {
      location.href = '/qr';
      return;
    }
    error = payload?.error || 'Connexion impossible. Vérifiez votre réseau.';
    busy = false;
  }

  async function cancel() {
    busy = true;
    const res = await fetch('/api/order-cancel', { method: 'POST' }).catch(() => null);
    busy = false;
    if (!res?.ok) {
      error = "L'annulation n'a pas abouti. Réessayez.";
      return;
    }
    order = null;
    cart = new Map();
    editing = true;
  }
</script>

{#if error}
  <p role="alert" class="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</p>
{/if}

{#if order && !editing}
  <h1 class="text-lg font-semibold">Ma commande n° {order.number}</h1>
  <ul class="bg-card divide-y rounded-2xl border">
    {#each order.lines as line (line.itemId)}
      <li class="flex justify-between gap-3 px-4 py-3 text-sm">
        <span>{line.quantity} × {line.name}</span>
        <span class="tabular-nums">{euros(line.quantity * line.unitPriceCents)}</span>
      </li>
    {/each}
    <li class="flex justify-between gap-3 px-4 py-3 font-semibold"><span>Total</span><span class="tabular-nums">{euros(order.totalCents)}</span></li>
  </ul>
  <a href="/qr" class="bg-primary text-primary-foreground flex min-h-12 items-center justify-center rounded-xl font-semibold no-underline">Présenter à la buvette</a>
  <Button variant="outline" class="w-full" onclick={edit}>Modifier ma commande</Button>
  <Button variant="ghost" class="w-full" disabled={busy} onclick={cancel}>Annuler ma commande</Button>
{:else if !open}
  <h1 class="text-lg font-semibold">Commander</h1>
  <p class="text-muted-foreground text-sm">La buvette est fermée pour le moment. Vous pourrez commander dès son ouverture.</p>
{:else if items.length === 0}
  <h1 class="text-lg font-semibold">Commander</h1>
  <p class="text-muted-foreground text-sm">Aucun article disponible pour le moment.</p>
{:else}
  <h1 class="text-lg font-semibold">Commander</h1>
  <p class="text-muted-foreground text-sm">Préparez votre commande, puis présentez votre QR code à la buvette. Rien n'est débité avant.</p>
  <ul class="bg-card divide-y rounded-2xl border pb-0">
    {#each items as item (item.id)}
      {@const quantity = cart.get(item.id) ?? 0}
      <li class="flex items-center gap-2 px-4 py-2.5">
        <span class="min-w-0 grow">
          <span class="block truncate text-sm font-semibold">{item.name}</span>
          <span class="text-muted-foreground text-xs tabular-nums">{euros(item.priceCents)}</span>
        </span>
        {#if quantity > 0}
          <Button variant="outline" size="icon" aria-label={`Retirer ${item.name}`} onclick={() => add(item.id, -1)}><Minus /></Button>
          <span class="w-6 text-center text-sm tabular-nums">{quantity}</span>
        {/if}
        <Button variant="outline" size="icon" aria-label={`Ajouter ${item.name}`} onclick={() => add(item.id, 1)}><Plus /></Button>
      </li>
    {/each}
  </ul>
  {#if totalCents > 0}
    <section class="bg-card space-y-2 rounded-2xl border p-4">
      {#if restCents > 0}
        <p class="text-muted-foreground text-sm">Votre carte couvre {euros(totalCents - restCents)}. Il restera {euros(restCents)} à régler à la buvette.</p>
      {/if}
      <Button size="lg" class="h-12 w-full" disabled={busy} onclick={submit}>Commander pour {euros(totalCents)}</Button>
    </section>
  {/if}
{/if}
