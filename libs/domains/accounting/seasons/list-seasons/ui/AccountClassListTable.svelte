<script lang="ts">
  import { Check, Edit2, Trash2, X } from "@lucide/svelte";
  import { Button, Input, Badge, Table, AlertDialog, toast } from "@nba/ui";
  import type { AccountClass } from "./settings-types";

  let {
    accountClasses = [],
    isSubmitting = false,
    onUpdateAccountClass,
    onDeleteAccountClass
  }: {
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onUpdateAccountClass: (code: string, updates: { label: string; type: 'recette' | 'depense' | 'tresorerie' }) => Promise<void>;
    onDeleteAccountClass: (code: string) => Promise<void>;
  } = $props();

  let editingClassCode = $state<string | null>(null);
  let editClassLabel = $state('');
  let editClassType = $state<'recette' | 'depense' | 'tresorerie'>('recette');

  function startEditAccountClass(ac: AccountClass) {
    editingClassCode = ac.code;
    editClassLabel = ac.label;
    editClassType = ac.type;
  }

  async function handleSave(code: string) {
    await onUpdateAccountClass(code, {
      label: editClassLabel.trim(),
      type: editClassType
    });
    editingClassCode = null;
  }

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

<div class="overflow-x-auto border border-border rounded-lg bg-card min-h-[180px]">
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
            {#if editingClassCode === ac.code}
              <Input
                type="text"
                bind:value={editClassLabel}
                class="h-7 text-xs font-medium"
              />
            {:else}
              <span class="font-semibold text-foreground">{ac.label}</span>
            {/if}
          </Table.Cell>
          <Table.Cell class="p-4">
            {#if editingClassCode === ac.code}
              <select
                value={editClassType}
                onchange={(e) => editClassType = e.currentTarget.value as any}
                class="px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="recette">Produit (Recette)</option>
                <option value="depense">Charge (Dépense)</option>
                <option value="tresorerie">Trésorerie (5)</option>
              </select>
            {:else}
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
            {/if}
          </Table.Cell>
          <Table.Cell class="p-4 text-right relative">
            {#if editingClassCode === ac.code}
              <div class="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onclick={() => editingClassCode = null}
                  title="Annuler"
                >
                  <X class="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon-xs"
                  onclick={() => handleSave(ac.code)}
                  disabled={isSubmitting}
                  title="Enregistrer"
                >
                  <Check class="w-3.5 h-3.5" />
                </Button>
              </div>
            {:else}
              <div class="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onclick={() => startEditAccountClass(ac)}
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
            {/if}
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

