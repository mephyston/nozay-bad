<script lang="ts">
  import {
    Table,
    Badge,
    ChoiceField,
    Alert,
    Button,
    FormField,
    ResponsiveSheet,
    dockDePage,
    softNavigate,
    toast,
    uiAlert
  } from '@nba/ui';
  import { CircleCheck, UsersRound, CircleHelp } from '@lucide/svelte';
  import DayValuesList from './DayValuesList.svelte';
  import {
    erreursDe,
    etatDeComposition,
    libelleDeSignalement,
    valeurFr,
    ecartFr,
    type EquipeDeJourneeLike
  } from './day-values-row-model';
  import { CHAMPIONSHIPS, CHAMPIONSHIP_RULES, type Championship } from '../../shared/championship';
  import type { ListDayValuesOutput, DayTeamValue } from '../dto';

  let {
    board,
    days,
    championship,
    dayNumber,
    seasonCode,
    endpoint = '/admin/api/teams/journees'
  }: {
    board: ListDayValuesOutput | null;
    days: Array<{ number: number; label: string | null; weekStart: string }>;
    championship: Championship;
    dayNumber: number;
    seasonCode: string;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  function go(params: Record<string, string>) {
    const query = new URLSearchParams({
      season: seasonCode,
      championship,
      day: String(dayNumber),
      ...params
    });
    softNavigate(`/admin/teams/journees?${query}`);
  }

  const errorsOf = (team: DayTeamValue) => erreursDe(team as EquipeDeJourneeLike);

  const anomalies = $derived(
    (board?.teams ?? []).filter((t) => errorsOf(t).length > 0 || t.conform === false)
  );

  /*
    Le championnat et la journée sont la **portée** de l'écran : ce qu'on regarde, et
    non ce qu'on y cherche ni ce qu'on y crée. Ils ont donc leur pilule dans la barre
    du bas, qui affiche la journée courante — une portée qu'on ne voit pas ne se
    vérifie jamais. Sur ordinateur, les deux rangées restent en haut de page.
  */
  let porteeOuverte = $state(false);

  const libelleDeJournee = (numero: number) => {
    const jour = days.find((d) => d.number === numero);
    return jour?.label ?? `Journée ${numero}`;
  };

  $effect(() =>
    dockDePage.declarerPortee({
      label: 'Journée',
      valeur: `J${dayNumber}`,
      ouvrir: () => (porteeOuverte = true)
    })
  );

  let notifying = $state<number | null>(null);

  /**
   * Prévient le capitaine — et le vice-capitaine — de l'anomalie relevée.
   *
   * Le message est construit côté serveur à partir du constat : le coach clique, il ne
   * rédige pas. Un texte libre finirait par dire autre chose que ce que l'écran affiche.
   */
  async function notify(team: DayTeamValue) {
    notifying = team.teamId;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify-captain', teamId: team.teamId, dayNumber })
      });
      const payload = (await response.json()) as {
        data?: {
          recipients: number;
          skipped: boolean;
          counterpartTeamName: string | null;
          counterpartRecipients: number;
        };
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "L'envoi a échoué.");

      const sent = payload.data;
      if (sent?.skipped) toast.info('Rien à signaler sur cette composition.');
      else if (sent?.recipients === 0 && sent?.counterpartRecipients === 0)
        toast.warning('Aucune adresse connue pour le staff de cette équipe.');
      else if (sent?.counterpartRecipients)
        // Le dépassement de valeur se règle à deux : on le dit, sinon le coach croirait
        // n'avoir prévenu qu'un seul côté et relancerait l'autre à la main.
        toast.success(
          `${team.name} et ${sent.counterpartTeamName} prévenues (${sent.recipients + sent.counterpartRecipients} destinataire(s)) : les deux capitaines peuvent se rapprocher.`
        );
      else toast.success(`${team.captainName ?? 'Le staff'} prévenu (${sent?.recipients} destinataire(s)).`);
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'envoi a échoué.");
    } finally {
      notifying = null;
    }
  }

  const frenchDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', timeZone: 'UTC'
    });
</script>

<div class="space-y-6">
  <!-- Sur téléphone, la portée vit dans la pilule de la barre du bas. -->
  <div class="hidden flex-wrap gap-3 md:flex">
    <div class="w-full sm:w-[320px]">{@render choixDuChampionnat()}</div>
    <div class="w-full sm:w-[260px]">{@render choixDeLaJournee()}</div>
  </div>

  {#if !board}
    <p class="text-sm text-muted-foreground">
      Aucune journée définie pour ce championnat. Renseignez le calendrier depuis l'écran Équipes.
    </p>
  {:else}
    <!--
      Les joueurs alignés deux fois passent avant tout le reste : c'est la seule
      infraction que personne d'autre ne peut voir, et elle fait perdre la rencontre à
      toutes les équipes concernées.
    -->
    {#if board.duplicatePlayers.length > 0}
      <Alert.Root variant="destructive">
        <UsersRound class="w-4 h-4" />
        <Alert.Title>
          {board.duplicatePlayers.length} joueur(s) aligné(s) dans deux équipes cette semaine
        </Alert.Title>
        <Alert.Description class="space-y-1">
          <p class="text-sm">
            Semaine du {frenchDate(board.weekStart)} au {frenchDate(board.weekEnd)}. Un joueur
            ne tient qu'une seule équipe du club par semaine : l'équipe ayant joué en dernier
            perd la rencontre par pénalité.
          </p>
          <ul class="text-sm">
            {#each board.duplicatePlayers as player (player.licence)}
              <li>{player.name} — {player.teams.join(' et ')}</li>
            {/each}
          </ul>
        </Alert.Description>
      </Alert.Root>
    {/if}

    {#if !board.hasTeamValue}
      <Alert.Root variant="info">
        <CircleHelp class="w-4 h-4" />
        <Alert.Description>
          {board.championshipLabel} ne définit aucune valeur d'équipe : aucune contrainte de
          hiérarchie ne s'y applique.
        </Alert.Description>
      </Alert.Root>
    {/if}

    <!--
      Le tableau défilait horizontalement : sa moitié droite — le statut — ne se voyait
      jamais au doigt, alors que c'est ce qu'on vient chercher. Il reste à la souris ;
      le téléphone reçoit une liste.
    -->
    <div class="md:hidden">
      <DayValuesList equipes={board.teams as EquipeDeJourneeLike[]} avecValeur={board.hasTeamValue} />
    </div>

    <div class="hidden rounded-lg border md:block">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Équipe</Table.Head>
            <Table.Head>Division</Table.Head>
            {#if board.hasTeamValue}
              <Table.Head class="text-right">Valeur</Table.Head>
              <Table.Head class="text-right">Δ vs équipe du dessus</Table.Head>
            {/if}
            <Table.Head class="text-center">Lignes</Table.Head>
            <Table.Head>Statut</Table.Head>
            <Table.Head>Capitaine</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each board.teams as team (team.teamId)}
            <Table.Row>
              <Table.Cell class="font-medium">{team.name}</Table.Cell>
              <Table.Cell class="text-sm text-muted-foreground">{team.divisionLabel}</Table.Cell>
              {#if board.hasTeamValue}
                <Table.Cell class="text-right tabular-nums font-medium">{valeurFr(team.value)}</Table.Cell>
                <Table.Cell
                  class="text-right tabular-nums {team.conform === false ? 'text-destructive font-semibold' : 'text-muted-foreground'}"
                >
                  {ecartFr(team.delta)}
                </Table.Cell>
              {/if}
              <Table.Cell class="text-center text-sm">
                {team.filledLines}/{team.expectedLines}
              </Table.Cell>
              <Table.Cell>
                <!--
                  La colonne dit toujours l'état — une case vide serait illisible —, là
                  où la pastille du téléphone ne le dit que s'il réclame un geste. Une
                  seule déclaration nourrit les deux.
                -->
                {@const etat = etatDeComposition(team as EquipeDeJourneeLike)}
                <Badge variant={etat.variante}>{etat.texte}</Badge>
              </Table.Cell>
              <Table.Cell class="text-sm text-muted-foreground">
                {team.captainName ?? 'non désigné'}
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={7} class="text-center text-sm text-muted-foreground py-6">
                Aucune équipe engagée dans ce championnat.
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>

    {#if anomalies.length > 0}
      <section class="space-y-3">
        <h2 class="text-sm font-semibold">Anomalies de la journée</h2>
        {#each anomalies as team (team.teamId)}
          <div class="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <p class="font-medium text-sm">{team.name}</p>
              {#if team.captainLicence}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notifying === team.teamId}
                  onclick={() => notify(team)}
                >
                  <!--
                    Le libellé dit qui est prévenu, et ils ne sont pas toujours les mêmes :
                    un dépassement de valeur part aux deux capitaines concernés, une erreur
                    dure au seul capitaine fautif. Nommer le seul capitaine de l'équipe
                    laisserait croire que l'autre n'a rien reçu.
                  -->
                  {libelleDeSignalement(team as EquipeDeJourneeLike, notifying === team.teamId)}
                </Button>
              {:else}
                <span class="text-xs text-muted-foreground">Aucun capitaine désigné</span>
              {/if}
            </div>
            <ul class="text-sm space-y-1">
              {#if team.conform === false}
                <li class="text-destructive">
                  Valeur {valeurFr(team.value)} supérieure à {team.upperTeamName}
                  ({valeurFr(team.upperTeamValue)}) — les deux équipes perdraient la rencontre.
                </li>
              {/if}
              {#each errorsOf(team) as issue (issue.code + (issue.slot ?? '') + (issue.licence ?? ''))}
                <li class="text-destructive">
                  {issue.message} <span class="text-xs opacity-70">(art. {issue.article})</span>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </section>
    {:else if board.teams.length > 0 && board.duplicatePlayers.length === 0}
      <Alert.Root variant="success">
        <CircleCheck class="w-4 h-4" />
        <Alert.Description>
          Aucune anomalie sur cette journée.
        </Alert.Description>
      </Alert.Root>
    {/if}
  {/if}
</div>

{#snippet choixDuChampionnat()}
  <FormField id="portee-championnat" label="Championnat">
    <ChoiceField
      id="portee-championnat"
      label="Championnat"
      value={championship}
      onChange={(v) => go({ championship: v, day: '1' })}
      options={CHAMPIONSHIPS.map((code) => ({ value: code, label: CHAMPIONSHIP_RULES[code].label }))}
    />
  </FormField>
{/snippet}

{#snippet choixDeLaJournee()}
  <FormField id="portee-journee" label="Journée">
    <ChoiceField
      id="portee-journee"
      label="Journée"
      value={String(dayNumber)}
      onChange={(v) => go({ day: v })}
      options={days.map((day) => ({
        value: String(day.number),
        label: libelleDeJournee(day.number),
        hint: `semaine du ${frenchDate(day.weekStart)}`
      }))}
    />
  </FormField>
{/snippet}

<ResponsiveSheet
  bind:open={porteeOuverte}
  title="Ce que vous regardez"
  description="Le championnat et la journée dont on contrôle les compositions."
  size="md"
>
  <div class="space-y-4 py-2">
    {@render choixDuChampionnat()}
    {@render choixDeLaJournee()}
  </div>
</ResponsiveSheet>
