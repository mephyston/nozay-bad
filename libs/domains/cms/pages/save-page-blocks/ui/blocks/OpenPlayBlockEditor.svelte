<script lang="ts">
  import { ChoiceField, FormField, Input } from '@nba/ui';
  import type { OpenPlayBlock } from '../../../../shared/blocks';

  /**
   * Jeu libre : le bloc porte une requête, jamais des séances.
   *
   * Rien à choisir séance par séance — les inscriptions bougent d'heure en heure. On
   * règle un titre et un nombre ; le site montre ce qui vient, avec les inscrits en
   * « Camille D. » et l'ouvreur, ou l'annonce qu'on le cherche encore.
   */
  let { block = $bindable() } = $props<{ block: OpenPlayBlock }>();

  /** Préfixe d'identifiants propre à cette instance : voir `EventsBlockEditor`. */
  const uid = $props.id();
</script>

<div class="space-y-4">
  <div class="grid gap-4 sm:grid-cols-2">
    <FormField id={`${uid}-open-play-heading`} label="Titre de section">
      <Input id={`${uid}-open-play-heading`} bind:value={block.heading} placeholder="Jeu libre" />
    </FormField>

    <FormField
      id={`${uid}-open-play-limit`}
      label="Nombre affiché"
      hint="Seules les séances à venir s'affichent : la liste se met à jour toute seule."
    >
      <ChoiceField
        id={`${uid}-open-play-limit`}
        label="Nombre affiché"
        value={String(block.limit ?? 6)}
        onChange={(v) => (block.limit = Number(v))}
        options={[2, 3, 4, 6, 8, 12].map((n) => ({ value: String(n), label: `${n} séances` }))}
      />
    </FormField>
  </div>

  <p class="text-muted-foreground text-sm">
    Les séances se gèrent dans <a class="text-primary hover:underline" href="/admin/website/jeu-libre">Jeu libre</a>.
    Sur le site public, les inscrits apparaissent sous la forme « Camille D. », leurs invités
    sont seulement comptés.
  </p>
</div>
