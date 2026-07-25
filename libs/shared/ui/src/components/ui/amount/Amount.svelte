<script lang="ts">
  import { cn } from '../../../lib/utils.js';

  let {
    cents,
    euros,
    showSign = false,
    colored = false,
    currency = '€',
    class: className = ''
  }: {
    cents?: number;
    euros?: number;
    showSign?: boolean;
    colored?: boolean;
    currency?: string;
    class?: string;
  } = $props();

  const valueInCents = $derived.by(() => {
    if (euros !== undefined && euros !== null && !isNaN(euros)) {
      return Math.round(euros * 100);
    }
    if (cents !== undefined && cents !== null && !isNaN(cents)) {
      return cents;
    }
    return 0;
  });

  const formattedNumber = $derived.by(() => {
    const absEuros = Math.abs(valueInCents) / 100;
    const str = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(absEuros).replace(/\s/g, ' ');
    
    if (valueInCents < 0) return `-${str}`;
    if (showSign && valueInCents > 0) return `+${str}`;
    return str;
  });

  const colorClass = $derived.by(() => {
    if (!colored) return '';
    if (valueInCents < 0) return 'text-destructive';
    if (valueInCents > 0) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-muted-foreground';
  });
</script>

<span class={cn("font-outfit tabular-nums inline-block", colorClass, className)}>
  {formattedNumber}&nbsp;{currency}
</span>
