<script lang="ts">
  import { ListView, ListRow } from '@nba/ui';
  import { libelleDeCategorie, ligneProgrammee, type ProgrammeeLike } from './notifications-row-model';

  /**
   * Le registre des envois automatiques, en consultation seule.
   *
   * Les conditions de déclenchement sont câblées dans le code : rien n'est
   * actionnable ici, d'où l'absence de chevron. C'est une documentation, et elle se
   * lit mieux en rangées qu'en cartes bordées empilées.
   */
  let {
    entrees = [],
    /**
     * Regroupe par catégorie.
     *
     * Pour les envois déclenchés par une action métier : leurs catégories sont
     * longues (« Mes équipes interclubs ») et se répètent d'une ligne à l'autre. À
     * droite de chaque rangée, elles ne laissaient au titre qu'une dizaine de
     * caractères — « « Équipe » — v… ». En en-tête de section, elles ne se disent
     * qu'une fois et rendent toute la largeur au titre.
     */
    parCategorie = false
  }: { entrees?: ProgrammeeLike[]; parCategorie?: boolean } = $props();

  /*
    L'explication d'un envoi éteint est la même pour tous : la répéter sous chaque
    ligne tenait quatre lignes de texte par entrée concernée, pour une phrase qu'on
    lit une fois. Elle coiffe la rubrique, et ne paraît que si elle s'applique.
  */
  const certainsEteints = $derived(entrees.some((e) => e.flag && !e.enabled));
</script>

<div class="space-y-3">
  {#if certainsEteints}
    <p class="text-xs text-muted-foreground">
      Les envois désactivés ne partent pas : la fonctionnalité est éteinte dans la
      configuration du club, ou les envois programmés sont fermés sur cet environnement.
    </p>
  {/if}

  <ListView
    items={entrees}
    sections={parCategorie ? (e) => e.category : undefined}
    sectionLabel={libelleDeCategorie}
  >
    {#snippet listRow(entree)}
      {@const l = ligneProgrammee(entree)}
      <ListRow
        item={entree}
        title={l.titre}
        subtitle={l.sousTitre}
        value={parCategorie ? undefined : l.valeur}
        valueTone={l.ton}
        chevron="none"
      />
    {/snippet}
  </ListView>
</div>
