<script lang="ts">
  import { Pencil, Undo2, X } from '@lucide/svelte';
  import { Button } from '@nba/ui';
  import type { OrderItem } from './orders-manager-types';
  import { ACTION_LABELS, ICONES_PRIMAIRES, type EtapeOuverte } from './orders-row-model';

  /**
   * Le pied de la fiche d'une commande : ses boutons de décision.
   *
   * La fiche calcule ce qui est permis — elle en a besoin pour masquer un pied vide —
   * et ce pied ne fait que le rendre. Chaque bouton ferme la fiche avant d'agir.
   */
  let {
    item,
    etape,
    primairePermise,
    secondairePermise,
    corrigeable,
    onPrimary,
    onSecondary,
    onUndeliver,
    onEdit,
    onFermer
  }: {
    item: OrderItem;
    /** L'étape d'une commande ouverte ; `null` pour une issue close. */
    etape: EtapeOuverte | null;
    primairePermise: boolean;
    secondairePermise: boolean;
    corrigeable: boolean;
    onPrimary?: (id: number) => void;
    onSecondary?: (id: number) => void;
    onUndeliver?: (id: number) => void;
    onEdit?: (item: OrderItem) => void;
    onFermer: () => void;
  } = $props();

  const IconePrimaire = $derived(ICONES_PRIMAIRES[etape ?? 'created']);

  function lancer(action?: (id: number) => void) {
    if (!action) return;
    const id = item.order.id;
    onFermer();
    action(id);
  }
</script>

<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
  {#if etape}
    <!-- Une commande payée ne se corrige plus : sa recette est écrite. -->
    {#if onEdit && corrigeable}
      <Button
        type="button"
        variant="outline"
        onclick={() => {
          const courant = item;
          onFermer();
          onEdit(courant);
        }}
        class="w-full sm:mr-auto sm:w-auto"
      >
        <Pencil class="size-4" />
        Modifier
      </Button>
    {/if}
    {#if secondairePermise}
      <Button
        type="button"
        variant="outline"
        onclick={() => lancer(onSecondary)}
        class="w-full text-destructive sm:w-auto"
      >
        {#if etape === 'paid'}
          <Undo2 class="size-4" />
        {:else}
          <X class="size-4" />
        {/if}
        {ACTION_LABELS[etape].secondaire}
      </Button>
    {/if}
    {#if primairePermise}
      <Button type="button" onclick={() => lancer(onPrimary)} class="w-full sm:w-auto">
        <IconePrimaire class="size-4" />
        {ACTION_LABELS[etape].primaire}
      </Button>
    {/if}
  {:else if item.order.status === 'delivered' && onUndeliver}
    <Button
      type="button"
      variant="outline"
      onclick={() => lancer(onUndeliver)}
      class="w-full text-destructive sm:w-auto"
    >
      <Undo2 class="size-4" />
      Annuler la remise
    </Button>
  {/if}
</div>
