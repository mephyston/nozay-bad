<script lang="ts" module>
  export const CLE_CHAMP = Symbol('nba-form-field');

  /**
   * Ce qu'un champ peut apprendre du bloc qui l'entoure.
   *
   * `absorberLabel()` est le point important : sur téléphone, iOS met l'intitulé
   * **dans** le champ et non au-dessus, ce qui économise une ligne par champ — sur
   * un formulaire de six champs, c'est un tiers de la hauteur visible. Mais tous
   * les contrôles ne savent pas porter un intitulé : une case à cocher, un
   * calendrier n'ont pas de texte d'invite. C'est donc au champ de déclarer qu'il
   * l'a pris ; à défaut, le libellé reste affiché.
   *
   * Un libellé hors du champ reste par ailleurs légitime — l'application Calendrier
   * en garde pour coiffer un **groupe** de champs. `keepLabel` le demande
   * explicitement, et `absorbable` dit au champ de ne rien prendre.
   */
  export type ContexteChamp = {
    readonly label: string;
    readonly id: string;
    /** `false` quand l'écran veut garder son libellé au-dessus du champ. */
    readonly absorbable: boolean;
    absorberLabel: () => void;
  };
</script>

<script lang="ts">
  import { setContext, type Snippet } from 'svelte';
  import { Label } from '../ui/label';
  import { cn } from '../../lib/utils.js';

  let {
    label,
    id,
    error,
    hint,
    keepLabel = false,
    children
  }: {
    label: string;
    id: string;
    /** Garde le libellé au-dessus du champ, même là où il pourrait le porter. */
    keepLabel?: boolean;
    error?: string | null;
    /** Une aide courte sous le champ, en retrait ; l'erreur passe devant. */
    hint?: string | null;
    children: Snippet;
  } = $props();

  let absorbe = $state(false);

  setContext<ContexteChamp>(CLE_CHAMP, {
    get label() {
      return label;
    },
    get id() {
      return id;
    },
    get absorbable() {
      return !keepLabel;
    },
    absorberLabel: () => (absorbe = true),
  });
</script>

<div class="w-full space-y-1.5">
  <!--
    Absorbé, le libellé reste dans le DOM pour le lecteur d'écran et pour
    l'association `for`/`id` : seul son affichage disparaît.
  -->
  <Label for={id} class={cn(absorbe && 'sr-only', error && 'text-destructive')}>{label}</Label>
  {@render children()}
  {#if error}
    <p class="text-[0.8rem] font-medium text-destructive">{error}</p>
  {:else if hint}
    <p class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
