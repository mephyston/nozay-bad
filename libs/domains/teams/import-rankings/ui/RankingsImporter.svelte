<script lang="ts">
  import { Upload, FileText, RefreshCw, CalendarClock, TriangleAlert } from '@lucide/svelte';
  import {
    Button,
    Card,
    Input,
    Alert,
    Badge,
    FormField,
    ImportResultDialog,
    dockDePage,
    type SwipeAction
  } from '@nba/ui';
  import { pastillesDeFichier, resumeDImport } from './import-summary';
  import { parseRankingCsv, type RankingCsvResult } from '../../shared/ranking-csv';
  import RankingsImportReport from './RankingsImportReport.svelte';
  import type { ImportRankingsOutput } from '../dto';

  let {
    seasonCode,
    onImported,
    endpoint = '/admin/api/teams/import'
  }: {
    seasonCode: string;
    /**
     * Facultatif, pour la même raison : les props d'une île passent par JSON, une
     * fonction ne franchit pas la frontière. Le rapport s'affiche dans la carte, la page
     * n'a rien à rafraîchir.
     */
    onImported?: (result: ImportRankingsOutput) => void;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let dragOver = $state(false);
  let file = $state<File | null>(null);
  let content = $state('');
  let parsed = $state<RankingCsvResult | null>(null);
  /** Date confirmée par le coach : elle décide quel classement fera foi. */
  let eloDate = $state('');
  let localError = $state<string | null>(null);
  let submitting = $state(false);
  let report = $state<ImportRankingsOutput | null>(null);
  /*
    Le verdict, en dialogue : « Continuer » mène aux classements de la saison. Le rapport
    détaillé (compétiteurs sans adhérent, lignes illisibles) reste dans la carte.
  */
  let verdict = $state<{ success: boolean; message: string } | null>(null);

  const competitors = $derived(parsed ? parsed.rows.filter((r) => !r.nonCompetitor).length : 0);
  const nonCompetitors = $derived(parsed ? parsed.rows.length - competitors : 0);

  const pastilles = $derived(
    parsed
      ? pastillesDeFichier({
          competiteurs: competitors,
          nonCompetiteurs: nonCompetitors,
          saisons: parsed.seasonCodes,
          erreurs: parsed.errors.length
        })
      : []
  );

  /*
    Importer descend dans la barre du bas. Le bouton vivait en pied de carte, donc sous
    le pli dès qu'un rapport s'affichait — c'est-à-dire au moment précis où l'on veut
    rejouer un import corrigé.
  */
  $effect(() => {
    const actions: SwipeAction[] = [];
    if (content && eloDate && !submitting) {
      actions.push({ id: 'importer', label: 'Importer les classements', icon: Upload, run: () => void submit() });
    }
    if (file && !submitting) {
      actions.push({ id: 'annuler', label: 'Choisir un autre fichier', icon: RefreshCw, run: () => reset() });
    }
    if (actions.length === 0) return;
    return dockDePage.declarerActions(actions, { icon: Upload, label: "Gestes de l'import" });
  });

  function reset() {
    file = null;
    content = '';
    parsed = null;
    eloDate = '';
    localError = null;
    if (fileInput) fileInput.value = '';
  }

  function read(selected: File) {
    reset();
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      localError = 'Le fichier doit être au format CSV (.csv uniquement).';
      return;
    }
    file = selected;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) ?? '';
      try {
        const result = parseRankingCsv(text);
        content = text;
        parsed = result;
        eloDate = result.eloDate ?? '';
      } catch (error) {
        file = null;
        localError = error instanceof Error ? error.message : 'Fichier illisible.';
      }
    };
    reader.onerror = () => { localError = 'Erreur de lecture du fichier.'; };
    reader.readAsText(selected);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    const dropped = event.dataTransfer?.files?.[0];
    if (dropped) read(dropped);
  }

  async function submit() {
    if (!content || !eloDate) return;
    submitting = true;
    localError = null;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-rankings',
          content,
          seasonCode,
          eloDate,
          fileName: file?.name
        })
      });
      const payload = (await response.json()) as { data?: ImportRankingsOutput; error?: string };
      if (!response.ok) throw new Error(payload.error || "L'import a échoué.");

      report = payload.data ?? null;
      if (report) {
        onImported?.(report);
        verdict = { success: true, message: resumeDImport(report) };
      }
      reset();
    } catch (error) {
      localError = error instanceof Error ? error.message : "L'import a échoué.";
      verdict = { success: false, message: localError };
    } finally {
      submitting = false;
    }
  }
</script>

{#if verdict}
  {#key verdict}
    <ImportResultDialog
      open={true}
      success={verdict.success}
      title={verdict.success ? 'Classements importés' : "L'import des classements a échoué"}
      message={verdict.message}
      continueHref={`/admin/teams/classements?season=${encodeURIComponent(seasonCode)}`}
      continueLabel="Voir les classements"
    />
  {/key}
{/if}

<Card.Root>
  <!--
    Pas de titre ici : le bandeau de la page le porte déjà, mot pour mot. Reste la
    précision qu'il ne dit pas — ce que l'import ne fait **pas**.
  -->
  <Card.Header>
    <Card.Description>
      Cet import complète le référentiel des adhérents et n'y ajoute personne : les
      compétiteurs qui n'y figurent pas vous seront signalés.
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if localError}
      <Alert.Root variant="destructive">
        <TriangleAlert class="w-4 h-4" />
        <Alert.Title>Import impossible</Alert.Title>
        <Alert.Description>{localError}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if report}
      <RankingsImportReport {report} onDismiss={() => (report = null)} />
    {/if}

    <!-- Un label du champ plutôt qu'un `input.click()` programmatique, que certains navigateurs
         refusent sur un champ en `display: none` : voir `ImportStatementDialog`, même motif. -->
    <label
      for="rankings-file"
      class="border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center min-h-[160px] cursor-pointer transition-colors
        focus-within:ring-2 focus-within:ring-ring
        {dragOver ? 'border-primary bg-primary/5' : 'border-muted hover:bg-muted/10'}"
      ondragenter={(e) => { e.preventDefault(); dragOver = true; }}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => (dragOver = false)}
      ondrop={onDrop}
    >
      <input
        bind:this={fileInput}
        id="rankings-file"
        type="file"
        accept=".csv"
        class="sr-only"
        onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) read(f); }}
      />
      <Upload class="w-9 h-9 text-muted-foreground mb-3" />
      {#if file}
        <div class="flex items-center gap-2">
          <FileText class="w-5 h-5 text-primary" />
          <p class="font-semibold text-sm">{file.name}</p>
        </div>
      {:else}
        <p class="font-semibold text-sm">Sélectionnez un fichier CSV ou glissez-le ici</p>
        <p class="text-xs text-muted-foreground mt-1">Export ELO Poona (.csv)</p>
      {/if}
    </label>

    {#if parsed}
      <!--
        La date de classement est mise en avant et reste modifiable : c'est elle qui
        décide, pour toute la saison en départemental, quel classement fait foi — donc
        quelles compositions seront conformes. La déduire en silence serait le seul
        réglage de cet écran qu'on ne pourrait pas vérifier.
      -->
      <div class="rounded-lg border p-4 space-y-3">
        <div class="flex items-start gap-3">
          <CalendarClock class="w-5 h-5 text-muted-foreground mt-1.5 shrink-0" />
          <div class="flex-1">
            <FormField
              id="elo-date"
              label="Date des classements"
              keepLabel
              hint={parsed.eloDate
                ? 'Lue dans le fichier. Corrigez-la si besoin.'
                : 'Aucune date trouvée dans le fichier : saisissez celle communiquée par la CCA.'}
            >
              <Input id="elo-date" type="date" bind:value={eloDate} />
            </FormField>
          </div>
        </div>

        <!-- Les décomptes viennent d'une déclaration unique, accordée : « 1 compétiteur »
             et non « 1 compétiteur(s) », et rien de ce qui vaut zéro. -->
        <div class="flex flex-wrap gap-2 text-xs">
          {#each pastilles as pastille (pastille.label)}
            <Badge variant={pastille.variant}>{pastille.label}</Badge>
          {/each}
        </div>
      </div>
    {/if}
  </Card.Content>

  <!-- Sur téléphone, ces deux gestes vivent dans la barre du bas. -->
  <Card.Footer class="hidden justify-end gap-3 md:flex">
    {#if file}
      <Button variant="outline" onclick={reset} disabled={submitting}>Annuler</Button>
    {/if}
    <Button onclick={submit} disabled={!content || !eloDate || submitting}>
      {#if submitting}
        <RefreshCw class="w-4 h-4 animate-spin" /> Import en cours…
      {:else}
        Importer
      {/if}
    </Button>
  </Card.Footer>
</Card.Root>
