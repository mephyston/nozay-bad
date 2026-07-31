<script lang="ts">
  import { Checkbox, SearchableCombobox, Button, Input, FormField, Alert } from '@nba/ui';
  import { Plus, Edit, Check, AlertCircle, X } from "@lucide/svelte";
  

  let {
    editingId,
    name = $bindable(''),
    price = $bindable(''),
    active = $bindable(true),
    trackStock = $bindable(false),
    stock = $bindable(''),
    formCategory = $bindable('shuttlecock'),
    category,
    isSubmitting,
    errorMsg,
    successMsg,
    onReset,
    onSubmit
  }: {
    editingId: number | null;
    name: string;
    price: string;
    active: boolean;
    trackStock: boolean;
    stock: string;
    formCategory: string;
    category?: number | 'all';
    isSubmitting: boolean;
    errorMsg: string;
    successMsg: string;
    onReset: () => void;
    onSubmit: (e: Event) => void;
  } = $props();
</script>

<div class="space-y-4 pt-2">
  {#if errorMsg}
    <Alert.Root variant="destructive">
      <AlertCircle class="w-4 h-4 shrink-0" />
    <Alert.Description>{errorMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  {#if successMsg}
    <Alert.Root variant="success">
      <Check class="w-4 h-4 shrink-0" />
    <Alert.Description>{successMsg}</Alert.Description>
    </Alert.Root>
  {/if}

  <form onsubmit={onSubmit} class="space-y-4">
      <FormField id="name" label="Nom du produit">
      <Input
        type="text"
        id="name"
        placeholder="Ex: Babolat Tour..."
        bind:value={name}
        required
      />
    </FormField>

    {#if !category || category === 'all'}
        <FormField id="category" label="Catégorie">
        <SearchableCombobox
          id="category"
          items={[{ label: 'Volants', value: 'shuttlecock' }, { label: 'Cordages', value: 'string' }, { label: 'Autre', value: 'other' }]}
          bind:value={formCategory}
          disabled={!!editingId}
        />
      </FormField>
    {/if}

      <FormField id="price" label="Prix (€)">
      <Input
        type="number"
        id="price"
        step="0.01"
        min="0"
        placeholder="0.00"
        bind:value={price}
        required
        class="font-outfit tabular-nums"
      />
    </FormField>

    <div class="flex items-center gap-2 py-2">
      <Checkbox id="trackStock" bind:checked={trackStock} />
      <label for="trackStock" class="text-sm font-medium text-foreground cursor-pointer select-none">
        Gérer le stock pour ce produit
      </label>
    </div>

    {#if trackStock}
      <FormField id="stock" label="Quantité en stock">
        <Input
          type="number"
          id="stock"
          min="0"
          placeholder="Ex: 50"
          bind:value={stock}
          required={trackStock}
          class="font-outfit tabular-nums"
        />
      </FormField>
    {/if}

    <div class="flex items-center gap-2 py-2">
      <Checkbox id="active" bind:checked={active} />
      <label for="active" class="text-sm font-medium text-foreground cursor-pointer select-none">
        Produit actif (visible par les adhérents)
      </label>
    </div>

    <Button
      type="submit"
      disabled={isSubmitting}
      class="w-full cursor-pointer font-bold"
    >
      {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter le produit'}
    </Button>
  </form>
</div>
