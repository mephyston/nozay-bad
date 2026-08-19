<script lang="ts">
  import { Check, Edit2, Trash2, X, MoreHorizontal, PowerOff, Power } from "@lucide/svelte";
  import { Button, Input, Badge, Table, AlertDialog, toast, DropdownMenu } from "@nba/ui";
  import type { Category, AccountClass } from "./settings-types";

  let {
    cat,
    accountClasses = [],
    isSubmitting = false,
    onEditCategory,
    onUpdateCategory,
    onDeleteCategory
  }: {
    cat: Category;
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onEditCategory: (cat: Category) => void;
    onUpdateCategory: (id: number, updates: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      active: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<boolean>;
    onDeleteCategory: (id: number) => Promise<boolean>;
  } = $props();

  let confirmDialogOpen = $state(false);
  let confirmActionType = $state<'delete' | 'toggleActive' | null>(null);

  function initiateToggleActive() {
    confirmActionType = 'toggleActive';
    confirmDialogOpen = true;
  }

  function initiateDelete() {
    confirmActionType = 'delete';
    confirmDialogOpen = true;
  }

  async function handleConfirmAction() {
    const action = confirmActionType;
    confirmActionType = null;
    confirmDialogOpen = false;
    
    if (action === 'delete') {
      try {
        await onDeleteCategory(cat.id);
        // Toast and reload are handled by the API action in SettingsManager
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la suppression');
      }
    } else if (action === 'toggleActive') {
      try {
        const newActive = !(cat.active ?? true);
        await onUpdateCategory(cat.id, {
          adminLabel: cat.adminLabel,
          adherentLabel: cat.adherentLabel,
          hideInExpenses: cat.hideInExpenses,
          active: newActive,
          receiptCode: cat.receiptCode || null,
          expenseCode: cat.expenseCode || null
        });
        cat.active = newActive; // Instant UI update
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la modification');
      }
    }
  }

  const defaultCategoryCodes = [
    'adhesions_inscriptions', 'sponsoring', 'subventions', 'actions_jeunes', 'tournois_senior',
    'evenements_buvettes', 'cordage_vente', 'volants', 'salaires_charges', 'materiel_club',
    'licences_federation', 'championnats', 'stages_formations', 'fonctionnement_administratif'
  ];


</script>

<Table.Row>
  <Table.Cell>
    <span class="font-semibold text-foreground">{cat.adminLabel}</span>
    {#if cat.active === false}
      <Badge variant="destructive" size="xs" class="ml-2">Inactif</Badge>
    {/if}
  </Table.Cell>
  <Table.Cell>
    <span class="text-foreground">{cat.adherentLabel}</span>
  </Table.Cell>
  <Table.Cell>
    {@const receiptClass = accountClasses.find(ac => ac.id === cat.receiptAccountClassId || (cat.receiptCode && ac.code === cat.receiptCode))}
    {@const rCodeDisplay = receiptClass ? `${receiptClass.code} - ${receiptClass.label}` : (cat.receiptCode || 'N/A')}
    <span class="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{rCodeDisplay}</span>
  </Table.Cell>
  <Table.Cell>
    {@const expenseClass = accountClasses.find(ac => ac.id === cat.expenseAccountClassId || (cat.expenseCode && ac.code === cat.expenseCode))}
    {@const eCodeDisplay = expenseClass ? `${expenseClass.code} - ${expenseClass.label}` : (cat.expenseCode || 'N/A')}
    <span class="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{eCodeDisplay}</span>
  </Table.Cell>
  <Table.Cell>
    {#if cat.hideInExpenses}
      <Badge variant="destructive" size="sm">Masquée</Badge>
    {:else}
      <Badge variant="success" size="sm">Visible</Badge>
    {/if}
  </Table.Cell>
  <Table.Cell class="text-right relative">
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {#snippet child({ props })}
          <Button {...props} aria-haspopup="true" variant="ghost" size="icon">
            <MoreHorizontal class="w-4 h-4" />
            <span class="sr-only">Toggle menu</span>
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Label>Actions</DropdownMenu.Label>
        <DropdownMenu.Item onclick={() => onEditCategory(cat)} class="cursor-pointer font-semibold">
          <Edit2 class="w-3.5 h-3.5 mr-2" /> Modifier
        </DropdownMenu.Item>
        {#if !defaultCategoryCodes.includes(cat.code)}
          <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); initiateToggleActive(); }} disabled={isSubmitting} class="cursor-pointer font-semibold">
            {#if cat.active ?? true}
              <PowerOff class="w-3.5 h-3.5 text-muted-foreground mr-2" /> Désactiver
            {:else}
              <Power class="w-3.5 h-3.5 text-success mr-2" /> Activer
            {/if}
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); initiateDelete(); }} disabled={isSubmitting} class="text-destructive focus:text-destructive cursor-pointer font-semibold">
            <Trash2 class="w-3.5 h-3.5 mr-2" /> Supprimer
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Table.Cell>
</Table.Row>

<AlertDialog.Root bind:open={confirmDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        {#if confirmActionType === 'delete'}
          Confirmer la suppression
        {:else if confirmActionType === 'toggleActive'}
          {#if cat.active ?? true}
            Désactiver la catégorie ?
          {:else}
            Activer la catégorie ?
          {/if}
        {/if}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {#if confirmActionType === 'delete'}
          Êtes-vous sûr de vouloir supprimer la catégorie <strong>{cat.adminLabel}</strong> ? Cette action est irréversible.
          S'il existe des écritures liées, la suppression sera refusée.
        {:else if confirmActionType === 'toggleActive'}
          {#if cat.active ?? true}
            Désactiver la catégorie empêchera de l'utiliser pour de nouvelles écritures comptables. Les écritures existantes ne seront pas modifiées.
          {:else}
            Activer la catégorie permettra de nouveau de l'utiliser dans la saisie des écritures comptables.
          {/if}
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleConfirmAction} class={confirmActionType === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
        Confirmer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
