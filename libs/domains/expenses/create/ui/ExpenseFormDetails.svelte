<script lang="ts">
  import { Input, Textarea, FormField, SearchableCombobox } from '@nba/ui';

  let {
    category = $bindable(''),
    amountStr = $bindable(''),
    description = $bindable(''),
    visibleCategories = []
  }: {
    category: string;
    amountStr: string;
    description: string;
    visibleCategories: { value: string; label: string }[];
  } = $props();
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <FormField id="category" label="Catégorie de dépense">
    <SearchableCombobox id="category" items={visibleCategories.map((cat) => ({ label: cat.label, value: String(cat.value) }))} bind:value={category} />
  </FormField>

    <FormField id="amount" label="Montant (€)">
    <Input
      type="number"
      id="amount"
      step="0.01"
      min="0.01"
      placeholder="0.00"
      bind:value={amountStr}
      class="font-semibold tabular-nums"
      required
    />
  </FormField>
</div>

  <FormField id="description" label="Description / Motif des frais">
  <Textarea
    id="description"
    bind:value={description}
    rows={3}
    placeholder="Ex: Achat de volants de compétition pour le tournoi régional."
    required
  />
</FormField>
