<script lang="ts">
  import { PageHeader, ErrorAlert, SeasonSelector } from '@nba/ui';
  import { GeneralMeetingReport } from '@nba/accounting-ui';
  import EcranDistant from './EcranDistant.svelte';

  /**
   * Un rapport financier, en coquille.
   *
   * Le type de rapport vient de l'URL et ne décide que de la vue : c'est de la
   * présentation, elle reste ici. Le relais, lui, sert les mêmes données quel que soit
   * l'onglet — inutile de le lui apprendre.
   *
   * Les liens de téléchargement pointent `/admin/api/accounting/download`, et non plus
   * cette page : c'est ce qui la libère d'avoir à relayer un flux binaire.
   */
  let {
    report,
    titre,
    vue,
    season = ''
  }: {
    report: string;
    titre: string;
    vue: 'resultat' | 'tresorerie' | 'budget' | 'analytique';
    season?: string;
  } = $props();

  /*
    Trois rapports sur quatre ont un PDF ; le budget prévisionnel n'en a pas. La table le
    dit, plutôt que de laisser le bouton ouvrir la page dans un onglet comme avant.
  */
  const PDF_PAR_RAPPORT: Record<string, string> = {
    'income-statement': 'income-statement',
    analytics: 'analytics',
    'cash-flow': 'cash-flow'
  };

  let seasons = $state<any[]>([]);
  let seasonId = $state('');
  let errorMsg = $state<string | null>(null);
</script>

<div class="no-print">
  <a
    href="/admin/accounting/reports"
    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
    Retour aux rapports financiers
  </a>
</div>

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <PageHeader title={titre} description="">
    {#snippet actions()}
      <!-- Au doigt, l'exercice se change depuis la barre du bas : un document qu'on
           fait défiler sur plusieurs écrans n'a pas à garder ses contrôles en tête. -->
      {#if seasons.length}
        <div class="hidden md:block">
          <SeasonSelector {seasons} current={seasonId} />
        </div>
      {/if}
    {/snippet}
  </PageHeader>
</div>

<div class="mt-6">
  <EcranDistant
    domaine="accounting"
    ecran="reports"
    variante="liste"
    parametres={{ season }}
    onDonnees={(d) => {
      seasons = d.seasons ?? [];
      seasonId = d.seasonId ?? '';
      errorMsg = d.errorMsg ?? null;
    }}
  >
    {#snippet pret(d)}
      <GeneralMeetingReport
        view={vue}
        report={d.report}
        prevReport={d.prevReport}
        seasonId={d.seasonId}
        seasons={d.seasons}
        categories={d.categories}
        accountClasses={d.accountClasses}
        budget={d.budget}
        canUseAi={d.canUseAi}
        pdfDoc={PDF_PAR_RAPPORT[report] ?? ''}
      />
    {/snippet}
  </EcranDistant>
</div>
