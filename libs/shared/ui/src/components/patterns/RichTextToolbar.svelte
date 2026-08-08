<script lang="ts">
  import { Bold, Italic, Underline, Link2, Link2Off, List, ListOrdered } from '@lucide/svelte';

  let {
    activeCommands = [],
    onCommand,
    disabled = false
  }: {
    /** Commandes actuellement actives sous le curseur, pour l'état enfoncé des boutons. */
    activeCommands?: string[];
    onCommand: (command: string) => void;
    disabled?: boolean;
  } = $props();

  const groups = [
    [
      { command: 'bold', label: 'Gras', icon: Bold },
      { command: 'italic', label: 'Italique', icon: Italic },
      { command: 'underline', label: 'Souligné', icon: Underline }
    ],
    [
      { command: 'insertUnorderedList', label: 'Liste à puces', icon: List },
      { command: 'insertOrderedList', label: 'Liste numérotée', icon: ListOrdered }
    ],
    [
      { command: 'createLink', label: 'Insérer un lien', icon: Link2 },
      { command: 'unlink', label: 'Retirer le lien', icon: Link2Off }
    ]
  ];
</script>

<div class="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 px-1.5 py-1" role="toolbar" aria-label="Mise en forme">
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
