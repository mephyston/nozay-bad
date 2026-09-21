<script lang="ts">
  import { Sheet, Button, Input, Badge, Select, Checkbox, Alert, uiAlert } from '@nba/ui';
  import { CalendarDays, Plus, X, TriangleAlert } from '@lucide/svelte';
  import { CHAMPIONSHIPS, CHAMPIONSHIP_RULES, type Championship } from '../../shared/championship';
  import { mondayOf, sundayOf } from '../../shared/week';
  import type { ChampionshipDayItem } from '../../list-championship-days/dto';

  let {
    open = $bindable(false),
    championship: initialChampionship,
    days: initialDays,
    seasonCode,
    canWrite,
    onSaved,
    endpoint = '/admin/api/teams/teams'
  }: {
    open: boolean;
    championship: Championship;
    days: ChampionshipDayItem[];
    seasonCode: string;
    canWrite: boolean;
    onSaved: () => void;
    /**
     * Destination des écritures : le relais du domaine, et non la page hôte.
     *
     * `fetch('')` visait « la page qui m'affiche », ce qui obligeait chaque hôte à
     * porter son propre pont vers l'API. La destination est nommée.
     */
    endpoint?: string;
  } = $props();

  /**
   * Le championnat se change **dans** la feuille, sans navigation.
   *
   * Passer par l'URL rechargeait la page, ce qui refermait la feuille au premier
   * changement de sélecteur : on ne pouvait pas comparer deux calendriers.
   */
  let championship = $state<Championship>(initialChampionship);
  let days = $state<ChampionshipDayItem[]>(initialDays);
  let loading = $state(false);

  async function loadDays(next: Championship) {
    championship = next;
    loading = true;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-days', seasonCode, championship: next })
      });
      const payload = (await response.json()) as { data?: { days: ChampionshipDayItem[] }; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Chargement impossible.');
      days = payload.data?.days ?? [];
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'Chargement impossible.');
    } finally {
      loading = false;
    }
  }

  type Draft = {
    number: number;
    weekStart: string;
    /** Nom d'affichage, quand « J15 » ne dit rien : « Barrages aller ». */
    label: string;
    /** `playoff` : journée que toutes les équipes ne disputent pas. */
    kind: 'regular' | 'playoff';
    concurrent: Championship[];
  };

  let draft = $state<Draft[]>([]);
  let saving = $state(false);

  $effect(() => {
    /*
     * Le libellé et la nature de la journée voyagent avec elle.
     *
     * Les omettre du brouillon ne se voyait pas à l'écran mais se payait à
     * l'enregistrement : l'envoi les remettait à leur valeur par défaut, et les barrages
     * redevenaient des journées ordinaires en perdant leur nom.
     */
    draft = days.map((d) => ({
      number: d.number,
      weekStart: d.weekStart,
      label: d.label ?? '',
      kind: d.kind,
      concurrent: d.concurrentChampionships
    }));
  });

  const rules = $derived(CHAMPIONSHIP_RULES[championship]);

  /** Deux journées la même semaine rendraient la règle « une équipe par journée » muette. */
  const duplicateWeeks = $derived(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const day of draft) {
      const monday = day.weekStart ? mondayOf(day.weekStart) : '';
      if (!monday) continue;
      if (seen.has(monday)) dupes.add(monday);
      seen.add(monday);
    }
    return dupes;
  });

  function addDay() {
    const last = draft[draft.length - 1];
    const nextNumber = last ? last.number + 1 : 1;
    const nextWeek = last?.weekStart
      ? new Date(new Date(`${mondayOf(last.weekStart)}T00:00:00Z`).getTime() + 7 * 864e5)
          .toISOString()
          .slice(0, 10)
      : '';
    draft = [...draft, { number: nextNumber, weekStart: nextWeek, label: '', kind: 'regular', concurrent: [] }];
  }

  async function save() {
    saving = true;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-championship-days',
          seasonCode,
          championship,
          days: draft
            .filter((d) => d.weekStart)
            .map((d) => ({
              number: d.number,
              weekStart: d.weekStart,
              label: d.label.trim() || null,
              kind: d.kind
            }))
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "L'enregistrement a échoué.");

      await loadDays(championship);
      onSaved();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'enregistrement a échoué.");
    } finally {
      saving = false;
    }
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Content class="w-full sm:max-w-2xl overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title>Journées de championnat</Sheet.Title>
      <Sheet.Description>
        Chaque championnat numérote ses journées pour lui seul. Une journée est une
        <strong>semaine</strong>, du lundi au dimanche : c'est elle qui relie les
        championnats entre eux.
      </Sheet.Description>
    </Sheet.Header>

    <div class="p-4 space-y-4">
      <div class="w-full sm:w-[320px]">
        <Select
          value={championship}
          disabled={loading}
          onchange={(e) => loadDays((e.currentTarget as HTMLSelectElement).value as Championship)}
          aria-label="Championnat"
        >
          {#each CHAMPIONSHIPS as code (code)}
            <option value={code}>{CHAMPIONSHIP_RULES[code].label}</option>
          {/each}
        </Select>
      </div>

      {#if rules.fixturesPerDay > 1}
        <Alert.Root variant="info">
          <CalendarDays class="w-4 h-4" />
          <Alert.Description>
            {rules.label} dispute <strong>{rules.fixturesPerDay} rencontres par journée</strong>.
          </Alert.Description>
        </Alert.Root>
      {/if}

      {#if duplicateWeeks().size > 0}
        <Alert.Root variant="destructive">
          <TriangleAlert class="w-4 h-4" />
          <Alert.Title>Deux journées dans la même semaine</Alert.Title>
          <Alert.Description>
            Une journée est une semaine : deux journées ne peuvent pas la partager.
          </Alert.Description>
        </Alert.Root>
      {/if}

      <div class="space-y-2">
        {#each draft as day, index (index)}
          <div class="rounded-lg border p-2.5 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-sm w-12 shrink-0">J{day.number}</span>
              <Input
                type="date"
                bind:value={day.weekStart}
                disabled={!canWrite}
                class="max-w-[170px]"
                aria-label={`Semaine de la journée ${day.number}`}
              />
              {#if day.weekStart}
                <span class="text-xs text-muted-foreground">
                  du {mondayOf(day.weekStart)} au {sundayOf(day.weekStart)}
                </span>
              {/if}
              {#each day.concurrent as other (other)}
                <!--
                  Le signal qui manque partout ailleurs : les numéros ne se ressemblent pas
                  d'un championnat à l'autre, seule la semaine les rapproche.
                -->
                <Badge variant="warning">
                  aussi {CHAMPIONSHIP_RULES[other].label}
                </Badge>
              {/each}
              {#if canWrite}
                <Button
                  variant="ghost"
                  size="icon"
                  class="ml-auto"
                  aria-label={`Supprimer la journée ${day.number}`}
                  onclick={() => (draft = draft.filter((_, i) => i !== index))}
                >
                  <X class="w-4 h-4" />
                </Button>
              {/if}
            </div>

            <!--
              Un numéro ne dit pas tout : « J15 » se lit comme une quinzième journée de
              championnat alors qu'il s'agit des barrages. Le libellé, quand il existe,
              remplace le numéro partout où la journée s'affiche.
            -->
            <div class="flex flex-wrap items-center gap-2 pl-14">
              <Input
                bind:value={day.label}
                disabled={!canWrite}
                class="max-w-[240px]"
                placeholder={`Libellé (défaut : J${day.number})`}
                aria-label={`Libellé de la journée ${day.number}`}
              />
              <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={day.kind === 'playoff'}
                  disabled={!canWrite}
                  onCheckedChange={(v) => (day.kind = v ? 'playoff' : 'regular')}
                  aria-label={`Barrages ou finale — journée ${day.number}`}
                />
                Barrages ou phase finale
              </label>
              {#if day.kind === 'playoff'}
                <Badge variant="info">Toutes les équipes ne la disputent pas</Badge>
              {/if}
            </div>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">Aucune journée définie pour ce championnat.</p>
        {/each}
      </div>

      {#if canWrite}
        <Button variant="outline" onclick={addDay}>
          <Plus class="w-4 h-4" /> Ajouter une journée
        </Button>
      {/if}
    </div>

    <Sheet.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
      {#if canWrite}
        <Button onclick={save} disabled={saving || duplicateWeeks().size > 0}>
          {saving ? 'Enregistrement…' : 'Enregistrer le calendrier'}
        </Button>
      {/if}
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
