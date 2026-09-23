<script lang="ts">
  import {
    Button,
    dockDePage,
    softNavigate,
    ResponsiveSheet,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import { Upload, CalendarCheck, Ellipsis } from '@lucide/svelte';
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
    } catch (error) {
      // La cellule reprend sa valeur d'origine au prochain rendu : rien n'a été écrit.
      rows = [...rows];
      uiAlert(error instanceof Error ? error.message : "La correction n'a pas été enregistrée.");
    } finally {
      saving = null;
    }
  }

  /*
    Les deux détours — règlements, import — descendent dans la barre du bas. Ils
    vivaient en haut de page, donc hors de vue dès qu'on faisait défiler deux cents
    classements, c'est-à-dire chaque fois qu'on en cherche un.
  */
  /*
    Les dates de référence s'atteignent depuis le menu, et s'ouvrent dans un tiroir.

    Le bloc repliable vivait **au-dessus** des classements : sur un téléphone, il
    fallait le refermer pour atteindre la liste, et il se rouvrait tout seul dès qu'une
    date manquait — ce qui est justement le cas où l'on vient chercher un joueur. Le
    réglage et la consultation ne se disputent plus la même colonne.
  */
  let datesOuvertes = $state(false);

  $effect(() => {
    const actions: SwipeAction[] = [
      {
        id: 'dates',
        label: settingsIncomplete ? 'Dates de référence — à compléter' : 'Dates de référence',
        icon: CalendarCheck,
        run: () => (datesOuvertes = true)
      }
      /*
        Pas de lien vers les règlements ici : ils ont leur propre entrée dans le menu
        de l'application. Le dupliquer dans le menu d'un autre écran fait de la barre
        du bas un second sommaire, et lui retire ce qui la rend lisible — ne porter
        que les gestes de l'écran où l'on se trouve.
      */
    ];
    if (canImport) {
      actions.push({
        id: 'importer',
        label: 'Importer des classements',
        icon: Upload,
        run: () => softNavigate(`/admin/teams/classements/import?season=${seasonCode}`)
      });
    }
    /*
      Une ellipse, et non le `+` par défaut ni la flèche de l'import : rien ne se crée
      ici, et les deux gestes ne sont pas de même nature — l'un dépose un fichier,
      l'autre règle une date. Une icône qui n'annonce qu'un seul des deux ment sur le
      second.
    */
    return dockDePage.declarerActions(actions, { icon: Ellipsis, label: 'Gestes des classements' });
  });

</script>

<div class="space-y-4">
  <!--
    L'import a sa propre page : c'est un geste rare — quelques fois par saison — et
    volumineux, qui n'a pas à occuper le haut d'un écran consulté chaque semaine.
  -->
  <!-- Sur téléphone, ces deux détours vivent dans la barre du bas. -->
  <div class="hidden flex-wrap justify-end gap-2 md:flex">
    <!--
      La barre du bas est `md:hidden` : sans ce bouton, les dates de référence
      n'auraient plus aucune porte au-dessus de 768 px. Il ouvre le même tiroir.
    -->
    <Button variant="outline" onclick={() => (datesOuvertes = true)}>
      <CalendarCheck class="w-4 h-4" />
      Dates de référence{settingsIncomplete ? ' — à compléter' : ` (${pinnedDates}/${settings.length})`}
    </Button>
    {#if canImport}
      <Button variant="outline" href={`/admin/teams/classements/import?season=${seasonCode}`}>
        <Upload class="w-4 h-4" /> Importer des classements
      </Button>
    {/if}
  </div>

  <!--
    Plus de blocs repliables.

    Les dates de référence vivaient au-dessus des classements, dans un pli qui se
    rouvrait tout seul dès qu'une date manquait — c'est-à-dire au moment précis où l'on
    vient chercher un joueur. Elles sont dans un tiroir ; les classements n'ont donc
    plus personne avec qui se disputer la colonne, et leur propre pli n'a plus d'objet.
  -->
    <RankingsTable
      {rows}
      {saving}
      availableDates={rankings.availableDates}
      eloDate={rankings.eloDate}
      canEdit={canWrite}
      onEdit={edit}
      onDateChange={(eloDate) => reload({ eloDate })}
    />
</div>

<!--
  Le même panneau, atteint autrement : au doigt il monte du bas, à la souris il reste
  dans son bloc repliable en haut de page. Une seule déclaration, deux emplacements.
-->
<ResponsiveSheet
  bind:open={datesOuvertes}
  title="Dates de référence"
  description="Le classement qui fait foi pour chaque championnat, et qui décide si une composition est conforme."
  size="lg"
>
  <div class="py-2">
    <ReferenceDatesPanel
      items={settings}
      availableDates={rankings.availableDates}
      {seasonCode}
      {canWrite}
      onSaved={() => reload()}
    />
  </div>
</ResponsiveSheet>
