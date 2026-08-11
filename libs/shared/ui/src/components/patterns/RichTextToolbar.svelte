<script lang="ts">
  import {
    Bold, Italic, Underline, Link2, Link2Off, List, ListOrdered, Paperclip, ImagePlus,
    Heading2, Heading3, AlignCenter
  } from '@lucide/svelte';

  let {
    activeCommands = [],
    onCommand,
    disabled = false,
    canInsertFile = false,
    canInsertImage = false
  }: {
    /** Commandes actuellement actives sous le curseur, pour l'état enfoncé des boutons. */
    activeCommands?: string[];
    onCommand: (command: string) => void;
    disabled?: boolean;
    /** Affiche « Fichier » : seuls les écrans reliés à la médiathèque savent le servir. */
    canInsertFile?: boolean;
    /** Affiche « Image » : seuls les écrans reliés à la médiathèque savent la servir. */
    canInsertImage?: boolean;
  } = $props();

  // Dérivé et non figé : `canInsertFile` dépend de l'écran appelant, qui peut le
  // basculer après le montage.
  const groups = $derived([
    [
      // Les titres d'abord : c'est la structure du texte, avant sa mise en forme.
      { command: 'heading2', label: 'Titre de section', icon: Heading2 },
      { command: 'heading3', label: 'Sous-titre', icon: Heading3 }
    ],
    [
      { command: 'bold', label: 'Gras', icon: Bold },
      { command: 'italic', label: 'Italique', icon: Italic },
      { command: 'underline', label: 'Souligné', icon: Underline }
    ],
    [
      { command: 'insertUnorderedList', label: 'Liste à puces', icon: List },
      { command: 'insertOrderedList', label: 'Liste numérotée', icon: ListOrdered },
      // Centrer plutôt qu'un jeu complet d'alignements : le fer à gauche est la valeur
      // par défaut, et le fer à droite ou la justification ne servent aucun besoin ici.
      { command: 'alignCenter', label: 'Centrer', icon: AlignCenter }
    ],
    [
      { command: 'createLink', label: 'Insérer un lien', icon: Link2 },
      { command: 'unlink', label: 'Retirer le lien', icon: Link2Off }
    ],
    ...(canInsertFile || canInsertImage
      ? [
          [
            ...(canInsertImage
              ? [{ command: 'insertImage', label: 'Insérer une image', icon: ImagePlus }]
              : []),
            ...(canInsertFile
              ? [{ command: 'insertFile', label: 'Insérer un fichier à télécharger', icon: Paperclip }]
              : [])
          ]
        ]
      : [])
  ]);
</script>

<!--
  Collante en tête de la zone d'édition : sur un texte long, appliquer un style
  obligeait sinon à remonter jusqu'en haut, puis à redescendre retrouver son curseur.
  Elle se cale sur le conteneur défilant le plus proche — la page pour un formulaire
  en pleine largeur, le panneau pour un formulaire en sheet — sans rien savoir de l'un
  ni de l'autre.

  Le fond est posé en CSS et non par une classe utilitaire : voir le bloc `style`.
-->
<div
  class="nba-rich-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-input px-1.5 py-1"
  role="toolbar"
  aria-label="Mise en forme"
>
  {#each groups as group, groupIndex (groupIndex)}
    {#if groupIndex > 0}
      <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true"></span>
    {/if}
    {#each group as item (item.command)}
      {@const Icon = item.icon}
      {@const active = activeCommands.includes(item.command)}
      <button
        type="button"
        {disabled}
        aria-label={item.label}
        title={item.label}
        aria-pressed={active}
        class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-accent aria-pressed:text-accent-foreground"
        onmousedown={(e) => {
          // `mousedown` et non `click` : cliquer déplacerait le focus hors de la zone
          // d'édition, et la sélection sur laquelle porte la commande serait perdue.
          e.preventDefault();
          onCommand(item.command);
        }}
      >
        <Icon class="h-4 w-4" />
      </button>
    {/each}
  {/each}
</div>

<style>
  /*
    Fond **opaque**, et écrit ici plutôt qu'en classe utilitaire.

    Opaque parce que la barre est collante : le texte défile maintenant dessous, et
    l'ancien `bg-muted/40` le laissait lire au travers des icônes.

    En CSS parce que la valeur arbitraire qui reproduisait la teinte d'origine
    (`bg-[color-mix(…)]`) n'était pas émise par Tailwind, et se rendait donc
    entièrement transparente — le symptôme même qu'elle devait corriger.

    L'ombre est discrète et permanente : elle détache la barre du texte qui passe
    dessous, sans clignoter au moment où le collage s'enclenche.
  */
  .nba-rich-toolbar {
    background-color: var(--muted);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  }
</style>
