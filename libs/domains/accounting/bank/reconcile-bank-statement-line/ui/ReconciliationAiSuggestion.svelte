<script lang="ts">
  import { Sparkles, Check } from '@lucide/svelte';
  import { Button, Badge, Alert } from '@nba/ui';
  import type { ReconciliationState, BankStatementLine } from './reconciliation.svelte';

  let { state = $bindable(), selectedTx }: { state: ReconciliationState; selectedTx: BankStatementLine } = $props();

  function renderAiSuggestions(bt: BankStatementLine) {
    if (!bt.aiSuggestions) return null;
    try {
      return JSON.parse(bt.aiSuggestions);
    } catch (e) {
      return null;
    }
  }

  const sug = $derived(renderAiSuggestions(selectedTx));

  /**
   * Le formulaire porte-t-il encore la suggestion telle quelle ?
   *
   * Il en est prérempli à la sélection de la ligne ; l'écart signale donc une correction
   * de la comptable — un autre adhérent, une autre catégorie, un rattachement d'exercice.
   */
  const untouched = $derived(
    sug !== null &&
      state.selectedMemberId === (sug.memberId ? String(sug.memberId) : '') &&
      (!sug.category || state.category === String(sug.category)) &&
      state.accrualType === (sug.accrualType || 'normal') &&
      state.targetSeasonId === (sug.targetSeason || state.selectedSeason)
  );

  const accrualLabel: Record<string, string> = {
    produit_constate_avance: "Produit constaté d'avance",
    charge_constatee_avance: "Charge constatée d'avance",
    produit_a_recevoir: 'Produit à recevoir',
    charge_a_payer: 'Charge à payer'
  };
</script>

{#if sug?.kind === 'internal-transfer'}
  <!--
    Un mouvement de compte à compte ne se rapproche pas depuis cet écran.

    Il s'écrit en **deux** jambes — une par compte, chacune avec sa date de valeur — et cet écran
    n'en produit qu'une. C'est d'ailleurs ainsi que la seconde représentation du virement était
    fabriquée : une recette ou une dépense portant la catégorie « Virements Internes », qui
    n'apparaissait nulle part comme un virement. Mieux vaut renvoyer au grand livre.
  -->
  <Alert.Root variant="ai" class="p-4 space-y-2">
    <Alert.Title class="flex items-center gap-2 m-0 p-0 font-semibold text-sm">
      <Sparkles class="h-4 w-4" />
      <span>Cette opération ressemble à un virement interne</span>
    </Alert.Title>
    <Alert.Description class="text-xs space-y-2 m-0 p-0">
      <p>
        Un virement entre deux comptes du club s'enregistre depuis le <strong>Grand livre</strong>
        (« Virement Interne ») : il y écrit deux écritures, une par compte. Revenez ensuite ici pour
        associer <strong>chacune</strong> des deux lignes de relevé à sa jambe.
      </p>
      <p class="text-muted-foreground">
        Le saisir comme une recette ou une dépense fausserait le compte de résultat.
      </p>
      <p>
        S'il s'agit du virement d'une <strong>adhérente</strong> qui alimente son porte-monnaie Badnet par
        le club, le bouton « Adhérente » de la ligne crée le virement depuis le compte d'attente et
        pointe la ligne en un geste.
      </p>
    </Alert.Description>
  </Alert.Root>
{:else if sug}
  <Alert.Root variant="ai" class="p-4 space-y-3">
    <div class="flex items-center justify-between">
      <Alert.Title class="flex items-center gap-2 m-0 p-0 font-semibold text-sm">
        <Sparkles class="h-4 w-4" />
        <span>Suggestion d'analyse automatique IA</span>
      </Alert.Title>
      {#if sug.confidence}
        <Badge variant="ai" size="xs">
          Confiance : {Math.round(sug.confidence * 100)}%
        </Badge>
      {/if}
    </div>

<Alert.Description class="space-y-3 m-0 p-0">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
      <div>
        <span class="text-muted-foreground opacity-80 block">Catégorie suggérée :</span>
        <span class="font-medium text-foreground">
          {state.categories.find(c => c.id === String(sug.category))?.name || `Catégorie #${sug.category}`}
        </span>
      </div>

      <div>
        <span class="text-muted-foreground opacity-80 block">Adhérent identifié :</span>
        <span class="font-medium text-foreground">
          {sug.memberName || (sug.memberId ? `Adhérent #${sug.memberId}` : 'Aucun (Général)')}
        </span>
      </div>
    </div>

    <!--
      L'exercice se montre à côté du motif, et non dans la seule note.

      C'est lui que le compte de résultat lit. Le laisser hors de l'encart revenait à
      faire valider en aveugle un rattachement qui n'était affiché nulle part : la note
      annonçait « à rattacher à 26-27 » pendant que l'écriture partait sur 25-26.
    -->
    {#if sug.accrualType && sug.accrualType !== 'normal'}
      <div class="text-xs">
        <span class="text-muted-foreground opacity-80 block">Rattachement d'exercice :</span>
        <span class="font-medium text-foreground">
          {accrualLabel[sug.accrualType] ?? sug.accrualType}
          {#if sug.targetSeason}<span> — exercice {sug.targetSeason}</span>{/if}
        </span>
        {#if sug.accrualNote}
          <span class="block text-muted-foreground">{sug.accrualNote}</span>
        {/if}
      </div>
    {/if}

    {#if sug.reason}
      <p class="text-xs italic border-t border-purple-500/20 pt-2 mt-2">
        « {sug.reason} »
      </p>
    {/if}

    <!--
      Ce bouton valide le formulaire, pas la suggestion figée.

      Il rejouait auparavant les seules valeurs proposées par le modèle : corriger
      l'adhérent puis cliquer ici réécrivait celui de l'IA, et le rattachement d'exercice
      comme son commentaire partaient à la poubelle sans un mot. Une suggestion se
      corrige — c'est même sa raison d'être — et le raccourci ne doit pas punir la
      correction. Le libellé dit donc ce qui va réellement être enregistré.
    -->
    <div class="pt-1 flex justify-end">
      <Button
        size="sm"
        variant="ai"
        class="text-xs gap-1.5"
        disabled={state.isClosed || state.isSubmitting}
        onclick={() => state.handleCreateAndMatch()}
      >
        <Check class="h-3.5 w-3.5" />
        <span>{untouched ? 'Valider cette suggestion' : 'Valider avec vos corrections'}</span>
      </Button>
    </div>
  </Alert.Description>
  </Alert.Root>
{/if}
