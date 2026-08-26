<script lang="ts">
  import { Sparkles } from '@lucide/svelte';
  import { Button, Amount, Combobox, type ComboboxItem, FormField, SearchableCombobox, toSeasonOptions } from '@nba/ui';
  import CreateLedgerEntrySplitRows from './CreateLedgerEntrySplitRows.svelte';

  let {
    selectedTx,
    remainingAmount = 0,
    category = $bindable('1'),
    selectedMemberId = $bindable(''),
    accrualType = $bindable('normal'),
    accrualNote = $bindable(''),
    isSubmitting = false,
    handleCreateAndMatch,
    isSplitMode = $bindable(false),
    splits = $bindable([]),
    addSplitRow,
    removeSplitRow,
    categories = [],
    sortedMembers = [],
    seasons = [],
    targetSeasonId = $bindable(''),
    browsedSeason = '',
    aiHint = null,
    aiFields = {},
    isAnalyzing = false,
    onReanalyze = undefined,
    isMemberDropdownOpen = $bindable(false),
    isCategoryDropdownOpen = $bindable(false),
    memberSearchQuery = $bindable(''),
    categorySearchQuery = $bindable('')
  }: {
    selectedTx: any;
    remainingAmount: number;
    category: string;
    selectedMemberId: string;
    accrualType: string;
    accrualNote: string;
    isSubmitting: boolean;
    /**
     * Déclenche la création et le rapprochement. **Sans argument** : le gestionnaire lit
     * lui-même la ligne bancaire et l'adhérent dans l'état partagé.
     *
     * Ce composant lui passait auparavant l'identifiant de l'adhérent, alors qu'il
     * attend une ligne bancaire. Les deux contrats avaient divergé sans que rien ne le
     * signale, et l'argument — un nombre — écrasait la ligne sélectionnée.
     */
    handleCreateAndMatch: () => void;
    isSplitMode: boolean;
    splits: { category: string; amount: number }[];
    addSplitRow: () => void;
    removeSplitRow: (idx: number) => void;
    categories: any[];
    sortedMembers: any[];
    seasons: any[];
    /** Exercice auquel l'écriture est rattachée — pas celui qu'on consulte. */
    targetSeasonId: string;
    /** Exercice consulté, pour signaler l'écart sans avoir à le deviner. */
    browsedSeason: string;
    /** Résumé de la proposition du modèle : confiance et motif, en une ligne. */
    aiHint?: { confidence?: number; reason?: string | null } | null;
    /** Quels champs portent encore la valeur proposée — ceux-là seuls se signalent. */
    aiFields?: { category?: boolean; member?: boolean; accrual?: boolean; season?: boolean; note?: boolean };
    isAnalyzing?: boolean;
    /** Relancer l'analyse sur cette seule ligne ; l'action vit sur la ligne de proposition. */
    onReanalyze?: (() => void) | undefined;
    isMemberDropdownOpen: boolean;
    isCategoryDropdownOpen: boolean;
    memberSearchQuery: string;
    categorySearchQuery: string;
  } = $props();


  let categoryItems = $derived<ComboboxItem[]>(
    categories.map(c => ({
      value: String(c.id),
      label: c.name || c.adminLabel || ''
    }))
  );

  // `seasonCode` n'est posé que sur les adhérents d'une autre saison que celle
  // consultée : le montrer évite de rattacher une cotisation au mauvais exercice, deux
  // adhésions d'un même adhérent étant sinon indiscernables dans la liste.
  let memberItems = $derived<ComboboxItem[]>(
    sortedMembers.map(m => ({
      value: String(m.id),
      label: m.seasonCode ? `${m.lastName} ${m.firstName} (${m.seasonCode})` : `${m.lastName} ${m.firstName}`,
      detail: m.licence
    }))
  );

  /* Clôturée reste signalé : on ne peut pas y écrire. « Active » ne se choisit pas. */
  let seasonItems = $derived(toSeasonOptions(seasons as any, { markClosed: true }));

  /*
    Le liseré remplace l'encart violet.

    Celui-ci répétait sous forme de pavé ce que les champs affichent déjà — catégorie, adhérent,
    rattachement — et occupait le tiers du formulaire. Ne subsiste que ce que les champs ne
    peuvent pas dire : la confiance et le motif, en une ligne. Le liseré, lui, désigne les champs
    qui portent **encore** la valeur proposée : corriger un champ l'éteint, ce qui rend visible
    d'un coup d'œil ce qui vient du modèle et ce qui vient de la comptable.
  */
  /* La bordure du champ lui-même, et non un cadre autour du bloc : c'est le contrôle qui porte
     la valeur proposée, pas son étiquette. Le sélecteur descendant atteint l'`<input>` que
     `Combobox` et `SearchableCombobox` rendent tous deux. */
  const AI_RING = '[&_input]:!border-purple-500 [&_input]:!ring-1 [&_input]:!ring-purple-500/30 [&_button]:!border-purple-500';

  let splitSum = $derived(splits.reduce((sum, s) => sum + Math.round((s.amount || 0) * 100), 0));
</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h4 class="text-sm font-semibold text-foreground">Créer et rapprocher une nouvelle écriture</h4>
    <Button
      variant="outline"
      size="xs"
      onclick={() => {
        isSplitMode = !isSplitMode;
        if (isSplitMode && splits.length === 0) {
          splits = [{ category: '1', amount: 0 }, { category: '1', amount: 0 }];
        }
      }}
    >
      {isSplitMode ? 'Annuler la ventilation' : 'Ventiler'}
    </Button>
  </div>

  <!--
    Une seule ligne pour la proposition et son bouton.

    Le bouton « Re-analyser » occupait une rangée à lui seul, au-dessus des onglets. Il appartient
    à la proposition : c'est elle qu'il refait. Et la ligne s'affiche même sans proposition —
    sinon, la seule ligne dépourvue de suggestion serait aussi la seule à ne pas pouvoir en
    demander une.
  -->
  {#if aiHint || onReanalyze}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {#if aiHint}
          <span class="inline-flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400">
            <Sparkles class="h-3 w-3" />
            Proposition IA
          </span>
          {#if aiHint.confidence}<span>· {Math.round(aiHint.confidence * 100)} %</span>{/if}
          {#if aiHint.reason}<span class="truncate italic">· « {aiHint.reason} »</span>{/if}
        {:else}
          <span class="italic">Aucune proposition pour cette opération.</span>
        {/if}
      </p>

      {#if onReanalyze}
        <Button
          size="sm"
          variant="ai-ghost"
          class="h-7 shrink-0 gap-1.5 text-xs"
          title={aiHint ? 'Refaire la proposition' : 'Demander une proposition'}
          disabled={isAnalyzing}
          onclick={onReanalyze}
        >
          <Sparkles class="h-3.5 w-3.5" />
          <span>{isAnalyzing ? 'Analyse…' : aiHint ? 'Re-analyser' : 'Analyser (IA)'}</span>
        </Button>
      {/if}
    </div>
  {/if}

  <!-- Catégorie et exercice de rattachement tiennent sur une ligne : ce sont deux imputations,
       on les décide ensemble. La ventilation, elle, prend toute la largeur. -->
  <div class="grid grid-cols-1 {isSplitMode ? '' : 'md:grid-cols-2'} gap-4">
  {#if !isSplitMode}
    <div class={aiFields.category ? AI_RING : ''}>
      <Combobox
        id="category-search-input"
        label="Catégorie Comptable"
        placeholder="Rechercher une catégorie..."
        bind:value={category}
        items={categoryItems}
        allowClear={false}
      />
    </div>
  {:else}
    <CreateLedgerEntrySplitRows
      bind:splits
      {remainingAmount}
      {splitSum}
      {categories}
      {addSplitRow}
      {removeSplitRow}
    />
  {/if}

  <!--
    L'exercice de rattachement se choisit ici, et non dans l'en-tête.

    Celui de l'en-tête filtre l'écran et provoque une navigation : s'en servir pour
    changer l'exercice de l'écriture remontait le formulaire à zéro et réappliquait la
    suggestion du modèle, effaçant la correction qu'on venait de saisir. Une cotisation
    encaissée en août pour la rentrée doit pouvoir partir sur l'exercice suivant sans
    quitter la ligne qu'on rapproche — c'est ce que le compte de résultat attend, lui
    qui lit `season_id` là où la trésorerie lit la date.
  -->
  <!--
    Le même composant que la catégorie, et non un second sélecteur d'aspect voisin.

    Trois sélecteurs dans un même formulaire, dont deux d'un composant et un d'un autre : les
    hauteurs différaient de six pixels, ce qui se voit dès qu'ils se touchent.
  -->
  <div class="{aiFields.season ? AI_RING : ''}">
    <Combobox
      id="target-season-input"
      label="Exercice de rattachement"
      placeholder="Rechercher un exercice..."
      bind:value={targetSeasonId}
      items={seasonItems}
      allowClear={false}
    />
    {#if browsedSeason && targetSeasonId && targetSeasonId !== browsedSeason}
      <p class="mt-1 text-xs text-muted-foreground">
        L'écriture comptera dans l'exercice {targetSeasonId}, alors que vous consultez {browsedSeason}.
      </p>
    {/if}
  </div>
  </div>

  <!--
    Le mode de règlement ne se demande plus ici.

    Il explique le **décalage** entre l'écriture et la banque — un chèque reçu attend d'être
    remis, d'où `in_vault` et le domaine des remises. Au rapprochement, l'argent est par
    définition déjà en banque : la ligne de relevé le prouve, et son libellé dit déjà par quel
    canal. Le champ posait donc une question dont la réponse était fixée — 546 écritures
    rapprochées sur 546 portaient « virement », la valeur par défaut que personne n'avait
    choisie, y compris sur 27 prélèvements et 7 remises de chèques.

    Distinguer un prélèvement supposerait d'ajouter ce mode à la nomenclature, qui ne le connaît
    pas. C'est une autre décision, avec une migration.
  -->
  <!-- Adhérent et régularisation se décident ensemble : ils qualifient la même écriture. La note
       n'existe que pour expliquer la régularisation, et prend donc la ligne entière en dessous. -->
  <div class="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
    <div class={aiFields.member ? AI_RING : ''}>
      <Combobox
        id="member-search-input"
        label="Adhérent Associé (Optionnel)"
        placeholder="Tapez pour rechercher un adhérent..."
        bind:value={selectedMemberId}
        items={memberItems}
        allowClear={true}
        clearLabel="Aucun adhérent (Écriture générale)"
      />
    </div>

    <div class={aiFields.accrual ? AI_RING : ''}>
      <Combobox
        id="accrual-type-input"
        label="Régularisation (Cut-off)"
        placeholder="Rechercher un motif..."
        bind:value={accrualType}
        items={[{ label: 'Normal', value: 'normal' }, ...(selectedTx && selectedTx.amount > 0 ? [{ label: "Produit constaté d'avance (Ex: Cotisation en avance)", value: 'produit_constate_avance' }, { label: 'Produit à recevoir (Ex: Subvention)', value: 'produit_a_recevoir' }] : [{ label: "Charge constatée d'avance (Ex: Assurance en avance)", value: 'charge_constatee_avance' }, { label: 'Charge à payer (Ex: Facture non parvenue)', value: 'charge_a_payer' }])]}
        allowClear={false}
      />
    </div>
  </div>

  {#if accrualType !== 'normal'}
    <!-- `FormField` n'accepte pas de `class` : un attribut inconnu serait ignoré sans un mot. -->
    <div class="mt-4 {aiFields.note ? AI_RING : ''}">
      <FormField label="Note justificative *">
        <input
          type="text"
          class="w-full px-3 py-2 border border-destructive/50 bg-background rounded-md text-sm focus:ring-1 focus:ring-destructive"
          placeholder="Détail de la régularisation..."
          bind:value={accrualNote}
          required
        />
      </FormField>
    </div>
  {/if}

  <div class="pt-2">
    <Button 
      onclick={() => handleCreateAndMatch()}
      disabled={isSubmitting || (isSplitMode && splitSum !== remainingAmount)}
      class="w-full font-bold"
    >
      {#if isSplitMode}
        Enregistrer la ventilation
      {:else}
        <span class="flex items-center justify-center gap-1.5">
          <span>Créer et rapprocher</span>
          <Amount cents={remainingAmount} />
        </span>
      {/if}
    </Button>
  </div>
</div>
