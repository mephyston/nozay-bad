<script lang="ts">
  import { Plus, Edit, Check, AlertCircle, X } from "@lucide/svelte";
  import { Button, Input, FormField, Alert } from"@nba/ui";

  let {
    editingId,
    name = $bindable(''),
    price = $bindable(''),
    active = $bindable(true),
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
        <select
          id="category"
          bind:value={formCategory}
          disabled={!!editingId}
          class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          required
        >
          <option value="shuttlecock">Volants</option>
          <option value="string">Cordages</option>
          <option value="other">Autre</option>
        </select>
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
      <input
        type="checkbox"
        id="active"
        bind:checked={active}
        class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
      />
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
