<script lang="ts">
  import { Badge, ListView, ListRow, formatAmount } from '@nba/ui';
  import type { Transaction } from './ledger-types';
  import type { AccountLike } from '../../../shared/account-labels';
  import {
    actionsDEcriture,
    jourEtMois,
    libelleDeMois,
    ligneEcriture,
    moisDe,
    signalement
  } from './ledger-row-model';

  /**
   * Le journal des écritures, au doigt.
   *
   * Remplace des cartes écrites à la main qui empilaient six informations et deux
   * boutons de pleine largeur par écriture. Une ligne porte le libellé, la date, la
   * catégorie et le montant signé ; le solde progressif le suit en légende.
   *
   * Deux choses que la vue tableau bricolait trouvent ici leur forme : le mois devient
   * une **section**, et le solde de fin de mois l'agrégat de son en-tête — il vivait
   * dans une ligne de tableau intercalée, réécrite deux fois. Une opération ventilée
   * devient un **groupe repliable**, comme les déclinaisons d'un produit, au lieu d'une
   * fausse ligne qu'on tapait pour l'ouvrir sans que rien ne l'annonce.
   */
  let {
    items = [],
    accounts = [],
    activeCategories = [],
    isClosed = false,
    showBalance = true,
    selectedSeasonId,
    expandedGroups = $bindable({}),
    onToggleGroup,
    onStartEdit,
    onDelete
  }: {
    /** Les écritures, ventilations déjà regroupées par l'appelant. */
    items?: any[];
    accounts?: AccountLike[];
    activeCategories?: { id: string; code: string; name: string }[];
    isClosed?: boolean;
    showBalance?: boolean;
    selectedSeasonId?: number | string;
    expandedGroups?: Record<number, boolean>;
    onToggleGroup: (bankLineId: number) => void;
    onStartEdit: (tx: Transaction, e: MouseEvent) => void;
    onDelete: (id: number) => void;
  } = $props();

  const estGroupe = (item: any): boolean => !!item && 'isGroup' in item && item.isGroup;

  /*
    La gouttière de repli ne se réserve que si la page contient vraiment une
    ventilation. Les réserver toujours, comme le fait le catalogue où presque chaque
    produit se décline, coûterait 32 px sur chaque ligne d'un journal qui n'en compte
    presque jamais.
  */
  const aDesGroupes = $derived(items.some(estGroupe));

  /**
   * Les lignes réellement affichées : les écritures et les groupes, chaque groupe suivi
   * de ses filles quand il est déplié.
   */
  const lignes = $derived.by(() => {
    const out: { item: any; enfant: boolean }[] = [];
    for (const item of items) {
      out.push({ item, enfant: false });
      if (estGroupe(item) && expandedGroups[item.bankStatementLineId]) {
        for (const enfant of item.children as Transaction[]) out.push({ item: enfant, enfant: true });
      }
    }
    return out;
  });

  /**
   * Le solde de clôture d'un mois.
   *
   * La liste est servie du plus récent au plus ancien : la **première** ligne d'un mois
   * en est donc la plus récente, et son solde progressif est le solde de fin de mois.
   * Une ligne fille est exclue — son solde est « inclus » dans celui de son groupe.
   */
  const soldeDeMois = $derived.by(() => {
    const par = new Map<string, number>();
    for (const { item, enfant } of lignes) {
      if (enfant) continue;
      const cle = moisDe(item.date);
      if (par.has(cle)) continue;
      if (item.runningBalanceCents !== undefined) par.set(cle, item.runningBalanceCents);
    }
    return par;
  });

  const nombreParMois = $derived.by(() => {
    const par = new Map<string, number>();
    for (const { item, enfant } of lignes) {
      if (enfant) continue;
      const cle = moisDe(item.date);
      par.set(cle, (par.get(cle) ?? 0) + 1);
    }
    return par;
  });

  /**
   * Ce que porte l'en-tête d'un mois : son solde de clôture, ou — liste filtrée, le
   * solde n'ayant alors plus de sens — le nombre d'écritures, **avec son unité**.
   *
   * L'unité n'est pas un ornement : un nombre nu à cette place se lit comme une somme,
   * puisque c'est une somme qui s'y trouve le reste du temps. « septembre 2026 14 » et
   * « septembre 2026 14 788,80 € » se ressemblaient trop.
   */
  function agregatDuMois(cle: string): string | undefined {
    if (showBalance) {
      const solde = soldeDeMois.get(cle);
      return solde === undefined ? undefined : formatAmount(solde);
    }
    const nombre = nombreParMois.get(cle) ?? 0;
    return `${nombre} écriture${nombre > 1 ? 's' : ''}`;
  }
</script>

<ListView
  items={lignes}
  sections={(l) => moisDe(l.item.date)}
  sectionLabel={libelleDeMois}
  sectionValue={agregatDuMois}
  emptyTitle="Aucune écriture"
  emptyDescription="Aucune écriture comptable pour cette saison."
>
  {#snippet listRow(entree)}
    {#if estGroupe(entree.item)}
      {@const groupe = entree.item}
      <!--
        La place du chevron est réservée des deux côtés du groupe : sans elle, le
        montant de l'opération et son solde seraient décalés de 16 px par rapport aux
        écritures qu'elle contient, et la colonne de droite cesserait d'en être une.
      -->
      <ListRow
        title="Opération ventilée"
        subtitle={`${jourEtMois(groupe.date)} · ${groupe.children.length} lignes`}
        value={formatAmount(groupe.type === 'depense' ? -groupe.amountCents : groupe.amountCents, {
          showSign: true
        })}
        valueTone={groupe.type === 'depense' ? 'destructive' : 'success'}
        valueCaption={showBalance && groupe.runningBalanceCents !== undefined
          ? formatAmount(groupe.runningBalanceCents)
          : undefined}
        chevron="none"
        disclosure={expandedGroups[groupe.bankStatementLineId] ? 'expanded' : 'collapsed'}
        onDisclosure={() => onToggleGroup(groupe.bankStatementLineId)}
      />
    {:else}
      {@const tx = entree.item as Transaction}
      {@const l = ligneEcriture(tx, {
        accounts,
        categories: activeCategories,
        showBalance: showBalance && !entree.enfant
      })}
      {@const marque = signalement(tx, selectedSeasonId)}
      <!-- `tx-mobile-<id>` : la cible du retour depuis le rapprochement. -->
      <ListRow
        id={`tx-mobile-${tx.id}`}
        item={tx}
        onclick={isClosed ? undefined : (e) => onStartEdit(tx, e)}
        title={l.titre}
        subtitle={l.sousTitre}
        value={l.valeur}
        valueTone={l.ton}
        valueCaption={entree.enfant ? 'inclus' : l.legende}
        chevron={isClosed ? (aDesGroupes ? 'none' : false) : true}
        nested={entree.enfant}
        disclosure={entree.enfant || !aDesGroupes ? undefined : 'none'}
        actions={actionsDEcriture(tx, { isClosed, onStartEdit, onDelete })}
      >
        <!--
          Le snippet se déclare toujours : sous un `{#if}` il ne serait pas passé en
          propriété au composant. C'est son contenu qui est conditionnel.
        -->
        {#snippet badge()}
          {#if marque}
            <Badge variant={marque.variant} size="xs">{marque.label}</Badge>
          {/if}
        {/snippet}
      </ListRow>
    {/if}
  {/snippet}
</ListView>
