<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import { Button, Input } from "@nba/ui";

  let {
    isSubmitting = false,
    initialData = null,
    onSubmitAccountClass
  }: {
    isSubmitting: boolean;
    initialData?: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' } | null;
    onSubmitAccountClass: (data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
  } = $props();

  let newClassCode = $state(initialData?.code || '');
  let newClassLabel = $state(initialData?.label || '');
  let newClassType = $state<'recette' | 'depense' | 'tresorerie'>(initialData?.type || 'recette');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    await onSubmitAccountClass({
      code: newClassCode.trim(),
      label: newClassLabel.trim(),
      type: newClassType
    });
    if (!initialData) {
      newClassCode = '';
      newClassLabel = '';
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div class="space-y-1.5">
    <label for="new-class-code" class="block text-xs font-bold text-muted-foreground uppercase">Code (ex: 63)</label>
    <Input
      type="text"
      id="new-class-code"
      bind:value={newClassCode}
      placeholder="63"
      class="font-mono"
      disabled={!!initialData}
      required
    />
  </div>

  <div class="space-y-1.5">
    <label for="new-class-label" class="block text-xs font-bold text-muted-foreground uppercase">Libellé (ex: 63 - Impôts)</label>
    <Input
      type="text"
      id="new-class-label"
      bind:value={newClassLabel}
      placeholder="63 - Impôts et taxes"
      required
    />
  </div>

  <div class="space-y-1.5">
    <label for="new-class-type" class="block text-xs font-bold text-muted-foreground uppercase">Type</label>
    <select
      id="new-class-type"
      bind:value={newClassType}
      class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
    >
      <option value="recette">Produit (7 - Recette)</option>
      <option value="depense">Charge (6 - Dépense)</option>
      <option value="tresorerie">Trésorerie (5)</option>
    </select>
  </div>

  <Button
    type="submit"
    disabled={isSubmitting}
    class="w-full font-bold flex items-center justify-center gap-1.5"
  >
    {#if initialData}
      Enregistrer les modifications
    {:else}
      <Plus class="w-4 h-4" />
      Créer la classe
    {/if}
  </Button>
</form>
