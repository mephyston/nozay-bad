<script lang="ts">
  import { Badge, ChoiceField, FormField, ListView, ListRow, ResponsiveSheet } from '@nba/ui';
  import { RANKINGS } from '../../shared/ranking';
  import {
    classementsDeJoueur,
    cpphDeJoueur,
    detailDeJoueur,
    nomDeJoueur,
    signalementsDeJoueur,
    tonDeClassements,
    type ClassementLike
  } from './rankings-row-model';

  type Discipline = 'singles' | 'doubles' | 'mixed';

  /**
   * Les classements en liste, au doigt.
   *
   * La rangée du téléphone montrait déjà l'essentiel, mais n'offrait **aucune
   * correction** : il fallait un ordinateur pour redresser un classement, alors que
   * c'est au gymnase qu'on s'aperçoit qu'il est faux. L'appui ouvre les trois
   * disciplines, chacune sur sa rangée.
   */
  let {
    joueurs = [],
    canEdit = false,
    saving = null,
    onEdit,
    emptyIcon,
    emptyTitle,
    emptyDescription
  }: {
    joueurs?: ClassementLike[];
    canEdit?: boolean;
    /** Licence en cours d'enregistrement : ses trois rangées se figent. */
    saving?: string | null;
    onEdit?: (licence: string, field: Discipline, valeur: string | null) => void;
    emptyIcon?: unknown;
    emptyTitle?: string;
    emptyDescription?: string;
  } = $props();

  /** Un seul écran de correction pour toute la liste, ouvert sur le joueur visé. */
  let correctionOuverte = $state(false);
  let joueurVise = $state<ClassementLike | null>(null);

  /**
   * La valeur vide vaut `null` — licencié non compétiteur — et non `NC`, qui est un
   * classement à part entière : zéro point, mais alignable.
   */
  const CHOIX = [
    { value: '', label: 'Non compétiteur', hint: 'aucun classement' },
    ...RANKINGS.map((r) => ({ value: r, label: r }))
  ];

  const DISCIPLINES: { champ: Discipline; libelle: string }[] = [
    { champ: 'singles', libelle: 'Simple' },
    { champ: 'doubles', libelle: 'Double' },
    { champ: 'mixed', libelle: 'Mixte' }
  ];

  function ouvrirCorrection(joueur: ClassementLike) {
    joueurVise = joueur;
    correctionOuverte = true;
  }
</script>

<ListView items={joueurs} {emptyIcon} {emptyTitle} {emptyDescription}>
  {#snippet listRow(joueur)}
    <ListRow
      item={joueur}
      onclick={canEdit ? () => ouvrirCorrection(joueur) : undefined}
      title={nomDeJoueur(joueur)}
      subtitle={detailDeJoueur(joueur)}
      value={classementsDeJoueur(joueur)}
      valueTone={tonDeClassements(joueur)}
      valueCaption={cpphDeJoueur(joueur)}
    >
      {#snippet badge()}
        {#each signalementsDeJoueur(joueur) as pastille (pastille.label)}
          <Badge variant={pastille.variant} size="xs">{pastille.label}</Badge>
        {/each}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>

<ResponsiveSheet
  bind:open={correctionOuverte}
  title={joueurVise ? nomDeJoueur(joueurVise) : 'Classements'}
  description="Une correction remplace la valeur importée : la ligne sera marquée « saisi à la main »."
  size="md"
>
  {#if joueurVise}
    {@const vise = joueurVise}
    <div class="space-y-4 py-2">
      {#each DISCIPLINES as discipline (discipline.champ)}
        <FormField id={`classement-${discipline.champ}`} label={discipline.libelle}>
          <ChoiceField
            id={`classement-${discipline.champ}`}
            label={discipline.libelle}
            value={vise[discipline.champ] ?? ''}
            disabled={saving === vise.licence}
            onChange={(v) => onEdit?.(vise.licence, discipline.champ, v === '' ? null : v)}
            options={CHOIX}
          />
        </FormField>
      {/each}
    </div>
  {/if}
</ResponsiveSheet>
