<script lang="ts">
  import { SearchableCombobox, Input, FormField, FormSheet } from '@nba/ui';
  import { Plus, Settings } from "@lucide/svelte";

  /**
   * Créer ou modifier une classe du plan comptable, **en tiroir**.
   *
   * Même bascule que {@link CategoryAddForm} : les champs sont fournis à `FormSheet`,
   * qui porte la validation dans sa barre plutôt qu'en bas des champs.
   */
  let {
    open = $bindable(false),
    isSubmitting = false,
    initialData = null,
    onSubmitAccountClass,
    onOpenChange
  }: {
    open?: boolean;
    isSubmitting: boolean;
    initialData?: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' } | null;
    onSubmitAccountClass: (data: { code: string; label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    onOpenChange?: (open: boolean) => void;
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

<FormSheet
  bind:open
  title={initialData ? 'Modifier la classe' : 'Nouvelle classe'}
  description={initialData
    ? 'Modifiez le libellé ou le type de cette classe de compte.'
    : 'Ajoutez une nouvelle rubrique pour structurer le compte de résultat.'}
  icon={initialData ? Settings : Plus}
  {isSubmitting}
  submitLabel={initialData ? 'Enregistrer les modifications' : 'Créer la classe'}
  onSubmit={handleSubmit}
  {onOpenChange}
>
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
</FormSheet>
