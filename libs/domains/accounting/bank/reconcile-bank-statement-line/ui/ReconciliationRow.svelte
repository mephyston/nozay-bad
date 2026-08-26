<script lang="ts">
  import { Check, ChevronDown, Link2, Sparkles, RefreshCw, Pencil } from '@lucide/svelte';
  import { Amount, Badge, Button } from '@nba/ui';
  import { accrualLabel } from '../../../shared/accrual-labels';
  import { parseSuggestion, isOneClickValidatable } from './reconciliation-suggestion';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /* Prop renommée : déclarée `state`, elle capturerait la rune `$state`. */
  let {
    state: reconState = $bindable(),
    line,
    isExpanded = false,
    isFocused = false,
    accountLabel = null,
    children
  }: {
    state: ReconciliationState;
    line: BankStatementLine;
    isExpanded?: boolean;
    /** Ligne visée par le clavier : elle doit se voir, sans se confondre avec une ligne ouverte. */
    isFocused?: boolean;
    /** Le compte de la ligne, quand la file en mélange plusieurs. */
    accountLabel?: string | null;
    children?: import('svelte').Snippet;
  } = $props();

  const cents = $derived((line as any).amountCents ?? line.amount ?? 0);
  const sug = $derived(parseSuggestion(line));

  /**
   * Une écriture existante attend-elle d'être pointée ?
   *
   * C'est la première question à poser, avant toute suggestion : si les livres portent déjà
   * l'opération, la rapprocher consiste à **pointer**, jamais à créer. Proposer « Valider » —
   * qui crée — sur une ligne dont l'écriture existe produit un doublon de recette ou de charge,
   * que le rapprochement ne signale même pas : l'écriture orpheline y passe pour un simple
   * décalage de traitement, et l'état continue de boucler pendant que le résultat est faux.
   * C'est arrivé, sur 60,07 € de licence.
   */
  const matchingEntries = $derived(line.status === 'pending' ? reconState.getSuggestions(line) : []);
  const hasExistingEntry = $derived(matchingEntries.length > 0);

  const canValidateInOneClick = $derived(isOneClickValidatable(sug) && !hasExistingEntry);

  /** Ouvrir la ligne mène là où se trouve la décision : pointer, ou saisir. */
  function openOn(tab: 'manual' | 'ledger') {
    reconState.activeRightTab = tab;
    reconState.selectedTx = line;
  }

  const categoryName = $derived(
    sug?.category != null ? reconState.categories.find((c) => c.id === String(sug.category))?.name : null
  );

  function toggleExpand() {
    if (isExpanded) {
      reconState.selectedTx = null;
      return;
    }
    openOn(hasExistingEntry ? 'ledger' : 'manual');
  }
</script>

<div
  class="border-b border-border last:border-b-0 transition-colors {isExpanded ? 'bg-primary/5' : isFocused ? 'bg-muted/60' : 'hover:bg-muted/40'} {isFocused && !isExpanded ? 'ring-1 ring-inset ring-primary/40' : ''}"
  data-line-id={line.id}
  data-focused={isFocused ? 'true' : undefined}
>
  <div class="flex items-stretch gap-0">

    <!-- Volet gauche : le fait bancaire. Il ne se modifie pas, il se lit. -->
    <div class="flex-1 min-w-0 p-3 flex flex-col justify-center">
      <div class="flex items-baseline gap-2">
        <span class="text-[11px] text-muted-foreground tabular-nums shrink-0">{line.date}</span>
        <span class="font-medium text-sm truncate">{line.name}</span>
      </div>
      {#if accountLabel}
        <Badge variant="secondary" size="xs" class="self-start">{accountLabel}</Badge>
      {/if}
      {#if line.memo}
        <div class="text-[11px] text-muted-foreground italic truncate">{line.memo}</div>
      {/if}
      <Amount {cents} colorize={true} class="text-sm font-semibold mt-0.5 self-start" />
    </div>

    <!-- Volet droit : la proposition, modifiable. -->
    <div class="flex-1 min-w-0 p-3 border-l border-border/60 flex flex-col justify-center gap-1">
      {#if line.status === 'reconciled'}
        <Badge variant="success" size="xs" class="self-start">Rapprochée</Badge>
      {:else if line.status === 'ignored'}
        <Badge variant="secondary" size="xs" class="self-start">Ignorée</Badge>
      {:else if hasExistingEntry}
        <div class="flex items-center gap-1.5 flex-wrap">
          <Link2 class="h-3 w-3 text-success shrink-0" />
          <span class="text-xs font-medium text-foreground">
            {matchingEntries.length === 1
              ? 'Une écriture existante correspond'
              : `${matchingEntries.length} écritures existantes correspondent`}
          </span>
        </div>
        <span class="text-[11px] text-muted-foreground truncate">
          {matchingEntries[0].date} · {matchingEntries[0].description}
        </span>
      {:else if sug?.kind === 'internal-transfer'}
        <span class="text-xs font-medium text-foreground">Virement interne</span>
        <span class="text-[11px] text-muted-foreground">À saisir au grand livre, en deux jambes.</span>
      {:else if sug}
        <div class="flex items-center gap-1.5 flex-wrap">
          <Sparkles class="h-3 w-3 text-primary shrink-0" />
          <span class="text-xs font-medium text-foreground truncate">
            {categoryName ?? 'Catégorie à choisir'}
          </span>
          {#if sug.confidence}
            <Badge variant="ai" size="xs">{Math.round(sug.confidence * 100)} %</Badge>
          {/if}
        </div>
        <span class="text-[11px] text-muted-foreground truncate">
          {sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : 'Aucun adhérent')}
        </span>
        {#if sug.accrualType && sug.accrualType !== 'normal'}
          <Badge variant="warning" size="xs" class="self-start">
            {accrualLabel(sug.accrualType)}{sug.targetSeason ? ` — ${sug.targetSeason}` : ''}
          </Badge>
        {/if}
      {:else}
        <span class="text-xs text-muted-foreground italic">Aucune proposition — à saisir</span>
      {/if}
    </div>

    <!-- Une seule action par défaut ; le reste est discret. -->
    <div class="p-3 flex items-center gap-1 shrink-0">
      {#if line.status === 'pending'}
        {#if hasExistingEntry}
          <!--
            « Pointer », et non « Valider ».

            Créer une écriture pour une opération que les livres portent déjà la compte deux fois.
            Le bouton mène donc à la liste des écritures qui correspondent, où le geste est
            l'association.
          -->
          <Button
            size="sm"
            class="h-8 gap-1.5 text-xs"
            title="Pointer contre une écriture existante"
            disabled={reconState.isClosed || reconState.isSubmitting}
            onclick={() => openOn('ledger')}
          >
            <Link2 class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Pointer</span>
          </Button>
        {:else if canValidateInOneClick}
          <Button
            size="sm"
            class="h-8 gap-1.5 text-xs"
            title="Valider cette proposition"
            disabled={reconState.isClosed || reconState.isSubmitting}
            onclick={() => reconState.validateSuggestion(line)}
          >
            <Check class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Valider</span>
          </Button>
        {/if}

        <Button
          size="sm"
          variant="ghost"
          class="h-8 gap-1.5 text-xs"
          data-action="expand"
          title={isExpanded ? 'Replier' : 'Modifier / compléter'}
          onclick={toggleExpand}
        >
          {#if isExpanded}
            <ChevronDown class="h-3.5 w-3.5" />
          {:else}
            <Pencil class="h-3.5 w-3.5" />
          {/if}
          <span class="hidden lg:inline">{isExpanded ? 'Replier' : 'Modifier'}</span>
        </Button>

      {:else if line.status === 'ignored'}
        <Button
          size="sm"
          variant="outline"
          class="h-8 gap-1.5 text-xs"
          disabled={reconState.isClosed || reconState.isSubmitting}
          onclick={() => reconState.handleUnignore(line.id)}
        >
          <RefreshCw class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">Rétablir</span>
        </Button>
      {:else}
        <Button
          size="sm" variant="ghost" class="h-8 gap-1.5 text-xs"
          data-action="expand"
          title={isExpanded ? 'Replier' : 'Voir le détail'}
          onclick={toggleExpand}
        >
          <ChevronDown class="h-3.5 w-3.5" />
          <span class="hidden lg:inline">{isExpanded ? 'Replier' : 'Détail'}</span>
        </Button>
      {/if}
    </div>
  </div>

  {#if isExpanded}
    <div class="border-t border-border bg-background p-4">
      {@render children?.()}
    </div>
  {/if}
</div>
