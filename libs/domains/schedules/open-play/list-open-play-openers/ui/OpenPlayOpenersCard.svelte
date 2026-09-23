<script lang="ts">
  import { KeyRound, Plus } from '@lucide/svelte';
  import {
    Badge,
    Button,
    Input,
    ListRow,
    ListView,
    ResponsiveSheet,
    dockDePage,
    uiConfirm,
    flashAndReload,
    uiAlert,
    type SwipeAction
  } from '@nba/ui';
  import {
    adherentsProposes,
    compteurDOuvreur,
    detailDOuvreur,
    gestesDOuvreur,
    legendeDOuvreur,
    nomDOuvreur,
    pastilleDOuvreur,
    tonDOuvreur,
    type AdherentLike,
    type OuvreurLike
  } from './openers-row-model';

  /**
   * Les détenteurs de clé de la saison.
   *
   * Une carte portait la liste, son propre titre — répété du bandeau de la page — et,
   * collé dessous, un champ de recherche qui proposait des adhérents en vrac. Confier
   * une clé est un geste de création : il descend dans la barre du bas et ouvre un
   * tiroir, comme partout ailleurs.
   */

  interface OpenerRow extends OuvreurLike {}
  interface MemberOption extends AdherentLike {}

  let {
    openers = [],
    members = [],
    seasonCode = '',
    canWrite = false,
    endpoint = '/admin/api/schedules/ouvreurs'
  } = $props<{
    openers: OpenerRow[]; members: MemberOption[]; seasonCode?: string; canWrite?: boolean;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  }>();

  let search = $state('');
  let busy = $state(false);
  let attributionOuverte = $state(false);

  const known = $derived(new Set(openers.map((o: OpenerRow) => o.licence)));
  const matches = $derived(adherentsProposes(members, known, search));

  /* Confier une clé descend dans la barre du bas : c'est une création, et le champ qui
     s'en chargeait vivait sous une liste qui grandit à chaque saison. */
  $effect(() => {
    if (!canWrite) return;
    const actions: SwipeAction[] = [
      { id: 'confier', label: 'Confier une clé', icon: KeyRound, run: () => ouvrirAttribution() }
    ];
    return dockDePage.declarerActions(actions, { icon: Plus, label: 'Confier une clé' });
  });

  function ouvrirAttribution() {
    search = '';
    attributionOuverte = true;
  }

  async function post(body: unknown, fallback: string) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  async function add(member: MemberOption) {
    busy = true;
    try {
      await post({ action: 'addOpener', seasonCode, licence: member.licence }, "L'ajout a échoué.");
      flashAndReload(`${member.firstName} ${member.lastName} peut désormais ouvrir un créneau.`);
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'ajout a échoué.");
      busy = false;
    }
  }

  async function remove(opener: OuvreurLike) {
    const confirmed = await uiConfirm({
      title: 'Reprendre cette clé ?',
      description:
        'Les séances que cette personne a déjà acceptées d’ouvrir ne sont pas annulées : elle ne pourra simplement plus s’en engager de nouvelles.',
      confirmLabel: 'Reprendre',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'removeOpener', id: (opener as OpenerRow).id }, 'Le retrait a échoué.');
      flashAndReload('Clé reprise.');
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'Le retrait a échoué.');
    }
  }
</script>

<!--
  La barre du bas est `md:hidden` : une action qui n'y vivrait **que** disparaîtrait
  au-dessus de 768 px. Le champ de recherche qui portait ce geste ayant été retiré, il
  n'y aurait plus aucun moyen de confier une clé sur un ordinateur. D'où ce bouton, qui
  ne se montre que là où la barre du bas n'est pas.
-->
{#if canWrite}
  <div class="mb-4 hidden justify-end md:flex">
    <Button onclick={ouvrirAttribution} class="h-9 gap-1.5 font-bold">
      <Plus class="h-4 w-4" />
      <span>Confier une clé</span>
    </Button>
  </div>
{/if}

<ListView
  items={openers}
  emptyIcon={KeyRound}
  emptyTitle="Aucun ouvreur"
  emptyDescription="Personne ne détient de clé : aucune séance ne pourra être confirmée."
>
  {#snippet listRow(opener)}
    {@const pastille = pastilleDOuvreur(opener)}
    <ListRow
      item={opener}
      title={nomDOuvreur(opener)}
      subtitle={detailDOuvreur(opener)}
      value={compteurDOuvreur(opener)}
      valueTone={tonDOuvreur(opener)}
      valueCaption={legendeDOuvreur(opener)}
      actions={gestesDOuvreur({ canWrite }, { onRemove: (o) => void remove(o) })}
    >
      {#snippet badge()}
        {#if pastille}
          <Badge variant="outline" size="xs">{pastille}</Badge>
        {/if}
      {/snippet}
    </ListRow>
  {/snippet}
</ListView>

<!--
  L'attribution dans un tiroir, et non sous la liste : le champ y était atteint après
  avoir défilé tous les ouvreurs, et ses propositions poussaient la page à chaque
  frappe. Ici la recherche est en haut, sous le pouce, et les résultats sont une liste
  comme les autres.
-->
<ResponsiveSheet
  bind:open={attributionOuverte}
  title="Confier une clé"
  icon={KeyRound}
  description="L'adhérent verra « J'ouvre ce créneau » depuis son espace."
  size="md"
>
  <div class="space-y-3 py-2">
    <Input
      bind:value={search}
      placeholder="Nom, prénom ou licence"
      aria-label="Chercher un adhérent"
      autocapitalize="off"
      spellcheck="false"
    />

    {#if search.trim().length > 0 && search.trim().length < 3}
      <p class="text-muted-foreground text-sm">Saisissez au moins 3 lettres.</p>
    {:else if search.trim().length >= 3 && matches.length === 0}
      <p class="text-muted-foreground text-sm">Aucun adhérent ne correspond.</p>
    {:else if matches.length > 0}
      <ListView items={matches}>
        {#snippet listRow(member)}
          <ListRow
            item={member}
            onclick={busy ? undefined : () => void add(member)}
            disabled={busy}
            title={`${member.firstName} ${member.lastName}`}
            value={member.licence}
          />
        {/snippet}
      </ListView>
    {/if}
  </div>
</ResponsiveSheet>
