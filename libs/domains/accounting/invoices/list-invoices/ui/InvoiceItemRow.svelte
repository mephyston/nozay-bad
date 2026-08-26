<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
  import { Button, Input, FormField, SearchableCombobox } from '@nba/ui';
  import type { InvoiceFormItem } from './invoices-types';

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
</script>

<div class="flex items-start gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
    <div class="flex-1">
    <FormField id={`desc-${index}`} label="Description" class="sr-only">
    <Input
      type="text"
      id={`desc-${index}`}
      bind:value={item.description}
      placeholder="Description de la ligne..."
      required
      disabled={isClosed}
    />
    </FormField>
  </div>
    <div class="w-20">
    <FormField id={`qty-${index}`} label="Quantité" class="sr-only">
    <Input
      type="number"
      id={`qty-${index}`}
      bind:value={item.quantity}
      min="1"
      required
      disabled={isClosed}
    />
    </FormField>
  </div>
    {#if categories.length > 0}
    <div class="w-48">
      <!--
        L'imputation comptable de la ligne.

        C'est elle qui préremplira l'écriture au rapprochement. Laissée vide, la comptable devra
        la choisir à l'encaissement — ce qui vaut toujours mieux que le « Adhésions &
        Inscriptions » que le rapprochement posait en dur sur toute recette facturée.
      -->
      <FormField id={`cat-${index}`} label="Catégorie comptable" class="sr-only">
        <SearchableCombobox
          id={`cat-${index}`}
          items={categories}
          bind:value={item.categoryId}
          placeholder="Catégorie…"
          disabled={isClosed}
        />
      </FormField>
    </div>
    {/if}
    <div class="w-32">
    <FormField id={`price-${index}`} label="Prix unitaire (€)" class="sr-only">
    <Input
      type="text"
      id={`price-${index}`}
      bind:value={item.unitPriceStr}
      placeholder="0.00"
      required
      disabled={isClosed}
      class="font-outfit tabular-nums"
    />
    </FormField>
  </div>
  {#if !isClosed}
    <Button type="button" variant="ghost" size="icon" onclick={() => onRemove(index)} class="text-destructive hover:bg-destructive/10 shrink-0">
      <Trash2 class="w-4 h-4" />
    </Button>
  {/if}
</div>
