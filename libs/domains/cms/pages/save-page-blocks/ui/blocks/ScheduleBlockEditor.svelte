<script lang="ts">
  import { FormField, Input, MultiChoiceField } from '@nba/ui';
  import type { ScheduleBlock } from '../../../../shared/blocks';
  import { PUBLICS_DE_CRENEAU } from './schedule-audiences';

  let { block = $bindable() } = $props<{ block: ScheduleBlock }>();

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();

  /*
    Les publics se choisissaient dans une ligne de texte, séparés par des virgules, et
    un `$effect` la redécoupait à chaque frappe. Trois façons de se tromper sans que
    rien ne le dise : une faute de frappe, un libellé au lieu de la valeur, un public
    qui n'existe plus. La liste est désormais fermée.
  */
  const rangerDansLOrdreDuCatalogue = (valeurs: readonly string[]) =>
    PUBLICS_DE_CRENEAU.filter((p) => valeurs.includes(p.value)).map((p) => p.value);

  const retenus = $derived(rangerDansLOrdreDuCatalogue(block.audiences ?? []));
</script>

<div class="space-y-4">
  <FormField id={`${uid}-schedule-heading`} label="Titre de section">
    <Input id={`${uid}-schedule-heading`} bind:value={block.heading} placeholder="Les créneaux" />
  </FormField>

  <FormField
    id={`${uid}-schedule-audiences`}
    label="Publics"
    hint="Aucun retenu : tous les créneaux s'affichent. Ce bloc n'enregistre pas d'horaires — il affiche ceux tenus à jour dans la rubrique « Créneaux », pour qu'ils ne soient saisis qu'à un seul endroit."
  >
    <MultiChoiceField
      id={`${uid}-schedule-audiences`}
      label="Publics"
      title="Publics affichés"
      description="Le bloc ne montrera que les créneaux de ces publics."
      placeholder="Tous"
      values={retenus}
      onChange={(v) => (block.audiences = rangerDansLOrdreDuCatalogue(v))}
      options={PUBLICS_DE_CRENEAU}
    />
  </FormField>
</div>
