<script lang="ts">
  import { uiAlert } from '@nba/ui';
  import type { Category, CategoryGroup, CategoryGroupKind } from './settings-types';
  import type { SettingsState } from './settings-api-classes';
  import { saveCategoryPlacement } from './settings-api-groups';
  import CategoryGroupBoard from './CategoryGroupBoard.svelte';

  /**
   * Pôles et rubriques du tableau de bord.
   *
   * Ils se reconnaissaient autrefois à des mots du libellé des catégories : renommer
   * « Volants » faisait sortir la catégorie de son pôle. Le bureau les range ici, en
   * glissant chaque catégorie dans sa colonne — ou par « + » et la croix, au doigt.
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

  type Placement = { poleId?: number | null; rubriqueId?: number | null };

  /*
    Les déplacements s'affichent avant la réponse du serveur, et sont défaits s'il
    refuse. Une liste relue (création, suppression d'un regroupement) les remplace.
  */
  let deplacements = $state<Record<number, Placement>>({});
  $effect(() => {
    void categories;
    deplacements = {};
  });

  // Les inactives restent visibles tant qu'elles sont rangées : leur historique compte encore.
  const affichees = $derived(
    categories
      .map((c) => ({ ...c, ...deplacements[c.id] }))
      .filter((c) => c.active !== false || c.poleId || c.rubriqueId)
      .sort((a, b) => a.adminLabel.localeCompare(b.adminLabel, 'fr'))
  );

  async function ranger(kind: CategoryGroupKind, categoryId: number, groupId: number | null) {
    const champ = kind === 'pole' ? 'poleId' : 'rubriqueId';
    const avant = affichees.find((c) => c.id === categoryId)?.[champ] ?? null;
    if (avant === groupId) return;
    deplacements[categoryId] = { ...deplacements[categoryId], [champ]: groupId };
    try {
      await saveCategoryPlacement(categoryId, { [champ]: groupId });
    } catch (err) {
      deplacements[categoryId] = { ...deplacements[categoryId], [champ]: avant };
      void uiAlert(err instanceof Error ? err.message : 'La catégorie n’a pas pu être rangée.');
    }
  }
</script>

<div class="space-y-10">
  <p class="text-sm text-muted-foreground">
    Glissez une catégorie d'une colonne à l'autre, ou utilisez « Ajouter une catégorie » et la croix.
    Chaque déplacement est enregistré aussitôt.
  </p>

  <CategoryGroupBoard
    kind="pole"
    title="Pôles du tableau de bord"
    description="Une carte « Bilan des pôles » par colonne, dans cet ordre. Une catégorie sans pôle n'apparaît dans aucun bilan."
    unsortedTitle="Sans pôle"
    groups={groups.filter((g) => g.kind === 'pole')}
    categories={affichees}
    {settings}
    onPlace={(id, groupId) => ranger('pole', id, groupId)}
  />

  <CategoryGroupBoard
    kind="rubrique"
    title="Rubriques de « Où va votre cotisation »"
    description="Les postes montrés aux adhérents. La rubrique marquée « Cotisations » est rapportée au coût d'un adhérent ; les catégories sans rubrique comptent dans « Autres »."
    unsortedTitle="Autres (sans rubrique)"
    groups={groups.filter((g) => g.kind === 'rubrique')}
    categories={affichees}
    {settings}
    onPlace={(id, groupId) => ranger('rubrique', id, groupId)}
  />
</div>
