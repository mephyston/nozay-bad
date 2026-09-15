<script lang="ts">
  import { Check, ChevronDown, Link2, Sparkles, Pencil, HandCoins, ArrowLeftRight } from '@lucide/svelte';
  import MemberTransferDialog from './MemberTransferDialog.svelte';
  import InternalTransferDialog from './InternalTransferDialog.svelte';
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
    isDimmed = false,
    accountLabel = null,
    children
  }: {
    state: ReconciliationState;
    line: BankStatementLine;
    isExpanded?: boolean;
    /** Ligne visée par le clavier : elle doit se voir, sans se confondre avec une ligne ouverte. */
    isFocused?: boolean;
    /** Une autre ligne est ouverte : celle-ci s'efface et cesse de répondre. */
    isDimmed?: boolean;
    /** Le compte de la ligne, quand la file en mélange plusieurs. */
    accountLabel?: string | null;
    children?: import('svelte').Snippet;
  } = $props();

  const cents = $derived((line as any).amountCents ?? line.amount ?? 0);
  const sug = $derived(parseSuggestion(line));

  /* Le détail que la troncature cache, rendu au survol. Voir le commentaire du bloc. */
  const detailComplet = $derived(
    [
      line.name,
      line.memo || null,
      `${line.date} · ${(cents / 100).toFixed(2)} €`,
      accountLabel,
      `Réf. banque : ${line.fitid}`
    ]
      .filter(Boolean)
      .join('\n')
  );

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

  /*
   * Une ligne au crédit du compte courant peut être le virement d'une adhérente qui alimente son
   * porte-monnaie Badnet par le club. Ce n'est pas une recette : le bouton crée le virement
   * interne depuis le compte d'attente et pointe la ligne, en un geste.
   */
  const canBeMemberTransfer = $derived(
    line.status === 'pending' && cents > 0 && !!reconState.thirdPartyAccount && reconState.isBankLine(line)
  );
  let showMemberTransfer = $state(false);

  /*
   * Un mouvement entre deux comptes du club se saisit d'ici, depuis l'une ou l'autre de ses
   * lignes : le bouton crée le virement et pointe la jambe de ce compte — et celle d'en face
   * quand sa ligne est là. Il n'y a rien à choisir tant qu'il n'existe pas d'autre compte.
   */
  const canBeInternalTransfer = $derived(
    line.status === 'pending' && cents !== 0 && reconState.transferCounterpartsFor(line).length > 0
  );
  /* Il devient le geste principal quand l'analyse a reconnu un virement ; sinon il reste discret,
     réduit à son icône : la colonne d'actions a une largeur fixe et déjà trois boutons. */
  const isTransferPrimary = $derived(canBeInternalTransfer && sug?.kind === 'internal-transfer' && !hasExistingEntry);
  let showInternalTransfer = $state(false);

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

<!--
  Une ligne ouverte porte un formulaire dense ; les voisines s'effacent le temps qu'on le lise.

  On estompe plutôt qu'on ne floute : `backdrop-filter` sur une liste de plusieurs dizaines de
  lignes coûte cher au défilement, pour un résultat inhabituel dans un outil de saisie. Les lignes
  effacées cessent aussi de répondre au clic — sans quoi on refermerait par mégarde ce qu'on est
  en train de remplir.
-->
<div
  class="border-b border-border last:border-b-0 transition-all duration-200
    {isExpanded ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : isFocused ? 'bg-muted/60' : 'hover:bg-muted/40'}
    {isFocused && !isExpanded ? 'ring-1 ring-inset ring-primary/40' : ''}
    {isDimmed ? 'pointer-events-none opacity-35' : ''}"
  data-line-id={line.id}
  data-focused={isFocused ? 'true' : undefined}
>
  <!--
    Une grille à colonnes fixes, et non deux moitiés qui se calent sur leur contenu.

    Chaque volet occupait `flex-1` et se centrait sur sa propre hauteur : une ligne sans
    proposition tenant sur un mot, une autre en portant trois, les dates, les montants et les
    boutons ne tombaient pas à la même abscisse d'une ligne à l'autre. On lit une file en
    balayant une colonne du regard ; il faut donc qu'il y en ait une.
  -->
  <div class="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-3">
    <!-- Volet gauche : le fait bancaire. Il ne se modifie pas, il se lit. -->
    <span class="shrink-0 text-[11px] text-muted-foreground tabular-nums md:w-[4.5rem]">{line.date}</span>

    <!--
      Le détail complet au survol.

      Le libellé et le mémo sont tronqués — il le faut, une file se lit en balayant une
      colonne — mais un libellé bancaire porte justement à sa fin ce qui l'identifie :
      le bénéficiaire, la référence du prélèvement. Tronqué, il ne permet plus de vérifier
      à quoi on rapproche, et le seul recours était d'aller relire le relevé.

      L'infobulle native plutôt que le composant `Tooltip` : celui-ci demande un Provider et
      un Portal, n'est utilisé nulle part ailleurs dans le dépôt, et une ligne de file en
      contiendrait autant qu'il y a d'opérations. `title` ne coûte rien et survit à tout.

      Le `fitid` y figure parce que c'est l'identifiant que la banque donne à l'opération :
      c'est par lui qu'on retrouve la ligne dans l'export, ou qu'on la désigne.
    -->
    <div class="min-w-0 flex-1" title={detailComplet}>
      <div class="truncate text-sm font-medium">{line.name}</div>
      {#if line.memo}
        <div class="truncate text-[11px] italic text-muted-foreground">{line.memo}</div>
      {/if}
      {#if accountLabel}
        <Badge variant="secondary" size="xs">{accountLabel}</Badge>
      {/if}
    </div>

    <Amount {cents} colorize={true} class="shrink-0 text-sm font-semibold md:w-28 md:text-right" />

    <div class="hidden w-px self-stretch bg-border/60 md:block"></div>

    <!-- Volet droit : la proposition, modifiable. -->
    <div class="flex min-w-0 flex-col justify-center gap-1 md:w-[34%]">
      {#if line.status === 'reconciled'}
        <Badge variant="success" size="xs" class="self-start">Rapprochée</Badge>
      {:else if hasExistingEntry}
        <div class="flex flex-wrap items-center gap-1.5">
          <Link2 class="h-3 w-3 shrink-0 text-success" />
          <span class="text-xs font-medium text-foreground">
            {matchingEntries.length === 1
              ? 'Une écriture existante correspond'
              : `${matchingEntries.length} écritures existantes correspondent`}
          </span>
        </div>
        <span class="truncate text-[11px] text-muted-foreground">
          {matchingEntries[0].date} · {matchingEntries[0].description}
        </span>
      {:else if sug?.kind === 'internal-transfer'}
        <span class="text-xs font-medium text-foreground">Virement interne</span>
        <span class="text-[11px] text-muted-foreground">
          {canBeInternalTransfer ? 'Le bouton « Virement » l\'écrit en deux jambes.' : 'À saisir au grand livre, en deux jambes.'}
        </span>
      {:else if sug}
        <div class="flex flex-wrap items-center gap-1.5">
          <Sparkles class="h-3 w-3 shrink-0 text-primary" />
          <span class="truncate text-xs font-medium text-foreground">
            {categoryName ?? 'Catégorie à choisir'}
          </span>
          {#if sug.confidence}
            <Badge variant="ai" size="xs">{Math.round(sug.confidence * 100)} %</Badge>
          {/if}
        </div>
        <span class="truncate text-[11px] text-muted-foreground">
          {sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : 'Aucun adhérent')}
        </span>
        {#if sug.accrualType && sug.accrualType !== 'normal'}
          <Badge variant="warning" size="xs" class="self-start">
            {accrualLabel(sug.accrualType)}{sug.targetSeason ? ` — ${sug.targetSeason}` : ''}
          </Badge>
        {/if}
      {:else}
        <span class="text-xs italic text-muted-foreground">Aucune proposition — à saisir</span>
      {/if}
    </div>

    <!-- Une seule action par défaut ; le reste est discret. Largeur fixe, pour que les boutons
         tombent au même endroit d'une ligne à l'autre. -->
    <div class="flex shrink-0 items-center justify-end gap-1 md:w-[13.5rem]">
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

        {#if canBeInternalTransfer}
          <Button
            size="sm"
            variant={isTransferPrimary ? 'default' : 'ghost'}
            class="h-8 gap-1.5 text-xs"
            data-action="internal-transfer"
            title="Virement entre deux comptes du club"
            disabled={reconState.isClosed || reconState.isSubmitting}
            onclick={() => (showInternalTransfer = true)}
          >
            <ArrowLeftRight class="h-3.5 w-3.5" />
            <span class={isTransferPrimary ? 'hidden sm:inline' : 'sr-only'}>Virement</span>
          </Button>
        {/if}

        {#if canBeMemberTransfer}
          <Button
            size="sm"
            variant="ghost"
            class="h-8 gap-1.5 text-xs"
            data-action="member-transfer"
            title="Virement reçu d'une adhérente pour son porte-monnaie Badnet"
            disabled={reconState.isClosed || reconState.isSubmitting}
            onclick={() => (showMemberTransfer = true)}
          >
            <HandCoins class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Adhérente</span>
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

{#if canBeMemberTransfer}
  <MemberTransferDialog
    bind:open={showMemberTransfer}
    {line}
    isSubmitting={reconState.isSubmitting}
    onConfirm={(description) => reconState.handleMemberTransfer(line, description)}
  />
{/if}

{#if canBeInternalTransfer}
  <InternalTransferDialog
    bind:open={showInternalTransfer}
    state={reconState}
    {line}
    onConfirm={(accountId, description) => reconState.handleInternalTransfer(line, accountId, description)}
  />
{/if}
