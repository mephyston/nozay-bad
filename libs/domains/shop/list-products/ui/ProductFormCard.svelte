<script lang="ts">
  import { Plus, Edit, Check, AlertCircle, X } from "@lucide/svelte";
  import { Button, Input, Card } from "@nba/ui";

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

<Card.Root class="md:col-span-2 h-fit">
  <Card.Header class="pb-2 border-b border-border">
    <Card.Title class="text-lg font-semibold flex items-center justify-between">
      <span class="flex items-center gap-2">
        {#if editingId}
          <Edit class="w-5 h-5 text-primary" />
          Modifier le produit
        {:else}
          <Plus class="w-5 h-5 text-primary" />
          Ajouter un produit
        {/if}
      </span>
      {#if editingId}
        <Button 
          type="button" 
          variant="outline"
          size="xs"
          onclick={onReset} 
          class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <X class="w-3 h-3" /> Annuler
        </Button>
      {/if}
    </Card.Title>
  </Card.Header>
  <Card.Content class="pt-4 space-y-4">
    {#if errorMsg}
      <div class="p-3 bg-destructive/15 border border-destructive/30 text-destructive text-xs rounded-md flex items-center gap-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{errorMsg}</span>
      </div>
    {/if}

    {#if successMsg}
      <div class="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-md flex items-center gap-2">
        <Check class="w-4 h-4 shrink-0" />
        <span>{successMsg}</span>
      </div>
    {/if}

    <form onsubmit={onSubmit} class="space-y-4">
      <div>
        <label for="name" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Nom du produit</label>
        <Input
          type="text"
          id="name"
          placeholder="Ex: Babolat Tour..."
          bind:value={name}
          required
        />
      </div>

      {#if !category || category === 'all'}
        <div>
          <label for="category" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Catégorie</label>
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
        </div>
      {/if}

      <div>
        <label for="price" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Prix (€)</label>
        <Input
          type="number"
          id="price"
          step="0.01"
          min="0"
          placeholder="0.00"
          bind:value={price}
          required
        />
      </div>

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
        class="w-full cursor-pointer"
      >
        {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter le produit'}
      </Button>
    </form>
  </Card.Content>
</Card.Root>
