<script lang="ts">
  import { Input, Label, FormField, SearchableCombobox } from '@nba/ui';

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
      class="w-full h-10 rounded-xl font-semibold"
      required
    />
  </FormField>
</div>

  <FormField id="description" label="Description / Motif des frais">
  <textarea
    id="description"
    bind:value={description}
    rows="3"
    placeholder="Ex: Achat de volants de compétition pour le tournoi régional."
    class="w-full px-3 py-2.5 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
    required
  ></textarea>
</FormField>
