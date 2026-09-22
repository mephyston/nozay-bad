<script lang="ts">
  import { ListView, ListRow } from '@nba/ui';
  import type { Rubrique } from './notifications-row-model';

  /**
   * L'index de l'écran : une rangée par rubrique, toutes de la même forme.
   *
   * Elles se présentaient de trois façons — trois sections repliables à chevron bas,
   * une carte toujours ouverte à gros chiffres, et un lien souligné au milieu d'un
   * paragraphe pour atteindre les appareils. Trois grammaires pour la même chose :
   * « voici une rubrique, entrez-y ». Le chevron vers la droite la dit une fois.
   */
  let {
    rubriques = [],
    onOuvrir
  }: {
    rubriques?: Rubrique[];
    onOuvrir: (id: Rubrique['id']) => void;
  } = $props();
</script>

<ListView items={rubriques} emptyTitle="Aucune rubrique">
  {#snippet listRow(rubrique)}
    {@const Icone = rubrique.icone}
    <ListRow
      item={rubrique}
      onclick={() => onOuvrir(rubrique.id)}
      title={rubrique.titre}
      subtitle={rubrique.sousTitre}
      value={rubrique.valeur}
      valueTone="foreground"
    >
      {#snippet leading()}
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icone class="size-4" aria-hidden="true" />
        </span>
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
