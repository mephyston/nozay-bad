<script lang="ts">
  import { Eye } from '@lucide/svelte';
  import {
    Button,
    Badge,
    DataTable,
    DataTableRowActions,
    DropdownMenu,
    RowActionItems,
    Table,
    DataTableColumnHeader
  } from '@nba/ui';
  import type { Expense } from './expenses-types';
  import { categoryColors } from './expenses-types';
  import ExpensesList from './ExpensesList.svelte';
  import { gestesDeNote } from './expenses-row-model';

  let {
    historyExpenses = [],
    isClosed = false,
    categoryLabels = {},
    toolbar: barreDOutils,
    onSelectPhoto,
    onCancelValidation
  }: {
    historyExpenses: Expense[];
    isClosed?: boolean;
    categoryLabels: Record<string, string>;
    /** La barre d'outils, commune aux deux tableaux et rendue par l'écran. */
    toolbar?: import('svelte').Snippet;
    onSelectPhoto: (url: string) => void;
    onCancelValidation: (id: number) => void;
  } = $props();

</script>

<DataTable
  data={historyExpenses}
  mobileSpacing="list"
  emptyTitle="Aucun historique de notes de frais"
  emptyDescription="Les dépenses validées ou rejetées apparaîtront ici."
>

  {#snippet toolbar()}
    {@render barreDOutils?.()}
  {/snippet}

  {#snippet header()}
    <DataTableColumnHeader title="Date" />
    <DataTableColumnHeader title="Bénéficiaire" />
    <DataTableColumnHeader title="Motif" />
    <DataTableColumnHeader title="Catégorie" />
    <DataTableColumnHeader title="Montant" class="text-right" />
    <DataTableColumnHeader title="Justificatif" class="text-center" />
    <DataTableColumnHeader title="Statut" class="text-center" />
    <DataTableColumnHeader title="Actions" class="text-right" />
  {/snippet}

  {#snippet row(exp)}
    <Table.Row class="hover:bg-muted/50 transition-colors">
      <Table.Cell class="p-4 text-muted-foreground whitespace-nowrap">
        {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
      </Table.Cell>
      <Table.Cell class="p-4 font-bold text-foreground">
        {exp.emitterName}
      </Table.Cell>
      <Table.Cell class="p-4 max-w-xs truncate" title={exp.description}>
        {exp.description}
      </Table.Cell>
      <Table.Cell class="p-4">
        <Badge variant="outline" class={categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}>
          {categoryLabels[exp.category] || exp.category}
        </Badge>
      </Table.Cell>
      <Table.Cell class="p-4 font-outfit tabular-nums font-bold text-foreground text-right">
        {(exp.amount / 100).toFixed(2)} €
      </Table.Cell>
      <Table.Cell class="p-4 text-center">
        {#if exp.photoUrl}
          <Button
            variant="ghost"
            size="sm"
            onclick={() => onSelectPhoto(exp.photoUrl!)}
            class="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 h-auto py-1 px-2"
          >
            <Eye class="w-3.5 h-3.5" />
            Voir
          </Button>
        {:else}
          <span class="text-xs text-muted-foreground">Aucun</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="p-4 text-center">
        {#if exp.status === 'approved'}
          <Badge variant="success">
            Remboursé
          </Badge>
        {:else}
          <Badge variant="destructive">
            Rejeté
          </Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="p-4 text-right">
        {@const gestes = gestesDeNote(exp, { isClosed, onSelectPhoto, onCancelValidation })}
        {#if gestes.length > 0}
          <DataTableRowActions>
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            <RowActionItems actions={gestes} item={exp} />
          </DataTableRowActions>
        {:else}
          <span class="text-xs text-muted-foreground italic">Aucune</span>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}

  {#snippet mobileView()}
    <ExpensesList
      expenses={historyExpenses}
      {categoryLabels}
      vue="history"
      {isClosed}
      {onSelectPhoto}
      {onCancelValidation}
      emptyTitle="Aucun historique de notes de frais"
      emptyDescription="Les dépenses validées ou rejetées apparaîtront ici."
    />
  {/snippet}
</DataTable>
