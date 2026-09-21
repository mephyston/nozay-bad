<script lang="ts">
  import { cn } from '../../../lib/utils.js';
  import { centsFrom, formatAmount } from '../../../lib/amount.js';

  let {
    cents,
    euros,
    showSign = false,
    colored = false,
    colorize = false,
    currency = '€',
    class: className = ''
  }: {
    cents?: number;
    euros?: number;
    showSign?: boolean;
    colored?: boolean;
    colorize?: boolean;
    currency?: string;
    class?: string;
  } = $props();

  const valueInCents = $derived(centsFrom({ cents, euros }));

  // Devise vide : le markup la pose lui-même, avec son espace insécable.
  const formattedNumber = $derived(formatAmount(valueInCents, { showSign, currency: '' }));

  const colorClass = $derived.by(() => {
    if (!colored && !colorize) return '';
    if (valueInCents < 0) return 'text-destructive';
    if (valueInCents >= 0 && colorize) return 'text-success';
    if (valueInCents > 0) return 'text-success';
    return 'text-muted-foreground';
  });
</script>

<span class={cn("font-outfit tabular-nums whitespace-nowrap inline-block", colorClass, className)}>
  {formattedNumber}&nbsp;{currency}
</span>
