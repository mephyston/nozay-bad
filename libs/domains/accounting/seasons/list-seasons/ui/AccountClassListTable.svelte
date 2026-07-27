<script lang="ts">
  import { Check, Edit2, Trash2, X } from "@lucide/svelte";
  import { Button, Input, Badge, Table, AlertDialog, toast } from "@nba/ui";
  import type { AccountClass } from "./settings-types";

  let {
    accountClasses = [],
    isSubmitting = false,
    onEditAccountClass,
    onUpdateAccountClass,
    onDeleteAccountClass
  }: {
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onEditAccountClass: (ac: AccountClass) => void;
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    onDeleteAccountClass: (code: string) => Promise<void>;
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

<div class="sm:hidden flex flex-col gap-4">
  {#each (accountClasses || []) as ac}
    <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 relative">
      <div class="flex justify-between items-start gap-2">
        <div class="flex flex-col gap-1">
          <span class="font-bold text-lg text-foreground">{ac.code}</span>
          <span class="font-semibold text-sm text-foreground">{ac.label}</span>
        </div>
        <div>
          {#if ac.type === 'recette'}
            <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
              Produit (7)
            </Badge>
          {:else if ac.type === 'tresorerie'}
            <Badge variant="outline" class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold">
              Trésorerie (5)
            </Badge>
          {:else}
            <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold">
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
    </div>
  {/each}
  {#if (accountClasses || []).length === 0}
    <div class="p-8 text-center text-muted-foreground border border-border rounded-xl bg-card">
      Aucune classe de compte définie.
    </div>
  {/if}
</div>

<div class="hidden sm:block overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
  <Table.Root>
    <Table.Header class="bg-muted border-b border-border">
      <Table.Row>
        <Table.Head class="p-4 font-medium text-muted-foreground">Code</Table.Head>
        <Table.Head class="p-4 font-medium text-muted-foreground">Libellé</Table.Head>
        <Table.Head class="p-4 font-medium text-muted-foreground">Type</Table.Head>
        <Table.Head class="p-4 text-right font-medium text-muted-foreground">Actions</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body class="divide-y divide-border">
      {#each (accountClasses || []) as ac}
        <Table.Row class="hover:bg-muted/50 transition-colors">
          <Table.Cell class="p-4 font-bold text-foreground">
            {ac.code}
          </Table.Cell>
          <Table.Cell class="p-4">
            <span class="font-semibold text-foreground">{ac.label}</span>
          </Table.Cell>
          <Table.Cell class="p-4">
            {#if ac.type === 'recette'}
              <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
                Produit (7)
              </Badge>
            {:else if ac.type === 'tresorerie'}
              <Badge variant="outline" class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] font-semibold">
                Trésorerie (5)
              </Badge>
            {:else}
              <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold">
                Charge (6)
              </Badge>
            {/if}
          </Table.Cell>
          <Table.Cell class="p-4 text-right relative">
            <div class="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="icon-xs"
                onclick={() => onEditAccountClass(ac)}
                title="Modifier"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                class="border-destructive/20 hover:bg-destructive/10 text-destructive"
                onclick={() => deletingAccountClass = ac}
                disabled={isSubmitting}
                title="Supprimer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </Button>
            </div>
          </Table.Cell>
        </Table.Row>
      {/each}
      {#if (accountClasses || []).length === 0}
        <Table.Row>
          <Table.Cell colspan={4} class="p-8 text-center text-muted-foreground">
            Aucune classe de compte définie.
          </Table.Cell>
        </Table.Row>
      {/if}
    </Table.Body>
  </Table.Root>
</div>

<AlertDialog.Root open={!!deletingAccountClass} onOpenChange={(o) => { if(!o) deletingAccountClass = null; }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        Supprimer la classe {deletingAccountClass?.code} ?
      </AlertDialog.Title>
      <AlertDialog.Description>
        Êtes-vous sûr de vouloir supprimer définitivement la classe de compte "{deletingAccountClass?.label}" ?
        Cette action est irréversible.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action 
        onclick={handleConfirmDelete} 
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        disabled={isSubmitting}
      >
        Supprimer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

