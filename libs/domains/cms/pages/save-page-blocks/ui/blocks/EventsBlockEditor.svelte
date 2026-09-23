<script lang="ts">
  import { ChoiceField, FormField, Input, MultiChoiceField, SwitchField } from '@nba/ui';
  import type { EventsBlock } from '../../../../shared/blocks';
  import { CATEGORIES_DAGENDA } from './events-categories';

  /**
   * Agenda : le bloc porte une requête, jamais des événements.
   *
   * L'écran ne propose donc aucune sélection d'événement à la main — ce serait figer
   * une liste qui vieillirait dès le lendemain. On choisit un nombre, des catégories,
   * et le site montre ce qui vient.
   */
  let { block = $bindable() } = $props<{ block: EventsBlock }>();

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();

  /*
    Les catégories retenues, rangées dans l'ordre du catalogue.

    Elles l'étaient dans l'ordre des clics : deux blocs portant les mêmes catégories
    donnaient deux tableaux différents, et la page changeait à l'enregistrement sans
    que rien n'ait changé pour le lecteur.
  */
  const rangerDansLOrdreDuCatalogue = (valeurs: readonly string[]) =>
    CATEGORIES_DAGENDA.filter((c) => valeurs.includes(c.value)).map((c) => c.value);

  const retenues = $derived(rangerDansLOrdreDuCatalogue(block.categories ?? []));
</script>

<div class="space-y-4">
  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id={`${uid}-events-heading`} label="Titre de section">
      <Input id={`${uid}-events-heading`} bind:value={block.heading} placeholder="Prochains rendez-vous" />
    </FormField>

    <FormField
      id={`${uid}-events-limit`}
      label="Nombre affiché"
      hint="Seuls les rendez-vous à venir s'affichent : la liste se met à jour toute seule."
    >
      <ChoiceField
        id={`${uid}-events-limit`}
        label="Nombre affiché"
        value={String(block.limit ?? 6)}
        onChange={(v) => (block.limit = Number(v))}
        options={[3, 4, 5, 6, 8, 10, 12].map((n) => ({ value: String(n), label: `${n} événements` }))}
      />
    </FormField>
  </div>

  <!--
    Six cases à cocher en grille de trois colonnes, avec des cibles de 16 px et une
    `<legend>` qui n'est pas un libellé de champ. Une rangée dit ce qui est retenu et
    mène à l'écran de choix, où chaque catégorie a sa ligne de 44 points.
  -->
  <FormField
    id={`${uid}-events-categories`}
    label="Catégories"
    hint="Aucune retenue : toutes les catégories s'affichent."
  >
    <MultiChoiceField
      id={`${uid}-events-categories`}
      label="Catégories"
      title="Catégories affichées"
      description="Le bloc ne montrera que les rendez-vous de ces catégories."
      placeholder="Toutes"
      values={retenues}
      onChange={(v) => (block.categories = rangerDansLOrdreDuCatalogue(v))}
      options={CATEGORIES_DAGENDA}
    />
  </FormField>

  <SwitchField
    id={`${uid}-events-archive`}
    label="Afficher le lien « Tout l'agenda »"
    hint="Renvoie vers la page /agenda/, qui liste l'ensemble des rendez-vous."
    checked={block.showArchiveLink !== false}
    onChange={(v) => (block.showArchiveLink = v)}
  />
</div>
