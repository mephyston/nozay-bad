<script lang="ts">
  import { Select } from '@nba/ui';
  import type { Category, CategoryGroup } from './settings-types';

  /**
   * Le rangement : chaque catégorie active choisit son pôle et sa rubrique. Le choix
   * s'enregistre aussitôt fait.
   */
  let {
    categories = [],
    poles = [],
    rubriques = [],
    isSubmitting = false,
    onAssign
  }: {
    categories: Category[];
    poles: CategoryGroup[];
    rubriques: CategoryGroup[];
    isSubmitting: boolean;
    onAssign: (categoryId: number, updates: { poleId?: number | null; rubriqueId?: number | null }) => Promise<boolean>;
  } = $props();

  // Les inactives restent visibles tant qu'elles sont rangées : leur historique compte encore.
  const visibles = $derived(categories.filter((c) => c.active !== false || c.poleId || c.rubriqueId));
  const sansRubrique = $derived(visibles.filter((c) => !c.rubriqueId).length);
  // Hors pôle, une catégorie manque au bilan des pôles : leur total passe sous celui des rapports.
  const sansPole = $derived(visibles.filter((c) => !c.poleId).length);

  const valeur = (id: number | null | undefined) => (id ? String(id) : '');
  const choix = (e: Event) => {
    const v = (e.currentTarget as HTMLSelectElement).value;
    return v ? Number(v) : null;
  };
</script>

<section class="space-y-3" data-testid="category-assignments">
  <div>
    <h3 class="text-base font-semibold text-foreground">Rangement des catégories</h3>
    <p class="text-sm text-muted-foreground">
      Le pôle range la catégorie dans le bilan des pôles ; la rubrique, dans « Où va votre cotisation ».
      {#if sansPole > 0}{sansPole} catégorie(s) sans pôle n'apparaissent dans aucun bilan de pôle.{/if}
      {#if sansRubrique > 0}{sansRubrique} catégorie(s) sans rubrique comptent dans « Autres ».{/if}
    </p>
  </div>

  <ul class="divide-y divide-border rounded-xl border border-border bg-card">
    {#each visibles as category (category.id)}
      <li class="grid gap-2 px-3 py-2 md:grid-cols-[1fr_14rem_16rem] md:items-center">
        <span class="text-sm font-medium text-foreground">
          {category.adminLabel}
          {#if category.active === false}<span class="text-xs text-muted-foreground"> (inactive)</span>{/if}
        </span>
        <Select
          aria-label="Pôle de {category.adminLabel}"
          value={valeur(category.poleId)}
          disabled={isSubmitting}
          onchange={(e) => onAssign(category.id, { poleId: choix(e) })}
        >
          <option value="">Aucun pôle</option>
          {#each poles as p (p.id)}<option value={String(p.id)}>{p.label}</option>{/each}
        </Select>
        <Select
          aria-label="Rubrique de {category.adminLabel}"
          value={valeur(category.rubriqueId)}
          disabled={isSubmitting}
          onchange={(e) => onAssign(category.id, { rubriqueId: choix(e) })}
        >
          <option value="">Aucune rubrique (Autres)</option>
          {#each rubriques as r (r.id)}<option value={String(r.id)}>{r.label}</option>{/each}
        </Select>
      </li>
    {/each}
  </ul>
</section>
