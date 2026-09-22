<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import MemberTransferDialog from './MemberTransferDialog.svelte';
  import InternalTransferDialog from './InternalTransferDialog.svelte';
  import ReconciliationDecisionSheet from './ReconciliationDecisionSheet.svelte';
  import { gestesDeLigne, ligneDeReleve, type EtatDeLigne } from './reconciliation-row-model';
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
    const cents = (line as { amountCents?: number }).amountCents ?? line.amount ?? 0;
    return {
      ecrituresExistantes: line.status === 'pending' ? reconState.getSuggestions(line) : [],
      virementPossible:
        line.status === 'pending' && cents !== 0 && reconState.transferCounterpartsFor(line).length > 0,
      adherentePossible:
        line.status === 'pending' &&
        cents > 0 &&
        !!reconState.thirdPartyAccount &&
        reconState.isBankLine(line),
      categories: reconState.categories,
      isClosed: reconState.isClosed
    };
  }

  /*
    Les deux dialogues vivent ici, une fois, et non par rangée : la file en compte
    plusieurs dizaines, et chacune en montait deux.
  */
  let ligneVirement = $state<BankStatementLine | null>(null);
  let virementOuvert = $state(false);
  let ligneAdherente = $state<BankStatementLine | null>(null);
  let adherenteOuvert = $state(false);

  /* Les dialogues referment eux-mêmes leur liaison ; la ligne s'efface à leur suite. */
  $effect(() => {
    if (!virementOuvert) ligneVirement = null;
  });
  $effect(() => {
    if (!adherenteOuvert) ligneAdherente = null;
  });

  const ouvrirVirement = (line: BankStatementLine) => {
    reconState.selectedTx = null;
    ligneVirement = line;
    virementOuvert = true;
  };
  const ouvrirAdherente = (line: BankStatementLine) => {
    reconState.selectedTx = null;
    ligneAdherente = line;
    adherenteOuvert = true;
  };

  const gestes = {
    onValider: (line: BankStatementLine) => reconState.validateSuggestion(line),
    onPointer: (line: BankStatementLine) => {
      reconState.activeRightTab = 'ledger';
      reconState.selectedTx = line;
    },
    onVirement: ouvrirVirement,
    onAdherente: ouvrirAdherente,
    onOuvrir: (line: BankStatementLine) => {
      reconState.activeRightTab = etatDe(line).ecrituresExistantes.length > 0 ? 'ledger' : 'manual';
      reconState.selectedTx = line;
    }
  };

  /* Le compte ne se dit que si la file en mélange plusieurs : filtrée, l'information est redondante. */
  const montrerLeCompte = $derived(!reconState.isSingleAccount && !reconState.accountFilter);
  const compteDe = (line: BankStatementLine) =>
    reconState.accountOptions.find((a) => a.id === String(line.accountId))?.label ?? null;
</script>

<ListView
  items={rows}
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

<ReconciliationDecisionSheet
  bind:state={reconState}
  etat={etatDe}
  onVirement={ouvrirVirement}
  onAdherente={ouvrirAdherente}
/>

{#if ligneAdherente}
  <MemberTransferDialog
    bind:open={adherenteOuvert}
    line={ligneAdherente}
    isSubmitting={reconState.isSubmitting}
    onConfirm={(description) => reconState.handleMemberTransfer(ligneAdherente!, description)}
  />
{/if}

{#if ligneVirement}
  <InternalTransferDialog
    bind:open={virementOuvert}
    state={reconState}
    line={ligneVirement}
    onConfirm={(accountId, description) => reconState.handleInternalTransfer(ligneVirement!, accountId, description)}
  />
{/if}
