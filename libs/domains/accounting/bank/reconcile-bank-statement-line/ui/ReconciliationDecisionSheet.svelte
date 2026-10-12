<script lang="ts">
  import { Check } from '@lucide/svelte';
  import { Badge, Button, ResponsiveSheet } from '@nba/ui';
  import ReconciliationRowDetail from './ReconciliationRowDetail.svelte';
  import { ligneDeReleve, propositionDe, type EtatDeLigne } from './reconciliation-row-model';
  import { libelleDEnregistrement, naturesDeLigne, parLeFormulaire } from './reconciliation-natures';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /**
   * La décision, au doigt.
   *
   * Le dépliage en place convient à un écran large : la ligne s'ouvre sous elle-même et
   * l’on garde la file en contexte. Sur un téléphone, ce formulaire — le choix de la nature, une
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
    etat
  }: {
    state: ReconciliationState;
    /** Ce que l'écran sait de la ligne ouverte : écritures existantes, proposition. */
    etat: (line: BankStatementLine) => EtatDeLigne;
  } = $props();

  const line = $derived(reconState.selectedTx);
  const contexte = $derived(line ? etat(line) : null);
  const ligne = $derived(line && contexte ? ligneDeReleve(line, contexte) : null);
  const proposition = $derived(line && contexte ? propositionDe(line, contexte) : null);

  const enAttente = $derived(line?.status === 'pending');
  /* La nature affichée, et non la nature retenue : celle-ci peut ne plus être offerte (la
     dernière facture vient d'être payée), et le panneau retombe alors sur la saisie. */
  const nature = $derived.by(() => {
    if (!line || !enAttente) return reconState.nature;
    const offertes = naturesDeLigne(line, reconState.contexteDeNature(line));
    return offertes.some((o) => o.nature === reconState.nature) ? reconState.nature : 'saisie';
  });
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
      parLeFormulaire(nature) &&
      // Une facture se reprend d'abord : avant, le formulaire n'a rien à enregistrer.
      !(nature === 'facture' && reconState.splits.length === 0) &&
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
  /*
    La feuille est celle du téléphone. Au bureau, la ligne se déplie en place ; la feuille
    s'ouvrait pourtant par-dessus, puisque l'état partagé est le même et qu'elle est portée
    hors du bloc qui la masque au-delà de 768 px : deux formulaires montés à la fois, aux
    identifiants de champ en double. Sans `matchMedia` (jsdom), elle s'ouvre comme avant.
  */
  const auTelephone = () =>
    typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(max-width: 767px)').matches;

  let ouvert = $state(!!reconState.selectedTx && auTelephone());
  $effect(() => {
    ouvert = !!reconState.selectedTx && auTelephone();
  });

  const compte = $derived(
    line ? (reconState.accountOptions.find((a) => a.id === String(line.accountId))?.label ?? null) : null
  );
</script>

{#snippet headerTrailing()}
  <!--
    Le virement et l'avance portent leur propre bouton, sous leurs deux champs ; le pointage se
    fait écriture par écriture. Seules les natures qui passent par le formulaire de saisie — long,
    et que le clavier logiciel recouvre — gardent leur validation dans la barre de navigation.
  -->
  {#if enAttente && line && parLeFormulaire(nature)}
    <Button
      type="button"
      disabled={!validationPossible}
      onclick={() => reconState.handleCreateAndMatch()}
      class="size-11 rounded-full p-0"
      aria-label={libelleDEnregistrement(nature, line, reconState.isSplitMode)}
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
  footerHidden
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

</ResponsiveSheet>
