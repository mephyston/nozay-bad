<script lang="ts">
  import type { Category, CategoryGroup } from './settings-types';
  import type { SettingsState } from './settings-api-classes';
  import * as groupsApi from './settings-api-groups';
  import CategoryGroupList from './CategoryGroupList.svelte';
  import CategoryGroupAssignments from './CategoryGroupAssignments.svelte';

  /**
   * Pôles et rubriques du tableau de bord.
   *
   * Ils se reconnaissaient autrefois à des mots du libellé des catégories : renommer
   * « Volants » faisait sortir la catégorie de son pôle. Le bureau les range ici.
   */
  let {
    categories = [],
    groups = [],
    settings
  }: {
    categories: Category[];
    groups: CategoryGroup[];
    settings: SettingsState;
  } = $props();

  const poles = $derived(groups.filter((g) => g.kind === 'pole'));
  const rubriques = $derived(groups.filter((g) => g.kind === 'rubrique'));
</script>

<div class="space-y-8">
  <div class="grid gap-8 lg:grid-cols-2">
    <CategoryGroupList
      kind="pole"
      title="Pôles"
      description="Les cartes « Bilan des pôles d'activité » du tableau de bord, dans cet ordre."
      groups={poles}
      isSubmitting={settings.isSubmitting}
      onCreate={(label) => groupsApi.createCategoryGroup(settings, 'pole', label)}
      onRename={(g, label) => groupsApi.updateCategoryGroup(settings, g, { label })}
      onMove={(i, d) => groupsApi.moveCategoryGroup(settings, poles, i, d)}
      onDelete={(g) => groupsApi.deleteCategoryGroup(settings, g)}
    />
    <CategoryGroupList
      kind="rubrique"
      title="Rubriques de « Où va votre cotisation »"
      description="Les postes que l'on montre aux adhérents. L'étoile désigne la rubrique des cotisations, rapportée au coût d'un adhérent."
      groups={rubriques}
      isSubmitting={settings.isSubmitting}
      onCreate={(label) => groupsApi.createCategoryGroup(settings, 'rubrique', label)}
      onRename={(g, label) => groupsApi.updateCategoryGroup(settings, g, { label })}
      onMove={(i, d) => groupsApi.moveCategoryGroup(settings, rubriques, i, d)}
      onDelete={(g) => groupsApi.deleteCategoryGroup(settings, g)}
      onMarkFees={(g) => groupsApi.updateCategoryGroup(settings, g, { membershipFees: true })}
    />
  </div>

  <CategoryGroupAssignments
    {categories}
    {poles}
    {rubriques}
    isSubmitting={settings.isSubmitting}
    onAssign={(id, updates) => groupsApi.assignCategory(settings, id, updates)}
  />
</div>
