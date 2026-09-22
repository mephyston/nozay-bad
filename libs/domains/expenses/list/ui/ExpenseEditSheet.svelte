<script lang="ts">
  import { Edit2, Eye } from '@lucide/svelte';
  import { Button, FormField, FormSheet, Input, SearchableCombobox, Textarea, toSeasonOptions } from '@nba/ui';
  import type { Expense, Season, CategoryOption } from './expenses-types';

  /**
   * Modifier une note de frais.
   *
   * L'édition se dépliait **dans la ligne du tableau**, sur toute sa largeur : un
   * formulaire de quatre champs poussé au milieu d'une liste, et rien de tel n'existait
   * au doigt — la carte mobile avait sa propre version du même formulaire. Il n'y en a
   * plus qu'une, dans la coquille commune, qui monte du bas sur téléphone et s'ouvre en
   * panneau à la souris.
   */
  let {
    open = $bindable(false),
    expense = null,
    editDescription = $bindable(''),
    editCategory = $bindable(''),
    editSeasonId = $bindable(''),
    editAmountStr = $bindable(''),
    isSaving = false,
    categoriesList = [],
    seasons = [],
    onSelectPhoto,
    onSave,
    onClose
  }: {
    open?: boolean;
    expense?: Expense | null;
    editDescription?: string;
    editCategory?: string;
    editSeasonId?: string;
    editAmountStr?: string;
    isSaving?: boolean;
    categoriesList?: CategoryOption[];
    seasons?: Season[];
    onSelectPhoto: (url: string) => void;
    onSave: (id: number) => void;
    /** Appelée quand la feuille se referme, d'où qu'en vienne l'ordre. */
    onClose?: () => void;
  } = $props();

  function soumettre(e: Event) {
    e.preventDefault();
    if (expense) onSave(expense.id);
  }
</script>

<FormSheet
  bind:open
  onOpenChange={(v) => {
    if (!v) onClose?.();
  }}
  title={expense ? `Modifier — ${expense.emitterName}` : 'Modifier la note'}
  icon={Edit2}
  isSubmitting={isSaving}
  submitLabel="Enregistrer"
  submittingLabel="Enregistrement…"
  onSubmit={soumettre}
>
  <FormField id="edit-desc" label="Motif / description">
    <Textarea id="edit-desc" bind:value={editDescription} rows={3} required />
  </FormField>

  <FormField id="edit-cat" label="Catégorie comptable">
    <SearchableCombobox
      id="edit-cat"
      items={categoriesList.map((cat) => ({ label: cat.label, value: String(cat.value) }))}
      bind:value={editCategory}
      searchPlaceholder="Rechercher une catégorie…"
    />
  </FormField>

  <FormField id="edit-season" label="Saison d'affectation">
    <SearchableCombobox
      id="edit-season"
      items={toSeasonOptions(seasons, { value: 'id' })}
      bind:value={editSeasonId}
    />
  </FormField>

  <FormField id="edit-amount" label="Montant (€)">
    <Input id="edit-amount" type="number" step="0.01" min="0.01" bind:value={editAmountStr} required class="tabular-nums" />
  </FormField>

  {#if expense?.photoUrl}
    <div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span class="text-xs font-semibold text-muted-foreground">Justificatif chargé</span>
      <Button variant="ghost" size="sm" class="gap-1 text-xs font-bold text-primary" onclick={() => onSelectPhoto(expense.photoUrl!)}>
        <Eye class="size-3.5" />
        Visualiser
      </Button>
    </div>
  {/if}
</FormSheet>
