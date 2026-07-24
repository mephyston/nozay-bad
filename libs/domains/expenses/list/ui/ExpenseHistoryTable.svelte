<script lang="ts">
  import { Eye, MoreVertical, RefreshCw, FileText } from '@lucide/svelte';
  import { Button, Table, Badge, Card } from '@nba/ui';
  import type { Expense } from './expenses-types';
  import { categoryColors } from './expenses-types';

  let {
    historyExpenses = [],
    isClosed = false,
    categoryLabels = {},
    onSelectPhoto,
    onCancelValidation
  }: {
    historyExpenses: Expense[];
    isClosed?: boolean;
    categoryLabels: Record<string, string>;
    onSelectPhoto: (url: string) => void;
    onCancelValidation: (id: number) => void;
  } = $props();

  let openDropdownId = $state<number | null>(null);

  function toggleDropdown(id: number, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }

  $effect(() => {
    const handleGlobalClick = () => { openDropdownId = null; };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  });
</script>

{#if historyExpenses.length === 0}
  <Card.Root class="text-center py-16">
    <Card.Content>
      <FileText class="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
      <Card.Title class="text-lg font-bold text-foreground">Aucun historique</Card.Title>
      <Card.Description class="text-sm text-muted-foreground mt-1">Les dépenses approuvées ou rejetées apparaîtront ici.</Card.Description>
    </Card.Content>
  </Card.Root>
{:else}
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head class="p-4">Date</Table.Head>
        <Table.Head class="p-4">Bénéficiaire</Table.Head>
        <Table.Head class="p-4">Motif</Table.Head>
        <Table.Head class="p-4">Catégorie</Table.Head>
        <Table.Head class="p-4">Montant</Table.Head>
        <Table.Head class="p-4">Justificatif</Table.Head>
        <Table.Head class="p-4 text-right">Statut</Table.Head>
        <Table.Head class="p-4 text-right">Actions</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each historyExpenses as exp (exp.id)}
        <Table.Row class="hover:bg-muted/50 transition-colors">
          <Table.Cell class="p-4 text-muted-foreground">
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
          <Table.Cell class="p-4 font-mono font-bold text-foreground font-semibold">
            {(exp.amount / 100).toFixed(2)} €
          </Table.Cell>
          <Table.Cell class="p-4">
            {#if exp.photoUrl}
              <Button
                variant="ghost"
                size="sm"
                onclick={() => onSelectPhoto(exp.photoUrl!)}
                class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 h-auto py-1 px-2"
              >
                <Eye class="w-3.5 h-3.5" />
                Visualiser
              </Button>
            {:else}
              <span class="text-xs text-muted-foreground">Aucun</span>
            {/if}
          </Table.Cell>
          <Table.Cell class="p-4 text-right">
            {#if exp.status === 'approved'}
              <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                Remboursé
              </Badge>
            {:else}
              <Badge variant="outline" class="bg-destructive/10 text-destructive border border-destructive/20">
                Rejeté
              </Badge>
            {/if}
          </Table.Cell>
          <Table.Cell class="p-4 text-right relative">
            {#if !isClosed}
              <div class="inline-block text-left">
                <Button 
                  variant="ghost"
                  size="icon-sm"
                  onclick={(e) => toggleDropdown(exp.id, e)} 
                  class="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" 
                  aria-label="Actions"
                >
                  <MoreVertical class="w-4 h-4" />
                </Button>

                {#if openDropdownId === exp.id}
                  <div class="absolute right-4 mt-1 w-44 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border font-medium">
                    <Button
                      variant="ghost"
                      onclick={() => { openDropdownId = null; onCancelValidation(exp.id); }}
                      class="w-full px-3 py-1.5 text-xs text-primary hover:bg-primary/10 font-semibold flex items-center gap-1.5 justify-start h-auto"
                    >
                      <RefreshCw class="w-3.5 h-3.5" />
                      Remettre en attente
                    </Button>
                  </div>
                {/if}
              </div>
            {:else}
              <span class="text-xs text-muted-foreground italic">Aucune</span>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
{/if}
