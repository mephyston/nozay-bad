<script lang="ts">
  import { Button, Badge, Amount, FormField, Combobox, type ComboboxItem } from '@nba/ui';
  import { Trash2, Plus, Split } from '@lucide/svelte';
  import type { SplitRow } from './reconciliation-types';

  let {
    splits = $bindable([]),
    remainingAmount = 0,
    splitSum = 0,
    categories = [],
    memberItems = [],
    addSplitRow,
    removeSplitRow
  }: {
    splits: SplitRow[];
    remainingAmount: number;
    splitSum: number;
    categories: any[];
    /** L'annuaire, déjà façonné : chaque part peut viser son propre adhérent. */
    memberItems?: ComboboxItem[];
    addSplitRow: () => void;
    removeSplitRow: (idx: number) => void;
  } = $props();

  const isComplete = $derived(Math.abs(splitSum - remainingAmount) < 1);
</script>

<div class="space-y-4 p-4 bg-muted/30 border border-border rounded-xl">
  <div class="flex items-center justify-between border-b border-border/60 pb-3">
    <div class="flex items-center gap-2">
      <Split class="w-4 h-4 text-primary" />
      <span class="text-xs font-bold text-foreground">Ventilation des montants par catégorie</span>
    </div>
    <div class="text-xs font-medium flex items-center gap-2">
      <span class="text-muted-foreground">Total ventilé :</span>
      <Badge variant={isComplete ? "default" : "destructive"} class="font-outfit tabular-nums">
        <Amount cents={splitSum} /> / <Amount cents={remainingAmount} />
      </Badge>
    </div>
  </div>

  <div class="space-y-2.5">
    {#each splits as sp, idx}
      <div class="flex flex-col gap-1 bg-background p-2.5 rounded-lg border border-border/70 shadow-sm">
        <!--
          La provenance de la part, quand elle en a une.

          Une part reprise d'une facture doit se relire comme telle : c'est ce qui distingue une
          ventilation choisie d'une ventilation héritée, et ce qui permet de repérer la part dont
          l'imputation reste à choisir.
        -->
        {#if sp.label}
          <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span class="truncate">{sp.label}</span>
            {#if !sp.category}
              <Badge variant="warning" size="xs">Catégorie à choisir</Badge>
            {/if}
          </div>
        {/if}

        <!--
          Chaque part porte son adhérent.

          `ledger_entries.member_id` existe par écriture, et le rapprochement lit déjà `memberId`
          part par part : un virement groupé réglant deux cotisations produit deux écritures, une
          par adhérent. Seul le formulaire ne savait pas le demander.
        -->
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div class="min-w-0 flex-1">
            <Combobox
              id="split-cat-{idx}"
              label="Catégorie"
              placeholder="Rechercher une catégorie..."
              items={categories.map((cat) => ({ label: cat.name || cat.adminLabel || `Catégorie ${cat.id}`, value: String(cat.id) }))}
              bind:value={sp.category}
              allowClear={false}
            />
          </div>

          {#if memberItems.length > 0}
            <div class="min-w-0 flex-1">
              <Combobox
                id="split-member-{idx}"
                label="Adhérent (optionnel)"
                placeholder="Tapez pour rechercher..."
                items={memberItems}
                value={sp.memberId != null ? String(sp.memberId) : ''}
                onselect={(v) => (sp.memberId = v ? Number(v) : null)}
                allowClear={true}
                clearLabel="Aucun adhérent"
              />
            </div>
          {/if}

          <div class="w-full sm:w-28">
            <!--
              L'étiquette reprend celle de `Combobox`, et non celle de `FormField`.

              La première a la hauteur de ligne par défaut, la seconde `leading-none` : quatre
              pixels d'écart, qui décalent le champ d'à côté. L'unité est dans l'étiquette — le
              « € » flottant, lui, se calait sur le bloc entier et tombait au-dessus du champ.
            -->
            <div class="space-y-1.5 w-full">
              <label for="split-amount-{idx}" class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Montant en €
              </label>
              <input
                type="number"
                step="0.01"
                id="split-amount-{idx}"
                placeholder="0.00"
                bind:value={sp.amount}
                class="no-spinner w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-outfit tabular-nums text-right focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onclick={() => removeSplitRow(idx)}
            class="self-end rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Supprimer la ligne de ventilation"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>
    {/each}
  </div>

  <div class="pt-1">
    <Button 
      type="button" 
      variant="outline"
      size="sm"
      onclick={addSplitRow}
      class="w-full text-xs gap-1.5 border-dashed"
    >
      <Plus class="w-3.5 h-3.5" />
      <span>Ajouter une ligne de ventilation</span>
    </Button>
  </div>
</div>

<style>
  /*
    Les flèches d'incrément n'ont pas de sens sur un montant.

    Elles volent la moitié droite du champ, réagissent à la molette au passage de la souris — ce
    qui modifie une somme sans qu'on l'ait demandé — et pas un montant ne se saisit par pas de un
    centime. Le type `number` reste, pour le clavier numérique sur mobile et la validation.
  */
  :global(.no-spinner)::-webkit-outer-spin-button,
  :global(.no-spinner)::-webkit-inner-spin-button {
    appearance: none;
    margin: 0;
  }
  :global(.no-spinner) {
    appearance: textfield;
    -moz-appearance: textfield;
  }
</style>
