<script lang="ts">
  import { Banknote, CreditCard, Wallet } from '@lucide/svelte';
  import { formatEuros } from '../lib/cart';

  /**
   * Ce que le bénévole remet, et ce qu'il ne remet pas. Le même bloc avant l'action (ce qui va
   * se passer) et après (ce qui s'est passé) : les espèces toujours en premier, en grand, même à
   * zéro, et chaque part rendue ailleurs dit qu'elle ne se rend pas en espèces.
   */
  interface SumUpPart {
    amountCents: number;
    state: 'planned' | 'done' | 'pending' | 'failed';
  }

  let {
    phase,
    cashCents,
    sumUp = [],
    cardCents = 0,
    cardLabel = '',
    cashNotes = []
  }: {
    phase: 'before' | 'after';
    cashCents: number;
    sumUp?: SumUpPart[];
    cardCents?: number;
    cardLabel?: string;
    /** Les parts que SumUp a refusées, rendues en espèces à la place. */
    cashNotes?: { amountCents: number; reason: string }[];
  } = $props();

  const SUMUP_NOTE: Record<SumUpPart['state'], string> = {
    planned: 'SumUp s\'en charge : ne rendez rien en espèces pour cette part.',
    done: 'Fait par SumUp : ne le rendez pas en espèces.',
    pending: 'Demandé à SumUp, confirmation en attente : ne le rendez pas en espèces.',
    failed: 'SumUp a refusé : remboursez-le vous-même dans l\'application SumUp, pas en espèces.'
  };
</script>

<div class="space-y-3 text-left">
  {#if cashCents > 0}
    <section class="border-primary bg-primary/10 rounded-2xl border-2 p-5 text-center">
      <p class="flex items-center justify-center gap-2 text-base font-semibold"><Banknote class="size-5" />{phase === 'before' ? 'Vous remettrez en espèces' : 'Remettez en espèces'}</p>
      <p class="text-6xl font-semibold tabular-nums">{formatEuros(cashCents)}</p>
      <p class="text-sm font-semibold">sortis de la caisse, de la main à la main</p>
      {#each cashNotes as note, i (i)}
        <p class="mt-2 text-sm">Dont {formatEuros(note.amountCents)} que SumUp a refusé de rendre sur la carte bancaire ({note.reason}).</p>
      {/each}
    </section>
  {:else}
    <section class="rounded-2xl border-2 border-dashed p-5 text-center">
      <p class="flex items-center justify-center gap-2 text-lg font-semibold"><Banknote class="size-5" />Aucune espèce à remettre</p>
      <p class="text-muted-foreground text-sm">Ne sortez rien de la caisse.</p>
    </section>
  {/if}

  {#each sumUp as part, i (i)}
    <section class={`rounded-2xl border p-4 ${part.state === 'failed' ? 'border-destructive bg-destructive/10 text-destructive' : 'bg-card'}`}>
      <p class="flex items-center justify-between gap-3 text-sm font-semibold">
        <span class="flex items-center gap-2"><CreditCard class="size-4 shrink-0" />Rendu sur la carte bancaire du client, par SumUp</span>
        <span class="text-lg tabular-nums">{formatEuros(part.amountCents)}</span>
      </p>
      <p class={`mt-1 text-sm ${part.state === 'failed' ? 'font-semibold' : 'text-muted-foreground'}`}>{SUMUP_NOTE[part.state]}</p>
    </section>
  {/each}

  {#if cardCents > 0}
    <section class="bg-card rounded-2xl border p-4">
      <p class="flex items-center justify-between gap-3 text-sm font-semibold">
        <span class="flex items-center gap-2"><Wallet class="size-4 shrink-0" />Recrédité sur la carte buvette{cardLabel ? ` ${cardLabel}` : ''}</span>
        <span class="text-lg tabular-nums">{formatEuros(cardCents)}</span>
      </p>
      <p class="text-muted-foreground mt-1 text-sm">Automatique : rien à rendre en espèces pour cette part.</p>
    </section>
  {/if}
</div>
