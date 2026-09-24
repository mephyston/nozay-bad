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

{#if errorMsg}
  <div class="mt-6"><ErrorAlert message={errorMsg} /></div>
{/if}

<div class="mt-6">
  <!--
    Le retour aux rapports est un rond à chevron, à gauche du titre et sur téléphone
    seulement. C'était un lien de texte posé **au-dessus** du titre : hors du pouce, et
    hors de vue dès qu'on défile un document de plusieurs écrans de haut. Au-dessus de
    768 px, le fil d'Ariane de la barre dit déjà d'où l'on vient.
  -->
  <PageHeader
    title={titre}
    description=""
    retour={{ href: '/admin/accounting/reports', libelle: 'Retour aux rapports financiers' }}
  >
    {#snippet actions()}
      <!-- Au doigt, l'exercice se change depuis la barre du bas : un document qu'on
           fait défiler sur plusieurs écrans n'a pas à garder ses contrôles en tête. -->
      {#if seasons.length}
        <SeasonSelector {seasons} current={seasonId} />
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
