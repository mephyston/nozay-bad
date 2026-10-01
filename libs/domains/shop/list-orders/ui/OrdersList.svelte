<script lang="ts">
  import GenreAdherent from './GenreAdherent.svelte';
  import { Badge, ListView, ListRow } from '@nba/ui';
  import type { OrderItem, OrdersTab } from './orders-manager-types';
  import {
    ETAPES_OUVERTES,
    ETAPE_LABELS,
    actionsDeCommande,
    enRetard,
    etapeOuverte,
    issueCommande,
    ligneCommande
  } from './orders-row-model';

  /**
   * Les commandes en liste, au doigt.
   *
   * Remplace deux jeux de cartes écrits à la main — un par table — qui empilaient
   * chacun huit informations et deux boutons de pleine largeur par commande. Une
   * ligne dit désormais qui, quoi, combien et quand ; le moyen de paiement, la date
   * de mise en attente et la référence de l'écriture vivent sur la fiche, à un appui.
   *
   * Les décisions passent par le balayage, et restent atteignables au clavier par le
   * bouton escamoté de chaque ligne : une seule déclaration, trois chemins.
   */
  let {
    orders = [],
    vue,
    verrouille = false,
    onPrimary,
    onSecondary,
    onUndeliver,
    onOuvrir,
    emptyTitle,
    emptyDescription
  }: {
    orders?: OrderItem[];
    /** La vue affichée : `open` regroupe les trois étapes, les autres sont homogènes. */
    vue: OrdersTab;
    /** Saison clôturée, ou transition en cours : plus aucune action n'est offerte. */
    verrouille?: boolean;
    onPrimary?: (id: number) => void;
    onSecondary?: (id: number) => void;
    onUndeliver?: (id: number) => void;
    onOuvrir: (item: OrderItem) => void;
    emptyTitle?: string;
    emptyDescription?: string;
  } = $props();

  /**
   * Dans la vue réunie, l'étape devient une section plutôt qu'un badge par ligne.
   *
   * L'ordre est celui du parcours — on valide, on encaisse, on remet — et non celui du
   * relais, pour que les blocs ne changent pas de place d'un chargement à
   * l'autre. Un en-tête porte son compte, ce qui remplace les compteurs que la
   * liste déroulante de statut affichait en libellé.
   */
  const rangees = $derived(
    vue === 'open'
      ? [...orders].sort(
          (a, b) => ETAPES_OUVERTES.indexOf(etapeOuverte(a)) - ETAPES_OUVERTES.indexOf(etapeOuverte(b))
        )
      : orders
  );

</script>

<ListView
  items={rangees}
  sections={vue === 'open' ? (item) => etapeOuverte(item) : undefined}
  sectionLabel={(cle) => ETAPE_LABELS[cle as keyof typeof ETAPE_LABELS] ?? cle}
  {emptyTitle}
  {emptyDescription}
>
  {#snippet listRow(item)}
    {@const l = ligneCommande(item)}
    {@const retard = enRetard(item)}
    {@const issue = issueCommande(item)}
    <ListRow
      {item}
      onclick={() => onOuvrir(item)}
      title={l.titre}
      subtitle={l.sousTitre}
      value={l.valeur}
      valueTone={l.ton}
      valueCaption={l.legende}
      actions={actionsDeCommande(item, { verrouille, onPrimary, onSecondary, onUndeliver })}
    >
      <!--
        Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
        propriété au composant. C'est son contenu qui est conditionnel.
      -->
      {#snippet badge()}
        <GenreAdherent gender={item.member?.gender} />
        {#if issue}
          <Badge variant={issue.variant as 'success'} size="xs">{issue.label}</Badge>
        {:else if retard !== null}
          <!-- Au-delà d'une semaine, la commande est dans le périmètre de la relance. -->
          <Badge variant="warning" size="xs">{retard} j</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>
