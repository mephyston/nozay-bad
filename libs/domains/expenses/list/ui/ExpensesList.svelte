<script lang="ts">
  import { Badge, ListView, ListRow } from '@nba/ui';
  import type { Expense } from './expenses-types';
  import { gestesDeNote, libelleDeCategorie, ligneDeNote, statutDeNote, type GestesDeNote } from './expenses-row-model';

  /**
   * Les notes de frais en liste, au doigt.
   *
   * Sept colonnes remplacées par deux lignes : le bénéficiaire, la date et le motif, le
   * montant à droite. La catégorie et le statut tiennent le badge ; le justificatif, que
   * la table ouvrait par une colonne « Voir », passe au balayage — sur un téléphone,
   * c'est même la seule façon de le lire.
   */
  let {
    expenses = [],
    categoryLabels = {},
    vue = 'pending',
    isClosed = false,
    onSelectPhoto,
    onAction,
    onStartEdit,
    onCancelValidation,
    emptyTitle,
    emptyDescription
  }: {
    expenses?: Expense[];
    categoryLabels?: Record<string, string>;
    /** La file d'attente montre la catégorie ; l'historique montre l'issue. */
    vue?: 'pending' | 'history';
    emptyTitle?: string;
    emptyDescription?: string;
  } & GestesDeNote = $props();

  const gestes = $derived({ isClosed, onSelectPhoto, onAction, onStartEdit, onCancelValidation });
</script>

<ListView items={expenses} {emptyTitle} {emptyDescription}>
  {#snippet listRow(exp)}
    {@const l = ligneDeNote(exp)}
    {@const statut = statutDeNote(exp)}
    <ListRow
      item={exp}
      onclick={!isClosed && exp.status === 'pending' && onStartEdit ? () => onStartEdit(exp) : undefined}
      chevron={!isClosed && exp.status === 'pending' && onStartEdit ? true : 'none'}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      actions={gestesDeNote(exp, gestes)}
    >
      <!--
        Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
        propriété au composant. En attente, la catégorie est ce qu'on vérifie avant de
        valider ; à l'historique, c'est l'issue qui compte.
      -->
      {#snippet badge()}
        {#if vue === 'history'}
          <Badge variant={statut.variant as 'success'} size="xs">{statut.label}</Badge>
        {:else}
          <Badge variant="secondary" size="xs">{libelleDeCategorie(exp, categoryLabels)}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
