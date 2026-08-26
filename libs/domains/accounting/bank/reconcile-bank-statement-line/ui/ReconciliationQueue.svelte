<script lang="ts">
  import { CheckCircle2, Inbox, Search, X } from '@lucide/svelte';
  import { Amount, Badge, Button, Card, Input, SearchableCombobox } from '@nba/ui';
  import ReconciliationRow from './ReconciliationRow.svelte';
  import ReconciliationGapSheet from '../../get-reconciliation-statement/ui/ReconciliationGapSheet.svelte';
  import { isOneClickValidatable, parseSuggestion } from './reconciliation-suggestion';
  import ReconciliationRowDetail from './ReconciliationRowDetail.svelte';
  import type { ReconciliationState } from './reconciliation.svelte';

  /* Prop renommée : déclarée `state`, elle capturerait la rune `$state`. */
  let { state: reconState = $bindable() }: { state: ReconciliationState } = $props();

  const MONTHS = [
    { label: 'Tous les mois', value: '' }, { label: 'Janvier', value: '01' }, { label: 'Février', value: '02' },
    { label: 'Mars', value: '03' }, { label: 'Avril', value: '04' }, { label: 'Mai', value: '05' },
    { label: 'Juin', value: '06' }, { label: 'Juillet', value: '07' }, { label: 'Août', value: '08' },
    { label: 'Septembre', value: '09' }, { label: 'Octobre', value: '10' }, { label: 'Novembre', value: '11' },
    { label: 'Décembre', value: '12' }
  ];

  /*
    L'autre moitié de l'écart — et elle seule.

    Les « lignes non comptabilisées » ne sont rien d'autre que la file affichée ci-dessous : les
    annoncer en pastille répétait une quatrième fois un nombre déjà présent dans le titre, dans le
    filtre par compte et dans l'encart d'état. Restent les écritures que les livres portent et
    qu'aucune ligne de relevé ne pointe : celles-là ne se lisent nulle part ailleurs.
  */
  const gapStats = $derived.by(() => {
    const st = reconState.reconciliationStatements ?? [];
    return {
      entriesCount: st.reduce((n: number, s: any) => n + (s.unpointedEntries?.length ?? 0), 0),
      entriesCents: st.reduce((n: number, s: any) => n - (s.unpointedEntriesTotalCents ?? 0), 0)
    };
  });

  let gapSheetOpen = $state(false);

  /* La ligne dit son compte tant que la file en mélange plusieurs — sans quoi on pointe sans
     savoir contre quel état on progresse. Une fois filtrée, l'information est redondante. */
  const showAccountOnRows = $derived(!reconState.isSingleAccount && !reconState.accountFilter);
  const accountLabelOf = (line: any) =>
    reconState.accountOptions.find((a) => a.id === String(line.accountId))?.label ?? null;

  const total = $derived(reconState.pendingCount + reconState.reconciledCount + reconState.ignoredCount);
  const done = $derived(reconState.reconciledCount + reconState.ignoredCount);
  const progress = $derived(total === 0 ? 0 : Math.round((done / total) * 100));

  const rows = $derived(reconState.view === 'history' ? reconState.historyTransactions : reconState.queueTransactions);

  /*
    Le clavier, parce qu'une file se vide au clavier.

    Deux cents lignes à traiter à la souris, c'est deux cents allers-retours vers un bouton. Les
    raccourcis ne s'appliquent que hors saisie et hors ligne dépliée : dans un formulaire, `i` est
    une lettre, pas un ordre.
  */
  let focusedIndex = $state(0);
  let searchInput = $state<HTMLInputElement | null>(null);

  const focusedLine = $derived(rows[Math.min(focusedIndex, rows.length - 1)] ?? null);

  function isTyping(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function moveFocus(delta: number) {
    if (rows.length === 0) return;
    focusedIndex = Math.max(0, Math.min(rows.length - 1, focusedIndex + delta));
    /* Appel optionnel : `scrollIntoView` n'existe pas partout (jsdom), et son absence ne doit pas
       interrompre la navigation au clavier. */
    document.querySelector(`[data-line-id="${rows[focusedIndex].id}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === '/' && !isTyping(e.target)) {
      e.preventDefault();
      searchInput?.focus();
      return;
    }
    if (e.key === 'Escape' && reconState.selectedTx) {
      reconState.selectedTx = null;
      return;
    }
    // Une ligne dépliée rend la main au formulaire : seule Échap la referme.
    if (isTyping(e.target) || reconState.selectedTx || e.metaKey || e.ctrlKey || e.altKey) return;

    const line = focusedLine;
    switch (e.key) {
      case 'ArrowDown': case 'j': e.preventDefault(); moveFocus(1); break;
      case 'ArrowUp': case 'k': e.preventDefault(); moveFocus(-1); break;
      case 'e':
        if (!line) return;
        e.preventDefault();
        reconState.selectedTx = line;
        break;
      case 'Enter':
        if (!line || reconState.isClosed) return;
        e.preventDefault();
        // Entrée valide ce qui est proposé ; à défaut, elle ouvre la ligne pour le saisir.
        if (line.status === 'pending' && isOneClickValidatable(parseSuggestion(line))) {
          reconState.validateSuggestion(line);
        } else {
          reconState.selectedTx = line;
        }
        break;
    }
  }

  /* La file se raccourcit à mesure qu'on la vide : le curseur ne doit pas rester au-delà. */
  $effect(() => {
    if (focusedIndex > rows.length - 1) focusedIndex = Math.max(0, rows.length - 1);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<Card.Root class="flex flex-col overflow-hidden">
  <!-- L'en-tête dit où l'on en est, et non ce qu'on pourrait filtrer. -->
  <div class="p-4 border-b border-border bg-muted/30 space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        {#if reconState.view === 'queue'}
          <Inbox class="h-4 w-4 text-primary" />
          <h2 class="text-sm font-bold">
            {reconState.pendingCount} opération{reconState.pendingCount > 1 ? 's' : ''} à rapprocher
          </h2>
        {:else}
          <CheckCircle2 class="h-4 w-4 text-success" />
          <h2 class="text-sm font-bold">Historique</h2>
        {/if}
        <span class="text-xs text-muted-foreground">
          {done} sur {total} traitée{done > 1 ? 's' : ''}
        </span>
      </div>

      <div class="flex items-center gap-2">
        {#if reconState.view === 'queue'}
          <Button
            variant="ghost"
            size="sm"
            class="text-xs h-8"
            onclick={() => (reconState.view = 'history')}
          >
            Voir l'historique ({reconState.reconciledCount + reconState.ignoredCount})
          </Button>
        {:else}
          <Button variant="ghost" size="sm" class="text-xs h-8 gap-1" onclick={() => (reconState.view = 'queue')}>
            <X class="h-3.5 w-3.5" />
            <span>Revenir à la file</span>
          </Button>
        {/if}
      </div>
    </div>

    <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div class="h-full bg-success transition-all duration-500" style={`width: ${progress}%`}></div>
    </div>

    {#if gapStats.entriesCount > 0}
      <button
        type="button"
        class="flex items-center gap-1.5 self-start rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted cursor-pointer"
        onclick={() => (gapSheetOpen = true)}
      >
        <span class="text-muted-foreground">
          {gapStats.entriesCount} écriture{gapStats.entriesCount > 1 ? 's' : ''} sans ligne de relevé
        </span>
        <Amount cents={gapStats.entriesCents} showSign class="text-xs font-semibold" />
      </button>
    {/if}

    {#if reconState.view === 'history'}
      <div class="flex items-center gap-1">
        <Button
          variant={reconState.activeTab === 'reconciled' ? 'default' : 'ghost'}
          size="sm" class="text-xs h-7"
          onclick={() => (reconState.activeTab = 'reconciled')}
        >
          Rapprochées ({reconState.reconciledCount})
        </Button>
        <Button
          variant={reconState.activeTab === 'ignored' ? 'default' : 'ghost'}
          size="sm" class="text-xs h-7"
          onclick={() => (reconState.activeTab = 'ignored')}
        >
          Ignorées ({reconState.ignoredCount})
        </Button>
      </div>
    {/if}

    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <!--
          La loupe passe par la prop `icon` du composant, et non par un positionnement à la main.

          Posée en absolu au-dessus du champ, elle chevauchait le texte : le `pl-7` de l'appelant
          se faisait écraser dès le palier `sm` par le `sm:px-2.5` du composant — une classe non
          préfixée ne l'emporte pas sur une variante responsive. `Input` applique `!pl-9` quand on
          lui passe une icône, ce qui, lui, tranche.
        -->
        <Input
          type="text"
          icon={Search}
          placeholder="Rechercher une opération…"
          bind:value={reconState.searchQuery}
          bind:ref={searchInput}
          class="h-8 text-xs !pr-8"
        />
        {#if reconState.searchQuery}
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onclick={() => (reconState.searchQuery = '')}
          >
            <X class="h-3.5 w-3.5" />
          </button>
        {/if}
      </div>
      <SearchableCombobox class="h-8 text-xs w-40" items={MONTHS} bind:value={reconState.monthFilter} />

      <!--
        Le compte sur lequel on rapproche.

        Un rapprochement se pose compte par compte : c'est l'unité sur laquelle l'état vérifie son
        identité. Le filtre ne s'affiche que s'il y a matière à trancher, et chaque compte annonce
        ce qu'il lui reste — c'est là que se lit où le travail attend.
      -->
      {#if !reconState.isSingleAccount}
        <SearchableCombobox
          class="h-8 text-xs w-52 shrink-0"
          items={[
            { label: `Tous les comptes (${reconState.pendingCount})`, value: '' },
            ...reconState.accountOptions.map((a) => ({
              label: `${a.label} (${a.pendingCount})`,
              value: a.id
            }))
          ]}
          bind:value={reconState.accountFilter}
        />
      {/if}

    </div>

  </div>

  <!--
    Les raccourcis s'annoncent : un raccourci que rien ne signale n'existe que dans le code.
  -->
  {#if rows.length > 0 && reconState.view === 'queue'}
    <div class="hidden lg:flex items-center gap-3 px-4 py-1.5 border-b border-border/60 bg-muted/10 text-[11px] text-muted-foreground">
      {#each [['↑ ↓', 'naviguer'], ['Entrée', 'valider'], ['E', 'modifier'], ['/', 'rechercher']] as [k, label]}
        <span class="flex items-center gap-1">
          <kbd class="rounded border border-border bg-background px-1 py-px font-mono text-[10px]">{k}</kbd>
          <span>{label}</span>
        </span>
      {/each}
    </div>
  {/if}

  <div class="divide-y-0">
    {#if rows.length === 0}
      <div class="p-12 text-center text-muted-foreground">
        {#if reconState.searchQuery || reconState.monthFilter}
          <p class="text-sm">Aucune opération ne correspond à cette recherche.</p>
        {:else if reconState.view === 'history'}
          <p class="text-sm">
            {reconState.activeTab === 'reconciled' ? 'Aucune opération rapprochée.' : 'Aucune opération ignorée.'}
          </p>
        {:else}
          <CheckCircle2 class="h-10 w-10 mx-auto mb-3 text-success" />
          <p class="text-base font-semibold text-foreground">La file est vide.</p>
          <p class="text-sm">Toutes les opérations du relevé ont été traitées.</p>
        {/if}
      </div>
    {:else}
      {#each rows as line (line.id)}
        <ReconciliationRow
          bind:state={reconState}
          {line}
          isExpanded={reconState.selectedTx?.id === line.id}
          isFocused={focusedLine?.id === line.id}
          accountLabel={showAccountOnRows ? accountLabelOf(line) : null}
        >
          <ReconciliationRowDetail bind:state={reconState} {line} />
        </ReconciliationRow>
      {/each}
    {/if}
  </div>
</Card.Root>

<ReconciliationGapSheet
  bind:open={gapSheetOpen}
  statements={reconState.reconciliationStatements ?? []}
/>
