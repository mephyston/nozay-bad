<script lang="ts">
  import { ChoiceField, FormField, Input, SwitchField } from '@nba/ui';
  import type { EmbedBlock } from '../../../../shared/blocks';

  let { block = $bindable() } = $props<{ block: EmbedBlock }>();

  /* Identifiants uniques : deux intégrations sur la même page auraient sinon les
     mêmes, et un `<label for=…>` désignerait le champ de l'autre. */
  const uid = $props.id();

  const HINTS: Record<string, string> = {
    youtube: "Identifiant de la vidéo, pas son adresse : dans youtu.be/T4_qiRVEXcI, c'est T4_qiRVEXcI.",
    google_sheet: "Identifiant du document, entre /d/ et /edit dans l'adresse.",
    google_calendar: "Identifiant de l'agenda, de la forme adresse@gmail.com."
  };

  /**
   * Le format du cadre était absent de cet écran alors que le schéma le porte : toute
   * intégration sortait donc en 16/9, y compris un agenda mensuel, qui y est illisible.
   */
  function setAspect(value: string) {
    block.aspect = value as EmbedBlock['aspect'];
    // Une hauteur est obligatoire en taille fixe, et n'a aucun sens autrement : sans
    // ce ménage, une hauteur oubliée resterait dans la charge utile après un retour
    // au 16/9.
    block.heightPx = value === 'fixed' ? (block.heightPx ?? 600) : undefined;
  }
</script>

<div class="space-y-4">
  <FormField id={`${uid}-embed-provider`} label="Service">
    <ChoiceField
      id={`${uid}-embed-provider`}
      label="Service"
      value={block.provider}
      onChange={(v) => (block.provider = v as typeof block.provider)}
      options={[
        { value: 'youtube', label: 'YouTube' },
        { value: 'google_sheet', label: 'Google Sheets' },
        { value: 'google_calendar', label: 'Google Agenda' }
      ]}
    />
  </FormField>

  <FormField id={`${uid}-embed-resource`} label="Identifiant" hint={HINTS[block.provider]}>
    <Input id={`${uid}-embed-resource`} bind:value={block.resourceId} />
  </FormField>

  <FormField
    id={`${uid}-embed-title`}
    label="Titre"
    hint="Décrit le contenu pour les lecteurs d'écran."
  >
    <Input id={`${uid}-embed-title`} bind:value={block.title} placeholder="Calendrier des compétitions" />
  </FormField>

  <div class="grid gap-4 sm:grid-cols-2">
    <FormField
      id={`${uid}-embed-aspect`}
      label="Format du cadre"
      hint="16/9 pour une vidéo. Un agenda mensuel ou une grande feuille de calcul demandent une hauteur fixe."
    >
      <ChoiceField
        id={`${uid}-embed-aspect`}
        label="Format du cadre"
        value={block.aspect}
        onChange={setAspect}
        options={[
          { value: '16/9', label: '16/9', hint: 'Vidéo' },
          { value: '4/3', label: '4/3', hint: 'Plus haut' },
          { value: 'fixed', label: 'Hauteur fixe' }
        ]}
      />
    </FormField>

    {#if block.aspect === 'fixed'}
      <FormField
        id={`${uid}-embed-height`}
        label="Hauteur (pixels)"
        hint="Entre 200 et 2000. Environ 600 pour un agenda."
      >
        <Input
          id={`${uid}-embed-height`}
          type="number"
          min="200"
          max="2000"
          value={block.heightPx ?? 600}
          onchange={(e) => (block.heightPx = Number((e.currentTarget as HTMLInputElement).value))}
        />
      </FormField>
    {/if}
  </div>

  {#if block.provider === 'google_sheet'}
    <!--
      L'avertissement reste entier et sous l'interrupteur : ce réglage peut ouvrir la
      feuille à l'écriture pour n'importe quel visiteur, et c'est la seule chose de cet
      écran qui engage des données hors du site.
    -->
    <SwitchField
      id={`${uid}-embed-editable`}
      label="Autoriser la modification"
      checked={block.editable === true}
      onChange={(v) => (block.editable = v)}
    />
    <p class="text-muted-foreground px-1 text-xs">
      Le tableau s'affiche en écriture au lieu de la lecture seule. Ce réglage ne donne
      aucun droit par lui-même : c'est le partage du document côté Google qui décide. Si
      la feuille est ouverte en modification à toute personne disposant du lien,
      <strong>n'importe quel visiteur de la page pourra l'écrire</strong>, sans compte ni
      nom. L'historique des versions de Google reste le seul recours.
    </p>
  {/if}
</div>
