<script lang="ts">
  import { Sheet, Button, Badge, SearchableCombobox, Alert, MemberAvatar, toast, Separator } from '@nba/ui';
  import { UserRoundX, TriangleAlert, Plus, X } from '@lucide/svelte';
  import type { GetTeamOutput } from '../dto';

  let {
    open = $bindable(false),
    detail,
    members,
    canWrite,
    onSaved
  }: {
    open: boolean;
    detail: GetTeamOutput | null;
    /** Adhérents de la saison, source unique des sélecteurs. */
    members: Array<{ licence: string; firstName: string; lastName: string; photoUpdatedAt?: number | null }>;
    canWrite: boolean;
    onSaved: () => void;
  } = $props();

  let captain = $state<string>('');
  let viceCaptain = $state<string>('');
  let roster = $state<string[]>([]);
  let toAdd = $state<string | number | undefined>(undefined);
  let saving = $state(false);

  $effect(() => {
    if (!open || !detail) return;
    captain = detail.captain?.licence ?? '';
    viceCaptain = detail.viceCaptain?.licence ?? '';
    roster = detail.roster.map((p) => p.licence);
  });

  const byLicence = $derived(new Map(members.map((m) => [m.licence, m])));

  /**
   * Le club compte plus de deux cents adhérents : rendre la liste entière fige le
   * sélecteur à chaque frappe, la recherche du composant repassant sur tout le lot.
   * On filtre nous-mêmes et on plafonne l'affichage — au-delà d'une trentaine de noms,
   * personne ne parcourt la liste : on tape.
   */
  const MAX_SUGGESTIONS = 30;

  let captainQuery = $state('');
  let viceQuery = $state('');
  let addQuery = $state('');

  function suggest(query: string, exclude: string[] = []) {
    const needle = query.trim().toLowerCase();
    const matches = members.filter((m) => {
      if (exclude.includes(m.licence)) return false;
      if (!needle) return true;
      return (
        m.lastName.toLowerCase().includes(needle) ||
        m.firstName.toLowerCase().includes(needle) ||
        m.licence.includes(needle)
      );
    });
    return matches
      .slice(0, MAX_SUGGESTIONS)
      .map((m) => ({ label: `${m.lastName} ${m.firstName}`, value: m.licence }));
  }

  /** La sélection courante reste dans la liste, sinon le libellé retomberait au placeholder. */
  function withSelected(items: Array<{ label: string; value: string }>, selected: string) {
    if (!selected || items.some((i) => i.value === selected)) return items;
    const member = byLicence.get(selected);
    return [
      { label: member ? `${member.lastName} ${member.firstName}` : `Licence ${selected}`, value: selected },
      ...items
    ];
  }

  const captainItems = $derived(withSelected(suggest(captainQuery), captain));
  const viceItems = $derived(withSelected(suggest(viceQuery), viceCaptain));
  const addableItems = $derived(suggest(addQuery, roster));

  function label(licence: string): string {
    const member = byLicence.get(licence);
    return member ? `${member.lastName} ${member.firstName}` : `Licence ${licence}`;
  }

  /**
   * Portrait d'un joueur de l'effectif, ou `null`.
   *
   * Lu dans l'annuaire de la saison plutôt que dans `detail.roster` : un joueur qu'on
   * vient d'ajouter au sélecteur n'est pas encore dans l'effectif enregistré, et sa
   * ligne se serait affichée sans visage jusqu'au premier enregistrement.
   */
  function photoSrc(licence: string): string | null {
    const version = byLicence.get(licence)?.photoUpdatedAt;
    if (!version) return null;
    return `/admin/api/member-photo?licence=${encodeURIComponent(licence)}&size=128&v=${version}`;
  }

  function addToRoster(value: string | number) {
    const licence = String(value);
    if (licence && !roster.includes(licence)) roster = [...roster, licence];
    toAdd = undefined;
  }

  async function post(action: string, body: Record<string, unknown>) {
    const response = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, teamId: detail?.id, ...body })
    });
    const payload = (await response.json()) as { data?: any; error?: string };
    if (!response.ok) throw new Error(payload.error || "L'enregistrement a échoué.");
    return payload.data;
  }

  async function save() {
    if (!detail) return;
    saving = true;
    try {
      await post('save-team-staff', {
        captainLicence: captain || null,
        viceCaptainLicence: viceCaptain || null
      });
      const result = await post('save-team-roster', { licences: roster });

      if (result?.rejected?.length > 0) {
        toast.warning(
          `${result.rejected.length} licence(s) écartée(s) : absentes du référentiel des adhérents.`
        );
      } else {
        toast.success('Staff et effectif enregistrés.');
      }
      open = false;
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'enregistrement a échoué.");
    } finally {
      saving = false;
    }
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="w-full sm:max-w-2xl overflow-y-auto">
    {#if detail}
      <Sheet.Header>
        <Sheet.Title>{detail.name} — staff et effectif</Sheet.Title>
        <Sheet.Description>
          {detail.championshipLabel} · {detail.divisionLabel} · rencontre en {detail.matchCount} matchs.
          {detail.eligibilityRule}
        </Sheet.Description>
      </Sheet.Header>

      <div class="p-4 space-y-6">
        {#if detail.referenceOrigin === 'none'}
          <Alert.Root variant="warning">
            <TriangleAlert class="w-4 h-4" />
            <Alert.Title>Aucun classement de référence</Alert.Title>
            <Alert.Description>
              Épinglez une date de référence dans l'écran Classements : sans elle, aucune
              éligibilité ni valeur d'équipe n'est calculable.
            </Alert.Description>
          </Alert.Root>
        {:else if detail.referenceOrigin === 'latest'}
          <p class="text-xs text-muted-foreground">
            Classements du {detail.referenceEloDate} — les plus récents. En régional, la
            référence dépend de la journée : elle est recalculée pour chaque rencontre.
          </p>
        {:else}
          <p class="text-xs text-muted-foreground">
            Classements arrêtés au {detail.referenceEloDate}.
          </p>
        {/if}

        <!--
          Empilés, et non côte à côte.

          Dans une feuille de 672 px, deux colonnes laissent environ 320 px à chacune :
          trop peu pour « NOM Prénom » suivi du chevron, si bien que le nom se tronquait
          dès qu'il dépassait quelques caractères. Le `min-w-0` empêchait le débordement,
          il ne rendait pas les libellés lisibles. Sur toute la largeur, ils le sont.
        -->
        <div class="space-y-4">
          <div class="space-y-1 min-w-0">
            <span class="text-sm font-medium">Capitaine</span>
            <SearchableCombobox
              items={captainItems}
              filter={false}
              onSearch={(q) => (captainQuery = q)}
              bind:value={captain}
              disabled={!canWrite}
              placeholder="Désigner un capitaine"
              searchPlaceholder="Nom, prénom ou licence…"
            />
          </div>
          <div class="space-y-1 min-w-0">
            <span class="text-sm font-medium">Vice-capitaine</span>
            <SearchableCombobox
              items={viceItems}
              filter={false}
              onSearch={(q) => (viceQuery = q)}
              bind:value={viceCaptain}
              disabled={!canWrite}
              placeholder="Désigner un vice-capitaine"
              searchPlaceholder="Nom, prénom ou licence…"
            />
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          Le capitaine et le vice-capitaine sont les seuls à pouvoir composer cette équipe
          depuis l'espace adhérent.
        </p>

        <Separator />

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium">Effectif ({roster.length})</p>
              <p class="text-xs text-muted-foreground">
                Indicatif : il présélectionne les joueurs dans l'écran de composition, sans
                interdire d'en aligner d'autres.
              </p>
            </div>
          </div>

          {#if canWrite}
            <div class="flex items-center gap-2 min-w-0">
              <SearchableCombobox
                items={addableItems}
                filter={false}
                onSearch={(q) => (addQuery = q)}
                bind:value={toAdd}
                onValueChange={addToRoster}
                placeholder="Ajouter un joueur"
                searchPlaceholder="Nom, prénom ou licence…"
                class="flex-1"
              />
              <Plus class="w-4 h-4 text-muted-foreground" />
            </div>
          {/if}

          <ul class="divide-y rounded-lg border">
            {#each roster as licence (licence)}
              {@const player = detail.roster.find((p) => p.licence === licence)}
              <li class="flex items-center justify-between gap-3 p-2.5">
                <div class="flex min-w-0 items-center gap-2.5">
                  <MemberAvatar src={photoSrc(licence)} name={label(licence)} size="sm" class="shrink-0" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate">{label(licence)}</p>
                    <p class="text-xs text-muted-foreground">
                      {#if player?.hasRanking}
                        {player.singles ?? '—'} / {player.doubles ?? '—'} / {player.mixed ?? '—'}
                        {#if player.category}· {player.category}{/if}
                      {:else}
                        Aucun classement à cette date
                      {/if}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  {#if player && !player.eligible}
                    <Badge variant="destructive" title={player.ineligibilityReason ?? ''}>
                      Non éligible
                    </Badge>
                  {/if}
                  {#if player?.mutation && player.mutation !== 'none'}
                    <Badge variant="warning">Muté</Badge>
                  {/if}
                  {#if canWrite}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer ${label(licence)}`}
                      onclick={() => (roster = roster.filter((l) => l !== licence))}
                    >
                      <X class="w-4 h-4" />
                    </Button>
                  {/if}
                </div>
              </li>
            {:else}
              <li class="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <UserRoundX class="w-4 h-4" />
                Aucun joueur dans l'effectif.
              </li>
            {/each}
          </ul>
        </div>
      </div>

      <Sheet.Footer>
        <Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
        {#if canWrite}
          <Button onclick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        {/if}
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
