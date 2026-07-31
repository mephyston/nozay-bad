<script lang="ts">
  import { Check, Edit2, Trash2, X } from "@lucide/svelte";
  import { Button, Input, Badge, AlertDialog, toast, DataTable, DataTableToolbar, Table, DataTableColumnHeader } from "@nba/ui";
  import * as Card from"@nba/ui";
  import type { AccountClass } from "./settings-types";

  let {
    accountClasses = [],
    isSubmitting = false,
    onEditAccountClass,
    onUpdateAccountClass,
    onDeleteAccountClass,
    tabsNav,
    actions
  }: {
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onEditAccountClass: (ac: AccountClass) => void;
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    onDeleteAccountClass: (code: string) => Promise<void>;
    tabsNav?: any;
    actions?: any;
  } = $props();



  let deletingAccountClass = $state<AccountClass | null>(null);

  async function handleConfirmDelete() {
    if (!deletingAccountClass) return;
    try {
      await onDeleteAccountClass(deletingAccountClass.code);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      deletingAccountClass = null;
    }
  }
</script>

<DataTable
  data={accountClasses || []}
  emptyTitle="Aucune classe"
  emptyDescription="Aucune classe de compte définie."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}

  {#snippet toolbar()}
    <DataTableToolbar hasSearch={false} {actions} />
  {/snippet}

  {#snippet mobileView()}
    <div class="flex flex-col gap-4">
      {#each (accountClasses || []) as ac}
        <Card.Root class="flex flex-col gap-3 relative">
        <Card.Content class="p-4 flex flex-col gap-3">
          <div class="flex justify-between items-start gap-2">
            <div class="flex flex-col gap-1">
              <span class="font-bold text-lg text-foreground">{ac.code}</span>
              <span class="font-semibold text-sm text-foreground">{ac.label}</span>
            </div>
            <div>
              {#if ac.type === 'recette'}
                <Badge variant="success" class="text-[11px] font-semibold">
                  Produit (7)
                </Badge>
              {:else if ac.type === 'tresorerie'}
                <Badge variant="info" class="text-[11px] font-semibold">
                  Trésorerie (5)
                </Badge>
              {:else}
                <Badge variant="destructive" class="text-[11px] font-semibold">
                  Charge (6)
                </Badge>
              {/if}
            </div>
          </div>
          
          <div class="flex justify-end gap-2 pt-2 border-t border-border mt-1">
            <Button variant="outline" size="sm" class="h-8 text-xs flex-1 border-destructive/20 text-destructive hover:bg-destructive/10" onclick={() => deletingAccountClass = ac} disabled={isSubmitting}>
              Supprimer
            </Button>
            <Button variant="outline" size="sm" class="h-8 text-xs flex-1" onclick={() => onEditAccountClass(ac)}>
              Modifier
            </Button>
          </div>
        </Card.Content>
        </Card.Root>
      {/each}
    </div>
  {/snippet}

  {#snippet header()}
    <DataTableColumnHeader title="Code" />
    <DataTableColumnHeader title="Libellé" />
    <DataTableColumnHeader title="Type" />
    <DataTableColumnHeader title="Actions" class="text-right" />
  {/snippet}

  {#snippet row(ac)}
    <Table.Row>
      <Table.Cell class="p-4 font-bold text-foreground">
        {ac.code}
      </Table.Cell>
      <Table.Cell class="p-4">
        <span class="font-semibold text-foreground">{ac.label}</span>
      </Table.Cell>
      <Table.Cell class="p-4">
        {#if ac.type === 'recette'}
          <Badge variant="success" class="text-[11px] font-semibold">
            Produit (7)
          </Badge>
        {:else if ac.type === 'tresorerie'}
          <Badge variant="info" class="text-[11px] font-semibold">
            Trésorerie (5)
          </Badge>
        {:else}
          <Badge variant="destructive" class="text-[11px] font-semibold">
            Charge (6)
          </Badge>
        {/if}
      </Table.Cell>
      <Table.Cell class="p-4 text-right">
        <div class="flex justify-end items-center gap-2">
          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground" onclick={() => onEditAccountClass(ac)}>
            <Edit2 class="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onclick={() => deletingAccountClass = ac} disabled={isSubmitting}>
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>

<AlertDialog.Root open={!!deletingAccountClass} onOpenChange={(o) => { if (!o) deletingAccountClass = null; }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmer la suppression</AlertDialog.Title>
      <AlertDialog.Description>
        Êtes-vous sûr de vouloir supprimer la classe comptable <strong class="text-foreground">{deletingAccountClass?.code}</strong> ?
        Cette action supprimera toutes les affectations de cette classe.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isSubmitting}>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action 
        disabled={isSubmitting} 
        onclick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isSubmitting ? 'Suppression...' : 'Supprimer'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
