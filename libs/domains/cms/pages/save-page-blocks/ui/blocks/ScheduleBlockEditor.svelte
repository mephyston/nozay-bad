<script lang="ts">
  import { Input, Label } from '@nba/ui';
  import type { ScheduleBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: ScheduleBlock }>();

  /**
   * Préfixe d'identifiants propre à cette instance.
   *
   * Un bloc peut désormais apparaître deux fois sur le même écran — au premier niveau
   * et dans une colonne, ou dans deux colonnes voisines. Des `id` écrits en dur s'y
   * répéteraient, et cliquer un intitulé donnerait le champ de l'autre bloc.
   */
  const uid = $props.id();

  let raw = $state(block.audiences.join(', '));
  $effect(() => {
    block.audiences = raw.split(',').map((p) => p.trim()).filter(Boolean);
  });
</script>

<div class="space-y-3">
  <div>
    <Label for={`${uid}-schedule-heading`}>Titre de section</Label>
    <Input id={`${uid}-schedule-heading`} bind:value={block.heading} placeholder="Les créneaux" />
  </div>
  <div>
    <Label for={`${uid}-schedule-audiences`}>Publics</Label>
    <Input id={`${uid}-schedule-audiences`} bind:value={raw} placeholder="minibad, poussins, jeunes" />
    <p class="text-muted-foreground mt-1 text-xs">
      Ce bloc n'enregistre pas d'horaires : il affiche ceux tenus à jour dans la
      rubrique « Créneaux », pour qu'ils ne soient saisis qu'à un seul endroit.
    </p>
  </div>
</div>
