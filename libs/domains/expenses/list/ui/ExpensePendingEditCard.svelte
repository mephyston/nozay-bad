<script lang="ts">
  import { Eye, Image as ImageIcon } from '@lucide/svelte';
  import { Button, Input, Card, Textarea, FormField, Select } from '@nba/ui';
  import type { Expense, Season, CategoryOption } from './expenses-types';

  let {
    exp,
    editDescription = $bindable(''),
    editCategory = $bindable(''),
    editSeasonId = $bindable(''),
    editAmountStr = $bindable(''),
    isSaving = false,
    categoriesList = [],
    seasons = [],
    onSelectPhoto,
    onCancelEdit,
    onSaveEdit
  }: {
    exp: Expense;
    editDescription: string;
    editCategory: string;
    editSeasonId: string;
    editAmountStr: string;
    isSaving: boolean;
    categoriesList: CategoryOption[];
    seasons: Season[];
    onSelectPhoto: (url: string) => void;
    onCancelEdit: () => void;
    onSaveEdit: (id: number) => void;
  } = $props();
</script>

<Card.Header class="pb-2 border-b border-border flex flex-row justify-between items-center space-y-0">
  <Card.Title class="font-bold text-md text-foreground">Modifier la demande - {exp.emitterName}</Card.Title>
  <Card.Description class="text-xs text-muted-foreground">ID: #{exp.id}</Card.Description>
</Card.Header>

<Card.Content class="space-y-4 pt-4">
    <FormField id="edit-desc-{exp.id}" label="Motif / Description">
    <Textarea id="edit-desc-{exp.id}" bind:value={editDescription} rows={3} required />
  </FormField>

  <div class="grid grid-cols-3 gap-4">
      <FormField id="edit-cat-{exp.id}" label="Catégorie compta">
      <Select id="edit-cat-{exp.id}" bind:value={editCategory}>
        {#each categoriesList as cat}
          <option value={cat.value}>{cat.label}</option>
        {/each}
      </Select>
    </FormField>

      <FormField id="edit-season-{exp.id}" label="Saison d'affectation">
      <Select id="edit-season-{exp.id}" bind:value={editSeasonId}>
        {#each seasons as s}
          <option value={s.id}>{s.name}</option>
        {/each}
      </Select>
    </FormField>

      <FormField id="edit-amount-{exp.id}" label="Montant (€)">
      <Input type="number" id="edit-amount-{exp.id}" step="0.01" min="0.01" bind:value={editAmountStr} class="font-semibold h-9" required />
    </FormField>
  </div>

  {#if exp.photoUrl}
    <div class="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/60">
      <span class="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <ImageIcon class="w-3.5 h-3.5" /> Justificatif chargé
      </span>
      <Button variant="ghost" size="sm" onclick={() => onSelectPhoto(exp.photoUrl!)} class="text-xs font-bold text-primary hover:underline flex items-center gap-1 h-auto py-1 px-2">
        <Eye class="w-3 h-3" /> Visualiser
      </Button>
    </div>
  {/if}
</Card.Content>

<Card.Footer class="border-t border-border bg-muted/20 px-5 py-3.5 flex justify-end gap-3">
  <Button variant="outline" onclick={onCancelEdit} disabled={isSaving}>Annuler</Button>
  <Button onclick={() => onSaveEdit(exp.id)} disabled={isSaving}>
    {isSaving ? "Enregistrement..." : "Enregistrer"}
  </Button>
</Card.Footer>
