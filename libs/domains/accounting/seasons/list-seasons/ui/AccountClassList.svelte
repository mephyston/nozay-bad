<script lang="ts">
  import { ListRow, ListView } from '@nba/ui';
  import { libelleDeType } from './config-row-model';
  import type { AccountClass } from './settings-types';

  /**
   * Le plan comptable en liste, au doigt.
   *
   * La carte affichait le type brut de l'API — « depense », sans accent — et posait un
   * bouton « Modifier » pleine largeur sous chaque classe. Le code tient la droite :
   * c'est par lui qu'on rapproche une écriture d'un plan comptable.
   */
  let {
    accountClasses = [],
    onEdit
  }: {
    accountClasses?: AccountClass[];
    onEdit: (ac: AccountClass) => void;
  } = $props();
</script>

<ListView
  items={accountClasses}
  emptyTitle="Aucune classe"
  emptyDescription="Aucune classe de compte n’est définie."
>
  {#snippet listRow(ac)}
    <ListRow
      item={ac}
      onclick={() => onEdit(ac)}
      title={ac.label}
      value={ac.code}
      valueTone="foreground"
      valueCaption={libelleDeType(ac.type)}
    />
  {/snippet}
</ListView>
