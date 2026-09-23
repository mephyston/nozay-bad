<script lang="ts">
  import { ChoicePicker, ListView, ListRow } from '@nba/ui';
  import {
    affectationDeCandidat,
    choixDeCreneau,
    detailDeCandidat,
    ecartAuSouhait,
    nomDeCandidat,
    type CandidatLike,
    type CreneauLike
  } from './selection-row-model';

  /**
   * Les candidats en liste, au doigt.
   *
   * La rangée du bureau porte le rang, le nom, l'âge, trois classements, l'historique,
   * le souhait, la note — puis une rangée de boutons par créneau. À 390 px tout cela se
   * replie en six lignes et l'on ne voit plus deux candidats à la fois, alors qu'on
   * choisit précisément en comparant.
   *
   * Reste ce qui décide : qui, quel âge, et combien de fois déjà retenu. Le créneau
   * attribué tient la droite, et l'appui ouvre l'écran de choix.
   */
  let {
    candidats = [],
    creneaux = [],
    assignations = {},
    capacite,
    lecture = false,
    onAssigner
  }: {
    candidats?: CandidatLike[];
    creneaux?: CreneauLike[];
    /** Le créneau retenu pour chaque candidature, par identifiant de demande. */
    assignations?: Record<number, number | null>;
    capacite: number;
    /** Soirée annulée ou droits absents : la liste se lit, elle ne se modifie pas. */
    lecture?: boolean;
    onAssigner: (requestId: number, creneau: number | null) => void;
  } = $props();

  /**
   * Un seul écran de choix pour toute la liste, ouvert sur le candidat visé.
   *
   * Un par rangée monterait vingt feuilles et vingt copies de la liste des créneaux
   * dans le DOM pour n'en montrer qu'une.
   */
  let choixOuvert = $state(false);
  let candidatVise = $state<CandidatLike | null>(null);

  const occupation = $derived.by(() => {
    const compte: Record<number, number> = {};
    for (const creneau of creneaux) compte[creneau.index] = 0;
    for (const valeur of Object.values(assignations)) {
      if (valeur !== null && valeur !== undefined) compte[valeur] = (compte[valeur] ?? 0) + 1;
    }
    return compte;
  });

  function ouvrirChoix(candidat: CandidatLike) {
    candidatVise = candidat;
    choixOuvert = true;
  }

  function choisir(valeur: string) {
    if (!candidatVise) return;
    onAssigner(candidatVise.requestId, valeur === '' ? null : Number(valeur));
    candidatVise = null;
  }
</script>

<ListView
  items={candidats}
  emptyTitle="Aucune candidature"
  emptyDescription="Personne n’a encore demandé cette soirée."
>
  {#snippet listRow(candidat, rang)}
    {@const attribue = assignations[candidat.requestId] ?? null}
    <ListRow
      item={candidat}
      onclick={lecture ? undefined : () => ouvrirChoix(candidat)}
      title={nomDeCandidat(candidat)}
      subtitle={detailDeCandidat(candidat)}
      value={affectationDeCandidat(attribue)}
      valueTone={attribue === null ? 'muted' : 'primary'}
      valueCaption={ecartAuSouhait(candidat, attribue)}
    >
      {#snippet leading()}
        <!-- Le rang de priorité : c'est l'ordre d'équité, et il se lit avant le nom. -->
        <span class="text-muted-foreground w-6 text-center text-sm font-bold tabular-nums">
          {rang + 1}
        </span>
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>

<ChoicePicker
  bind:open={choixOuvert}
  title={candidatVise ? `Créneau de ${nomDeCandidat(candidatVise)}` : 'Créneau'}
  description={candidatVise ? detailDeCandidat(candidatVise) : undefined}
  value={candidatVise && assignations[candidatVise.requestId] != null
    ? String(assignations[candidatVise.requestId])
    : ''}
  options={choixDeCreneau(creneaux, occupation, capacite)}
  onChoose={choisir}
/>
