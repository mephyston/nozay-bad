<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Amount, Button, Input, FormField, SearchableCombobox } from '@nba/ui';
  import type { InvoiceFormItem } from './invoices-types';
  import { montantDeLigne } from './invoice-line';

  /**
   * Une ligne de facturation, en carte.
   *
   * Elle tenait sur une seule rangée : quantité, catégorie et prix à largeur fixe
   * (80 + 192 + 128 px) plus la corbeille. Sur un téléphone, il ne restait rien pour la
   * description, la rangée débordait, et les intitulés n'étaient là que pour les lecteurs
   * d'écran. La carte a la même forme à toutes les largeurs : la description en entier,
   * quantité et prix côte à côte, la catégorie dessous, et le montant de la ligne pour
   * vérifier d'un coup d'œil ce qu'on facture.
   */
  let {
    item,
    index,
    isClosed = false,
    categories = [],
    onRemove
  }: {
    item: InvoiceFormItem;
    index: number;
    isClosed?: boolean;
    /** Nomenclature comptable ; vide, le champ ne s'affiche pas. */
    categories?: { value: string; label: string }[];
    onRemove: (index: number) => void;
  } = $props();

  const montant = $derived(montantDeLigne(item));
</script>

<div class="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
  <div class="flex items-end gap-2">
    <div class="min-w-0 flex-1">
      <FormField id={`desc-${index}`} label={`Ligne ${index + 1}`}>
        <Input
          type="text"
          id={`desc-${index}`}
          bind:value={item.description}
          placeholder="Description de la ligne…"
          required
          disabled={isClosed}
        />
      </FormField>
    </div>
    {#if !isClosed}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onclick={() => onRemove(index)}
        class="shrink-0 text-destructive hover:bg-destructive/10"
        aria-label={`Supprimer la ligne ${index + 1}`}
      >
        <Trash2 class="size-4" />
      </Button>
    {/if}
  </div>

  <div class="grid grid-cols-2 gap-3">
    <FormField id={`qty-${index}`} label="Quantité">
      <Input
        type="number"
        id={`qty-${index}`}
        bind:value={item.quantity}
        min="1"
        inputmode="numeric"
        required
        disabled={isClosed}
        class="tabular-nums"
      />
    </FormField>
    <FormField id={`price-${index}`} label="Prix unitaire (€)">
      <!-- Du texte et non un nombre : la virgule française doit passer. -->
      <Input
        type="text"
        id={`price-${index}`}
        bind:value={item.unitPriceStr}
        placeholder="0,00"
        inputmode="decimal"
        required
        disabled={isClosed}
        class="font-outfit tabular-nums"
      />
    </FormField>
  </div>

  {#if categories.length > 0}
    <!--
      L'imputation comptable de la ligne.

      C'est elle qui préremplira l'écriture au rapprochement. Laissée vide, la comptable devra
      la choisir à l'encaissement — ce qui vaut toujours mieux que le « Adhésions &
      Inscriptions » que le rapprochement posait en dur sur toute recette facturée.
    -->
    <FormField id={`cat-${index}`} label="Catégorie comptable">
      <SearchableCombobox
        id={`cat-${index}`}
        items={categories}
        bind:value={item.categoryId}
        placeholder="À choisir à l'encaissement"
        searchPlaceholder="Rechercher une catégorie…"
        disabled={isClosed}
      />
    </FormField>
  {/if}

  <p class="flex items-baseline justify-end gap-1.5 text-sm text-muted-foreground">
    Montant de la ligne :
    <Amount cents={montant} class="font-semibold text-foreground" />
  </p>
</div>
