<script lang="ts">
  import { Badge, Button, ListView, ListRow } from '@nba/ui';
  import ReconciliationDecisionSheet from './ReconciliationDecisionSheet.svelte';
  import { gestesDeLigne, ligneDeReleve, type EtatDeLigne } from './reconciliation-row-model';
  import { etiquetteDeProposition, type NatureDeLigne } from './reconciliation-natures';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  /**
   * La file de rapprochement, au doigt.
   *
   * La rangée de bureau porte jusqu'à quatre boutons d'action ; sous 640 px leurs
   * libellés disparaissent et il ne reste que des icônes — quatre affordances muettes
   * sur une ligne, alors que la règle en veut une seule et qu'elle doit se nommer.
   *
   * Une rangée dit donc le fait bancaire et la proposition, rien d'autre. Le geste
   * courant — pointer, ou valider — se fait au balayage, et un appui ouvre la fiche de
   * décision, où chaque geste porte son nom.
   */
  let {
    state: reconState = $bindable(),
    rows = []
  }: {
    state: ReconciliationState;
    rows?: BankStatementLine[];
  } = $props();

  /** Ce que l'écran sait d'une ligne, rassemblé une fois pour le modèle. */
  function etatDe(line: BankStatementLine): EtatDeLigne {
    const contexte = reconState.contexteDeNature(line);
    return {
      ecrituresExistantes: line.status === 'pending' ? reconState.getSuggestions(line) : [],
      virementPossible: contexte.virementPossible,
      etiquette: etiquetteDeProposition(line, contexte),
      categories: reconState.categories,
      isClosed: reconState.isClosed
    };
  }

  /*
    Les dialogues « Virement » et « Adhérente » ne vivent plus ici : ce sont des natures de la
    ligne, choisies dans la feuille. Un geste qui les vise ouvre la feuille dessus.
  */
  const ouvrirSur = (nature?: NatureDeLigne) => (line: BankStatementLine) => {
    reconState.selectedTx = line;
    if (nature) reconState.choisirNature(nature);
  };

  const gestes = {
    onValider: (line: BankStatementLine) => reconState.validateSuggestion(line),
    onPointer: ouvrirSur('pointer'),
    onVirement: ouvrirSur('virement'),
    onOuvrir: ouvrirSur()
  };

  /**
   * On n'en rend que vingt à la fois, et l'on accumule — la même forme que le journal et
   * la liste des adhérents.
   *
   * Ici rien ne vient du serveur par tranches : le relevé arrive entier, et c'est le
   * **rendu** qui coûte. Deux cents rangées, chacune avec sa piste de balayage et son
   * menu escamoté, font une page qu'un téléphone met une seconde à poser. Le clavier de
   * la version de bureau, lui, parcourt toujours la file entière : c'est par lui qu'on
   * la vide, et le tronquer y serait une régression.
   */
  const PAR_TRANCHE = 20;
  let visibles = $state(PAR_TRANCHE);

  /* Un changement de vue ou de critère repart du début : la tranche d'une autre file n'a pas de sens. */
  $effect(() => {
    void rows;
    visibles = PAR_TRANCHE;
  });

  const rangees = $derived(rows.slice(0, visibles));
  const reste = $derived(Math.max(rows.length - rangees.length, 0));

  /* Le compte ne se dit que si la file en mélange plusieurs : filtrée, l'information est redondante. */
  const montrerLeCompte = $derived(!reconState.isSingleAccount && !reconState.accountFilter);
  const compteDe = (line: BankStatementLine) =>
    reconState.accountOptions.find((a) => a.id === String(line.accountId))?.label ?? null;
</script>

<ListView
  items={rangees}
  inset="plain"
  emptyTitle="La file est vide"
  emptyDescription="Toutes les opérations du relevé ont été traitées."
>
  {#snippet listRow(line)}
    {@const etat = etatDe(line)}
    {@const l = ligneDeReleve(line, etat)}
    {@const compte = montrerLeCompte ? compteDe(line) : null}
    <ListRow
      item={line}
      onclick={() => gestes.onOuvrir(line)}
      title={l.titre}
      subtitle={l.precision ? `${l.sousTitre} · ${l.precision}` : l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption={l.legende}
      actions={gestesDeLigne(line, etat, gestes)}
    >
      <!--
        Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
        propriété au composant. C'est son contenu qui est conditionnel.
      -->
      {#snippet badge()}
        {#if line.status === 'reconciled'}
          <Badge variant="success" size="xs">Rapprochée</Badge>
        {:else if compte}
          <Badge variant="secondary" size="xs">{compte}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>

{#if reste > 0}
  <div class="space-y-2 px-4 py-3">
    <p class="text-center text-xs text-muted-foreground">{rangees.length} sur {rows.length}</p>
    <Button variant="outline" class="w-full" onclick={() => (visibles += PAR_TRANCHE)}>
      Afficher les {Math.min(reste, PAR_TRANCHE)} suivants
    </Button>
  </div>
{/if}

<ReconciliationDecisionSheet bind:state={reconState} etat={etatDe} />
