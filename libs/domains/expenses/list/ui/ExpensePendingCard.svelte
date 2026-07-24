<script lang="ts">
  import { Card } from '@nba/ui';
  import type { Expense, Season, CategoryOption } from './expenses-types';
  import ExpensePendingEditCard from './ExpensePendingEditCard.svelte';
  import ExpensePendingViewCard from './ExpensePendingViewCard.svelte';

  let {
    exp,
    isClosed = false,
    submittingId = null,
    editingId = $bindable(null),
    editDescription = $bindable(''),
    editCategory = $bindable(''),
    editSeasonId = $bindable(''),
    editAmountStr = $bindable(''),
    isSaving = false,
    categoriesList = [],
    categoryLabels = {},
    seasons = [],
    onSelectPhoto,
    onStartEdit,
    onSaveEdit,
    onAction
  }: {
    exp: Expense;
    isClosed?: boolean;
    submittingId: number | null;
    editingId: number | null;
    editDescription: string;
    editCategory: string;
    editSeasonId: string;
    editAmountStr: string;
    isSaving: boolean;
    categoriesList: CategoryOption[];
    categoryLabels: Record<string, string>;
    seasons: Season[];
    onSelectPhoto: (url: string) => void;
    onStartEdit: (exp: Expense) => void;
    onSaveEdit: (id: number) => void;
    onAction: (id: number, action: 'approve' | 'reject') => void;
  } = $props();
</script>

<Card.Root class="hover:border-border/80 transition-all flex flex-col justify-between shadow-sm">
  {#if editingId === exp.id}
    <ExpensePendingEditCard
      {exp}
      bind:editDescription
      bind:editCategory
      bind:editSeasonId
      bind:editAmountStr
      {isSaving}
      {categoriesList}
      {seasons}
      {onSelectPhoto}
      onCancelEdit={() => editingId = null}
      {onSaveEdit}
    />
  {:else}
    <ExpensePendingViewCard
      {exp}
      {isClosed}
      {submittingId}
      {categoryLabels}
      {onSelectPhoto}
      {onStartEdit}
      {onAction}
    />
  {/if}
</Card.Root>
