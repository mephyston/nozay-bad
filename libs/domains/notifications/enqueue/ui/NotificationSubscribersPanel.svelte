<script lang="ts">
  import { Bell } from '@lucide/svelte';
  import { EmptyState, ErrorAlert, ListView, ListRow } from '@nba/ui';
  import { dateFr, ligneDAbonne, type AbonneLike, type StatsLike } from './notifications-row-model';

  /**
   * Les abonnements : les compteurs, puis les appareils.
   *
   * Le détail des appareils vivait dans un dialogue à part, atteint par un lien
   * souligné au milieu d'un paragraphe — un second niveau de navigation pour du
   * contenu qui appartient à cette rubrique et à aucune autre. Il est ici, à la
   * suite des chiffres qu'il explique.
   */
  let {
    stats,
    abonnes = null,
    erreur = ''
  }: {
    stats: StatsLike;
    /** `null` tant que la liste n'est pas revenue : elle se charge à l'ouverture. */
    abonnes?: AbonneLike[] | null;
    erreur?: string;
  } = $props();

  /* Les envois en attente ne paraissent que s'il y en a : une ligne « 0 en attente »
     ressemble à un incident là où il n'y a rien à signaler. */
  const compteurs = $derived([
    { valeur: stats.devices, libelle: 'appareil(s) abonné(s)' },
    { valeur: stats.accounts, libelle: 'compte(s) adhérent(s)' },
    ...(stats.pending > 0 ? [{ valeur: stats.pending, libelle: 'envoi(s) en attente' }] : [])
  ]);
</script>

<div class="space-y-4">
  <!-- Les chiffres en bande, et non empilés : trois cartes de 188 px repoussaient la
       liste des appareils hors de l'écran sur un téléphone. -->
  <div class="flex flex-wrap gap-2">
    {#each compteurs as compteur (compteur.libelle)}
      <div class="flex-1 rounded-xl border border-border bg-card px-3 py-2 min-w-[7rem]">
        <div class="text-xl font-bold text-foreground">{compteur.valeur}</div>
        <div class="text-xs text-muted-foreground">{compteur.libelle}</div>
      </div>
    {/each}
  </div>

  <p class="text-xs text-muted-foreground">
    Les adhérents activent les notifications depuis « Mon compte » et choisissent les
    catégories qu'ils souhaitent recevoir. Sur iPhone et iPad, cela nécessite d'avoir
    installé l'application sur l'écran d'accueil.
  </p>

  {#if erreur}
    <ErrorAlert message={erreur} />
  {:else if abonnes === null}
    <p class="text-sm text-muted-foreground">Chargement…</p>
  {:else if abonnes.length === 0}
    <EmptyState
      icon={Bell}
      title="Aucun appareil abonné"
      description="Les adhérents activent les notifications depuis leur espace."
    />
  {:else}
    <ListView items={abonnes}>
      {#snippet listRow(abonne)}
        {@const l = ligneDAbonne(abonne)}
        <ListRow
          item={abonne}
          title={l.titre}
          subtitle={l.sousTitre}
          value={l.valeur}
          valueTone={l.ton}
          valueCaption={abonne.lastSuccessAt
            ? `reçu le ${dateFr(abonne.lastSuccessAt)}`
            : `abonné le ${dateFr(abonne.createdAt)}`}
          chevron="none"
        />
      {/snippet}
    </ListView>
  {/if}
</div>
