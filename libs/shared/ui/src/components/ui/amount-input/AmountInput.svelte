<script lang="ts">
  import { Input } from "../input";
  import type { HTMLInputAttributes } from "svelte/elements";
  import type { WithElementRef } from "../../../lib/utils.js";
  import { cn } from "../../../lib/utils.js";

  type Props = Omit<WithElementRef<HTMLInputAttributes>, "value" | "type"> & {
    value?: number;
  };

  let { value = $bindable(0), class: className, ...restProps }: Props = $props();

  function parseValue(val: string | number): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const clean = val.toString().replace(/\s/g, '').replace(/\u202F/g, '').replace(/\u00A0/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatValue(val: number): string {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }

  // Le texte affiché, lié au champ. Le nombre n'en est tiré qu'à la sortie du champ.
  let displayValue = $state(formatValue(value));

  /*
   * Se resynchroniser quand la valeur change de l'extérieur — et seulement alors.
   *
   * L'effet précédent lisait aussi le texte affiché : à chaque frappe, il comparait le texte
   * au nombre encore inchangé, les trouvait différents, et remettait le texte à l'ancien
   * nombre. Toute saisie d'un montant différent était effacée sous les doigts, sauf quand le
   * texte tapé revenait par hasard au même nombre. Le seul écran qui utilisait ce champ ne
   * sauvegardait rien, personne ne l'a vu.
   */
  let lastValue = value;
  $effect(() => {
    if (value !== lastValue) {
      lastValue = value;
      displayValue = formatValue(value);
    }
  });

  function handleBlur() {
    value = parseValue(displayValue);
    lastValue = value;
    displayValue = formatValue(value);
  }
</script>

<div class="relative">
  <Input
    type="text"
    class={cn("pl-3 pr-6 text-foreground font-semibold font-outfit tabular-nums", className)}
    bind:value={displayValue}
    onblur={handleBlur}
    {...restProps}
  />
  <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">€</span>
</div>
