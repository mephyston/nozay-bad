<script lang="ts">
  import { ArrowLeftRight, Check, HandCoins, Link2 } from '@lucide/svelte';
  import { Badge, Button, ResponsiveSheet } from '@nba/ui';
  import ReconciliationRowDetail from './ReconciliationRowDetail.svelte';
  import { ligneDeReleve, propositionDe, type EtatDeLigne } from './reconciliation-row-model';
  import { isOneClickValidatable, parseSuggestion } from './reconciliation-suggestion';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /**
   * La décision, au doigt.
   *
   * Le dépliage en place convient à un écran large : la ligne s'ouvre sous elle-même et
   * l'on garde la file en contexte. Sur un téléphone, ce formulaire — deux onglets, une
   * ventilation, un choix d'adhérent — occupe déjà plus que la hauteur visible, et
   * s'ouvre au milieu d'une liste qu'on vient de faire défiler.
   *
   * La feuille montre d'abord le fait bancaire **entier** : le libellé de la banque
   * porte à sa fin ce qui l'identifie, et tronqué sur une rangée il ne permet plus de
   * vérifier à quoi l'on rapproche. L'infobulle qui le rendait au survol n'existe pas
   * au doigt.
   */
  let {
    state: reconState = $bindable(),
    etat,
    onVirement,
    onAdherente
  }: {
    state: ReconciliationState;
    /** Ce que l'écran sait de la ligne ouverte : écritures existantes, gestes possibles. */
    etat: (line: BankStatementLine) => EtatDeLigne;
    onVirement: (line: BankStatementLine) => void;
    onAdherente: (line: BankStatementLine) => void;
  } = $props();

  const line = $derived(reconState.selectedTx);
  const contexte = $derived(line ? etat(line) : null);
  const ligne = $derived(line && contexte ? ligneDeReleve(line, contexte) : null);
  const proposition = $derived(line && contexte ? propositionDe(line, contexte) : null);

  const enAttente = $derived(line?.status === 'pending');
  const peutPointer = $derived(!!enAttente && (contexte?.ecrituresExistantes.length ?? 0) > 0);
  const peutValider = $derived(
    !!enAttente && !peutPointer && !!line && isOneClickValidatable(parseSuggestion(line))
  );
  const verrouille = $derived(reconState.isClosed || reconState.isSubmitting);

  /*
    « Valider » et « Créer et rapprocher » sont le même acte : créer l'écriture et pointer
    la ligne. Le premier exécute la proposition telle quelle, le second le formulaire une
    fois corrigé. La feuille n'en garde donc qu'un, dans sa barre de navigation — le
    raccourci d'un geste reste sur le balayage, qui est fait pour ça.

    La ventilation doit tomber juste avant d'être enregistrée : c'est la même garde que
    porte le bouton de bureau.
  */
  const sommeDesParts = $derived(
    reconState.splits.reduce((n: number, p: { amount?: number }) => n + Math.round((p.amount || 0) * 100), 0)
  );
  const validationPossible = $derived(
    !!enAttente &&
      reconState.activeRightTab === 'manual' &&
      !verrouille &&
      !(reconState.isSplitMode && sommeDesParts !== reconState.remainingAmount)
  );

  /*
    Aucun miroir : la ligne ouverte vit dans l'état partagé — c'est lui qui fait foi,
    puisque le tableau de bureau s'en sert aussi pour déplier sa ligne — et la feuille
    prévient de sa fermeture par `onOpenChange`.

    Deux effets se renvoyaient la valeur l'un à l'autre : la feuille se rouvrait dans la
    même passe, et ni le bouton de fermeture ni Échap n'en venaient à bout.
  */
  let ouvert = $state(!!reconState.selectedTx);
  $effect(() => {
    ouvert = !!reconState.selectedTx;
  });

  const compte = $derived(
    line ? (reconState.accountOptions.find((a) => a.id === String(line.accountId))?.label ?? null) : null
  );
</script>

{#snippet headerTrailing()}
  {#if enAttente && reconState.activeRightTab === 'manual'}
    <Button
      type="button"
      disabled={!validationPossible}
      onclick={() => reconState.handleCreateAndMatch()}
      class="size-11 rounded-full p-0"
      aria-label={reconState.isSplitMode ? 'Enregistrer la ventilation' : 'Créer et rapprocher'}
    >
      <Check class="size-5" />
    </Button>
  {/if}
{/snippet}

{#snippet rangee(label: string, valeur: string, selectable = false)}
  <div class="flex items-baseline justify-between gap-4 px-4 py-2.5">
    <span class="shrink-0 text-sm text-muted-foreground">{label}</span>
    <span class="min-w-0 text-right text-sm text-foreground" data-selectable={selectable ? '' : undefined}>
      {valeur}
    </span>
  </div>
{/snippet}

<ResponsiveSheet
  bind:open={ouvert}
  onOpenChange={(v) => {
    if (!v) reconState.selectedTx = null;
  }}
  title={line?.name ?? 'Opération'}
  detents={[0.6, 0.95]}
  {headerTrailing}
  size="lg"
  footerHidden={!enAttente}
>
  {#if line && ligne && proposition}
    <div class="space-y-5">
      <div class="flex items-center justify-between gap-3 px-1">
        <span class="text-2xl font-semibold tabular-nums text-foreground">{ligne.valeur}</span>
        {#if line.status === 'reconciled'}
          <Badge variant="success">Rapprochée</Badge>
        {/if}
      </div>

      <!--
        Le fait bancaire, entier. La référence de la banque y figure parce que c'est par
        elle qu'on retrouve l'opération dans l'export du relevé, ou qu'on la désigne.
      -->
      <div class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {#if line.memo}
          {@render rangee('Mémo', line.memo, true)}
        {/if}
        {@render rangee('Date', line.date)}
        {#if compte}
          {@render rangee('Compte', compte)}
        {/if}
        {@render rangee('Réf. banque', line.fitid, true)}
      </div>

      <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposition</p>
        <p class="mt-1 text-sm font-medium text-foreground">{proposition.texte}</p>
        {#if proposition.precision}
          <p class="text-xs text-muted-foreground">{proposition.precision}</p>
        {/if}
      </div>

      <ReconciliationRowDetail bind:state={reconState} {line} />
    </div>
  {/if}

  <!--
    Les gestes sont **nommés** ici, alors que le balayage les offre par leur seule icône.
    C'est le second chemin, celui qu'on prend quand on veut lire avant de décider.

    Côte à côte, et non empilés : une ligne peut en proposer trois — encaisser, virement,
    adhérente — soit, pleine largeur, cent cinquante pixels de pied sur un écran qui en
    manque. Les intitulés sont donc courts ; la proposition qu'ils tranchent se lit
    juste au-dessus, ils n'ont pas à la répéter.
  -->
  {#snippet footer()}
    <div class="flex flex-row items-center justify-end gap-2">
      {#if line && contexte?.adherentePossible}
        <Button
          type="button"
          variant="outline"
          disabled={verrouille}
          class="min-w-0 flex-1 gap-1.5 sm:flex-none"
          onclick={() => onAdherente(line)}
        >
          <HandCoins class="size-4 shrink-0" />
          <span class="truncate">Adhérente</span>
        </Button>
      {/if}
      {#if line && contexte?.virementPossible}
        <Button
          type="button"
          variant="outline"
          disabled={verrouille}
          class="min-w-0 flex-1 gap-1.5 sm:flex-none"
          onclick={() => onVirement(line)}
        >
          <ArrowLeftRight class="size-4 shrink-0" />
          <span class="truncate">Virement</span>
        </Button>
      {/if}
      {#if line && peutPointer}
        <!-- Pointer n'est pas créer : le geste mène à la liste des écritures qui correspondent. -->
        <Button
          type="button"
          disabled={verrouille}
          class="min-w-0 flex-1 gap-1.5 sm:flex-none"
          onclick={() => (reconState.activeRightTab = 'ledger')}
        >
          <Link2 class="size-4 shrink-0" />
          <span class="truncate">Pointer</span>
        </Button>
      {/if}
    </div>
  {/snippet}
</ResponsiveSheet>
