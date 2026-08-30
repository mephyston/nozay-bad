<script lang="ts">
  import {
    CollapsibleSection,
    Button,
    softNavigate,
    readCollapseState,
    writeCollapseState,
    toast
  } from '@nba/ui';
  import { Upload, FileText } from '@lucide/svelte';
  import RankingsTable from './RankingsTable.svelte';
  import ReferenceDatesPanel from '../../list-championship-settings/ui/ReferenceDatesPanel.svelte';
  import type { ListRankingsOutput } from '../dto';
  import type { ChampionshipSettingsItem } from '../../list-championship-settings/dto';

  let {
    rankings,
    settings,
    seasonCode,
    canImport = false,
    canWrite = false,
    endpoint = '/admin/api/teams/classements'
  }: {
    rankings: ListRankingsOutput;
    settings: ChampionshipSettingsItem[];
    seasonCode: string;
    canImport?: boolean;
    canWrite?: boolean;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  /**
   * Rechargement plutôt qu'une mise à jour locale : changer de date de référence touche
   * les classements affichés comme les valeurs d'équipe. Recomposer tout cela dans le
   * navigateur reproduirait la logique du serveur, et finirait par en diverger.
   */
  function reload(params: Record<string, string> = {}) {
    const query = new URLSearchParams({ season: seasonCode, ...params });
    softNavigate(`/admin/teams/classements?${query}`);
  }

  /**
   * Les réglages s'ouvrent d'eux-mêmes quand il y manque une date.
   *
   * Sans date de référence, aucune valeur d'équipe n'est calculable : replier ce bloc par
   * principe cacherait précisément ce qu'il faut corriger.
   */
  const settingsIncomplete = $derived(
    settings.some((s) => s.rankingPolicy === 'season_fixed' && !s.referenceEloDate)
  );
  const pinnedDates = $derived(settings.filter((s) => s.referenceEloDate).length);

  /*
   * Le pli survit au rechargement.
   *
   * Enregistrer un réglage recharge la page — c'est ce qui garde l'écran d'accord avec le
   * serveur — mais l'île est alors remontée. Sans mémoire, la section se refermait sous
   * les doigts à chaque enregistrement.
   */
  const publishedRules = $derived(settings.filter((s) => s.rulesUrl).length);

  /*
   * Les lignes sont recopiées dans un état local pour que la correction se voie tout de
   * suite. Recharger la page à chaque cellule ferait perdre la recherche en cours et le
   * défilement, pour un tableau de deux cents lignes.
   */
  let rows = $state(rankings.rows);
  let saving = $state<string | null>(null);

  // Un changement de date recharge la page, donc remonte l'île : la copie repart de la
  // liste reçue, jamais d'un état devenu obsolète.
  $effect(() => {
    rows = rankings.rows;
  });

  /**
   * Corrige un classement.
   *
   * L'écriture part avant tout affichage optimiste : une correction qu'on montrerait
   * appliquée sans qu'elle le soit ferait calculer des valeurs d'équipe sur une donnée
   * que la base ne porte pas.
   */
  async function edit(licence: string, field: 'singles' | 'doubles' | 'mixed', value: string | null) {
    saving = licence;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-ranking',
          licence,
          eloDate: rankings.eloDate,
          [field]: value
        })
      });
      const payload = (await response.json()) as { data?: Record<string, unknown>; error?: string };
      if (!response.ok) throw new Error(payload.error || "La correction n'a pas été enregistrée.");

      rows = rows.map((row) =>
        row.licence === licence ? { ...row, [field]: value, source: 'manuel' as const } : row
      );
      toast.success('Classement corrigé.');
    } catch (error) {
      // La cellule reprend sa valeur d'origine au prochain rendu : rien n'a été écrit.
      rows = [...rows];
      toast.error(error instanceof Error ? error.message : "La correction n'a pas été enregistrée.");
    } finally {
      saving = null;
    }
  }

  let settingsOpen = $state(readCollapseState('rankings.settings', false));
  let tableOpen = $state(readCollapseState('rankings.table', true));

  // Une date manquante rouvre le bloc, quel qu'ait été le choix précédent : sans elle,
  // aucune valeur d'équipe n'est calculable, et la cacher serait cacher le problème.
  $effect(() => {
    if (settingsIncomplete) settingsOpen = true;
  });

  $effect(() => writeCollapseState('rankings.settings', settingsOpen));
  $effect(() => writeCollapseState('rankings.table', tableOpen));
</script>

<div class="space-y-4">
  <!--
    L'import a sa propre page : c'est un geste rare — quelques fois par saison — et
    volumineux, qui n'a pas à occuper le haut d'un écran consulté chaque semaine.
  -->
  <div class="flex flex-wrap justify-end gap-2">
    <Button variant="outline" href={`/admin/teams/reglements?season=${seasonCode}`}>
      <FileText class="w-4 h-4" /> Règlements ({publishedRules}/{settings.length})
    </Button>
    {#if canImport}
      <Button variant="outline" href={`/admin/teams/classements/import?season=${seasonCode}`}>
        <Upload class="w-4 h-4" /> Importer des classements
      </Button>
    {/if}
  </div>

  <CollapsibleSection
    title="Dates de référence"
    description="Le classement qui fait foi pour chaque championnat, et qui décide si une composition est conforme."
    badge={settingsIncomplete ? 'à compléter' : `${pinnedDates}/${settings.length}`}
    bind:open={settingsOpen}
  >
    <ReferenceDatesPanel
      items={settings}
      availableDates={rankings.availableDates}
      {seasonCode}
      {canWrite}
      onSaved={() => reload()}
    />
  </CollapsibleSection>


  <CollapsibleSection
    title="Classements"
    description={rankings.eloDate
      ? `Arrêtés au ${rankings.eloDate}.`
      : 'Aucun classement importé pour le moment.'}
    badge={rankings.unmatchedCount > 0
      ? `${rankings.unmatchedCount} sans adhérent`
      : rankings.rows.length}
    bind:open={tableOpen}
  >
    <RankingsTable
      {rows}
      {saving}
      availableDates={rankings.availableDates}
      eloDate={rankings.eloDate}
      canEdit={canWrite}
      onEdit={edit}
      onDateChange={(eloDate) => reload({ eloDate })}
    />
  </CollapsibleSection>
</div>
