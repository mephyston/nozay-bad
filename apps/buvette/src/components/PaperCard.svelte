<script lang="ts">
  import { Button } from '@nba/ui';
  import { euros } from '../lib/format';

  interface View {
    label: string;
    balanceCents: number;
    status: 'new' | 'active' | 'closed';
    closedReason: string | null;
  }

  let { code, card, signedIn }: { code: string; card: View | null; signedIn: boolean } = $props();

  let busy = $state(false);
  let error = $state('');

  async function attach() {
    busy = true;
    error = '';
    const res = await fetch('/api/attach-paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    }).catch(() => null);
    const payload = (await res?.json().catch(() => null)) as any;
    if (payload?.ok) {
      location.href = '/';
      return;
    }
    error = payload?.error || 'Connexion impossible. Vérifiez votre réseau.';
    busy = false;
  }
</script>

{#if !card}
  <h1 class="text-lg font-semibold">Carte introuvable</h1>
  <p class="text-muted-foreground text-sm">Ce code ne correspond à aucune carte. Demandez à la buvette.</p>
{:else}
  <section class="bg-card rounded-2xl border p-5">
    <p class="text-muted-foreground text-sm">{card.label}</p>
    <p class="text-4xl font-semibold tabular-nums">{euros(card.balanceCents)}</p>
  </section>

  {#if error}
    <p role="alert" class="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</p>
  {/if}

  {#if card.status === 'closed'}
    <p class="text-sm">
      {card.closedReason === 'refunded' ? 'Cette carte a déjà été remboursée : elle ne vaut plus rien.' : 'Cette carte a été transférée sur un compte : elle ne vaut plus rien.'}
    </p>
  {:else if card.status === 'new'}
    <p class="text-sm">Cette carte n'a pas encore été vendue. Elle s'active à la buvette.</p>
  {:else if card.balanceCents === 0}
    <p class="text-sm">Cette carte est vide.</p>
  {:else}
    <p class="text-sm">
      Transférez ce solde sur votre compte : vous le retrouverez sur votre téléphone, même en changeant d'appareil. La carte papier ne vaudra plus rien.
    </p>
    {#if signedIn}
      <Button size="lg" class="h-12 w-full" disabled={busy} onclick={attach}>Transférer {euros(card.balanceCents)} sur mon compte</Button>
    {:else}
      <a href={`/connexion?next=${encodeURIComponent(`/carte/${code}`)}`} class="bg-primary text-primary-foreground flex min-h-12 items-center justify-center rounded-xl font-semibold no-underline">
        Me connecter pour la rattacher
      </a>
    {/if}
  {/if}
{/if}
