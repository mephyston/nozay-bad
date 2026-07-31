<script lang="ts">
  import { Plus } from "@lucide/svelte";
  import { Button, Input, FormField } from"@nba/ui";

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
    <FormField id="new-class-code" label="Code (ex: 63)">
    <Input
      type="text"
      id="new-class-code"
      bind:value={newClassCode}
      placeholder="63"
      class="font-mono"
      disabled={!!initialData}
      required
    />
  </FormField>

    <FormField id="new-class-label" label="Libellé (ex: 63 - Impôts)">
    <Input
      type="text"
      id="new-class-label"
      bind:value={newClassLabel}
      placeholder="63 - Impôts et taxes"
      required
    />
  </FormField>

    <FormField id="new-class-type" label="Type">
    <select
      id="new-class-type"
      bind:value={newClassType}
      class="w-full px-3 py-1.5 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium"
    >
      <option value="recette">Produit (7 - Recette)</option>
      <option value="depense">Charge (6 - Dépense)</option>
      <option value="tresorerie">Trésorerie (5)</option>
    </select>
  </FormField>

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
