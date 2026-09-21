<script lang="ts">
  import { FormField, ChoiceField, toSeasonOptions } from '@nba/ui';
  import type { Season } from './members-table-types';

  /**
   * Les critères de la liste, sans leur contenant.
   *
   * Extraits pour être rendus deux fois : dans la popover de la barre d'outils à la
   * souris, et dans la feuille de filtres au doigt. Les deux présentations partagent
   * ainsi exactement les mêmes champs — c'est ce qui les empêche de diverger.
   *
   * Le statut n'y figure pas : il a ses segments, visibles en permanence. Un critère
   * ne se règle qu'à un seul endroit, sinon deux contrôles disent la même chose et
   * finissent par se contredire.
   */
  let {
    selectedSeason = $bindable('25-26'),
    selectedGender = $bindable(''),
    selectedType = $bindable(''),
    selectedCohort = $bindable(''),
    seasons = [],
    onApply
  }: {
    selectedSeason: string;
    selectedGender: string;
    selectedType: string;
    selectedCohort: string;
    seasons: Season[];
    onApply: () => void;
  } = $props();

  const seasonItems = $derived(
    seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );

  const genderItems = [
    { label: 'Tous les genres', value: '' },
    { label: 'Homme', value: 'M' },
    { label: 'Femme', value: 'F' }
  ];

  const typeItems = [
    { label: 'Tous les types', value: '' },
    { label: 'Compétiteur', value: 'Competiteur' },
    { label: 'Loisir', value: 'Loisir' }
  ];

  // Même partage que la carte « Renouvellement » du tableau de bord, par personne contre n-1.
  const cohortItems = [
    { label: 'Toute la saison', value: '' },
    { label: 'Renouvelés', value: 'renewed', hint: 'Déjà là la saison passée' },
    { label: 'Nouveaux', value: 'new', hint: 'Absents la saison passée' },
    { label: 'Non renouvelés', value: 'lapsed', hint: 'Adhérents de n-1 sans adhésion cette saison' }
  ];
</script>

<FormField id="filter-season" label="Saison">
  <ChoiceField
    id="filter-season"
    label="Saison"
    options={seasonItems.map((s) => ({ value: String(s.value), label: s.label }))}
    bind:value={selectedSeason}
    onChange={onApply}
  />
</FormField>

<FormField id="filter-type" label="Type">
  <ChoiceField id="filter-type" label="Type" options={typeItems} bind:value={selectedType} onChange={onApply} />
</FormField>

<FormField id="filter-gender" label="Genre">
  <ChoiceField id="filter-gender" label="Genre" options={genderItems} bind:value={selectedGender} onChange={onApply} />
</FormField>

<FormField id="filter-cohort" label="Cohorte">
  <ChoiceField id="filter-cohort" label="Cohorte" options={cohortItems} bind:value={selectedCohort} onChange={onApply} />
</FormField>
