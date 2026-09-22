<script lang="ts">
  import { Table, Badge, Amount, DropdownMenu, DataTableRowActions, RowActionItems } from '@nba/ui';
  import type { Invoice } from './invoices-types';
  import {
    gestesDeFacture,
    montantCents,
    statutDeFacture,
    type GestesDeFacture
  } from './invoices-row-model';

  /**
   * Une facture en ligne de tableau — la présentation de bureau.
   *
   * Les libellés de statut, leurs couleurs et la liste des actions par statut vivaient
   * ici, en tables locales et en cascade de `{#if}`. Elles viennent maintenant du
   * modèle, que la vue liste rend aussi : une seule déclaration, deux présentations.
   */
  let {
    inv,
    isClosed = false,
    onPrint,
    onEdit,
    onStatusChange,
    onDelete
  }: { inv: Invoice } & GestesDeFacture = $props();

  const statut = $derived(statutDeFacture(inv));
  const actions = $derived(
    gestesDeFacture(inv, { isClosed, onPrint, onEdit, onStatusChange, onDelete })
  );
</script>

<Table.Row>
  <Table.Cell class="font-semibold text-foreground">{inv.invoiceNumber}</Table.Cell>
  <Table.Cell class="font-medium text-foreground">{inv.clientName}</Table.Cell>
  <Table.Cell class="text-muted-foreground">{inv.date}</Table.Cell>
  <Table.Cell class="text-right font-bold text-foreground">
    <Amount cents={montantCents(inv)} />
  </Table.Cell>
  <Table.Cell class="text-center">
    <Badge variant={statut.variant as 'outline'}>{statut.label}</Badge>
  </Table.Cell>
  <Table.Cell class="text-right relative">
    {#if actions.length > 0}
      <DataTableRowActions>
        <DropdownMenu.Label>Actions</DropdownMenu.Label>
        <RowActionItems {actions} item={inv} />
      </DataTableRowActions>
    {/if}
  </Table.Cell>
</Table.Row>
