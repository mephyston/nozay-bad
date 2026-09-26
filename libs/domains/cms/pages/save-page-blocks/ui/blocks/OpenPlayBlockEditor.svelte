<script lang="ts">
  import { ChoiceField, FormField, Input, SwitchField } from '@nba/ui';
  import type { OpenPlayBlock } from '../../../../shared/blocks';

  /**
   * Jeu libre : le bloc porte une requête, jamais des séances.
   *
   * Rien à choisir séance par séance — les inscriptions bougent d'heure en heure. On
   * règle un titre et un nombre de semaines ; le site montre ce qui vient, semaine par
   * semaine, avec les inscrits en « Camille D. » et l'ouvreur, ou l'annonce qu'on le
   * cherche encore.
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
      id={`${uid}-open-play-weeks`}
      label="Semaines affichées"
      hint="À partir de la semaine en cours. Seuls les jours qui ont une séance ont une colonne."
    >
      <ChoiceField
        id={`${uid}-open-play-weeks`}
        label="Semaines affichées"
        value={String(block.weeks ?? 2)}
        onChange={(v) => {
          block.weeks = Number(v);
          // Réglage de la première version, ignoré au rendu : on ne le laisse pas
          // traîner dans la page pour qu'une lecture rapide le croie actif.
          block.limit = undefined;
        }}
        options={[
          { value: '1', label: 'Cette semaine' },
          { value: '2', label: '2 semaines' },
          { value: '3', label: '3 semaines' },
          { value: '4', label: '4 semaines' }
        ]}
      />
    </FormField>
  </div>

  <SwitchField
    id={`${uid}-open-play-signup`}
    label="Afficher le bouton « S'inscrire »"
    hint="Mène au calendrier de l'espace adhérent, filtré sur le jeu libre. L'adhérent s'y connecte pour s'inscrire."
    checked={block.showSignupLink !== false}
    onChange={(v) => (block.showSignupLink = v)}
  />

  <p class="text-muted-foreground text-sm">
    Les séances se gèrent dans <a class="text-primary hover:underline" href="/admin/website/jeu-libre">Jeu libre</a>.
    Sur le site public, les inscrits apparaissent sous la forme « Camille D. », leurs invités
    sont seulement comptés.
  </p>
</div>
