<script lang="ts">
  import { Check, Calendar, Eye, Edit2, Image as ImageIcon } from '@lucide/svelte';
  import { Button, Badge, Card } from '@nba/ui';
  import type { Expense } from './expenses-types';
  import { categoryColors } from './expenses-types';

  let {
    exp,
    isClosed = false,
    submittingId = null,
    categoryLabels = {},
    onSelectPhoto,
    onStartEdit,
    onAction
  }: {
    exp: Expense;
    isClosed?: boolean;
    submittingId: number | null;
    categoryLabels: Record<string, string>;
    onSelectPhoto: (url: string) => void;
    onStartEdit: (exp: Expense) => void;
    onAction: (id: number, action: 'approve' | 'reject') => void;
  } = $props();
</script>

<Card.Header class="pb-2 flex flex-row justify-between items-start space-y-0">
  <div>
    <Card.Title class="font-bold text-lg text-foreground">{exp.emitterName}</Card.Title>
    <Card.Description class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
      <Calendar class="w-3.5 h-3.5" />
      Soumis le {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
    </Card.Description>
  </div>
  <div class="text-right">
    <span class="text-2xl font-black text-primary font-mono">
      {(exp.amount / 100).toFixed(2)} €
    </span>
  </div>
</Card.Header>

<Card.Content class="space-y-4">
  <div>
    <Badge variant="outline" class={categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}>
      {categoryLabels[exp.category] || exp.category}
    </Badge>
  </div>

  <div class="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
    <p class="whitespace-pre-wrap">{exp.description}</p>
  </div>

  {#if exp.photoUrl}
    <div class="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/60">
      <span class="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <ImageIcon class="w-4 h-4" /> Justificatif de dépense
      </span>
      <Button variant="ghost" size="sm" onclick={() => onSelectPhoto(exp.photoUrl!)} class="text-xs font-bold text-primary hover:underline flex items-center gap-1 h-auto py-1 px-2">
        <Eye class="w-3.5 h-3.5" /> Visualiser
      </Button>
    </div>
  {/if}
</Card.Content>

{#if !isClosed}
  <Card.Footer class="border-t border-border bg-muted/20 px-5 py-3.5 flex justify-between items-center gap-3">
    <Button variant="outline" onclick={() => onStartEdit(exp)} disabled={submittingId !== null} class="flex items-center gap-1.5">
      <Edit2 class="w-3.5 h-3.5" /> Modifier
    </Button>

    <div class="flex gap-3">
      <Button variant="outline" onclick={() => onAction(exp.id, 'reject')} disabled={submittingId !== null} class="hover:bg-destructive/10 hover:text-destructive hover:border-destructive">
        Rejeter
      </Button>
      <Button onclick={() => onAction(exp.id, 'approve')} disabled={submittingId !== null} class="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
        {#if submittingId === exp.id}
          <span class="animate-pulse">Validation...</span>
        {:else}
          <Check class="w-4 h-4" /> Rembourser
        {/if}
      </Button>
    </div>
  </Card.Footer>
{/if}
