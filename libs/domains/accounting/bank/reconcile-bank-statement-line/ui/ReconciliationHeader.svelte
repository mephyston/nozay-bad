<script lang="ts">
  import { ShieldAlert } from '@lucide/svelte';
  import { Alert, PageHeader } from '@nba/ui';
  import type { ReconciliationState } from './reconciliation.svelte';

  /**
   * Le titre du rapprochement, et l'avertissement de clôture. Rien d'autre.
   *
   * L'en-tête portait aussi l'import, l'analyse et le sélecteur d'exercice : trois
   * contrôles posés au-dessus de la file, qui défilaient hors de vue dès la troisième
   * opération. Les deux actions sont descendues dans la barre du bas, et l'exercice a
   * rejoint les critères, derrière la loupe — c'est bien lui qui réduit ce qu'on voit.
   */
  let { state = $bindable() }: { state: ReconciliationState } = $props();
</script>

{#if state.isClosed}
  <Alert.Root variant="warning" class="flex items-center gap-3">
    <ShieldAlert class="h-5 w-5 shrink-0" />
    <Alert.Description class="text-sm">
      <span class="font-semibold">Saison clôturée.</span> Les opérations de rapprochement bancaire
      et de création d'écritures sont désactivées pour cette saison.
    </Alert.Description>
  </Alert.Root>
{/if}

<PageHeader
  title="Rapprochement bancaire"
  description="Importez vos relevés bancaires (OFX/CSV) et associez vos lignes aux écritures comptables."
/>
