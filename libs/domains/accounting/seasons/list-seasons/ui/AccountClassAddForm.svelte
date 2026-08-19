<script lang="ts">
  import { SearchableCombobox, Button, Input, FormField } from '@nba/ui';
  import { Plus } from "@lucide/svelte";
  

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
    <SearchableCombobox
      id="new-class-type"
      items={[{ label: 'Produit (7 - Recette)', value: 'recette' }, { label: 'Charge (6 - Dépense)', value: 'depense' }, { label: 'Trésorerie (5)', value: 'tresorerie' }]}
      bind:value={newClassType}
    />
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
