<script lang="ts">
  import { FormSheet, FormField, Button, Input, Badge, ChoiceField, SwitchField, Alert, uiAlert } from '@nba/ui';
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

<!--
  Un tiroir, et non un panneau latéral : la validation vit en haut, à portée du pouce,
  au lieu d'un pied qu'il fallait atteindre après toutes les journées.
-->
<FormSheet
  bind:open
  title="Journées de championnat"
  description="Chaque championnat numérote ses journées pour lui seul. Une journée est une semaine, du lundi au dimanche : c'est elle qui relie les championnats entre eux."
  size="lg"
  isSubmitting={saving}
  lectureSeule={!canWrite}
  cancelLabel="Fermer"
  submitLabel="Enregistrer le calendrier"
  onSubmit={(e) => { e.preventDefault(); void save(); }}
>
    <div class="space-y-4">
      <FormField id="jours-championnat" label="Championnat">
        <ChoiceField
          id="jours-championnat"
          label="Championnat"
          value={championship}
          disabled={loading}
          onChange={(v) => loadDays(v as Championship)}
          options={CHAMPIONSHIPS.map((code) => ({ value: code, label: CHAMPIONSHIP_RULES[code].label }))}
        />
      </FormField>

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
          <!--
            Empilé, et non en rangées qui se replient.

            La carte alignait « J1 », un champ de date, la semaine en toutes lettres,
            des pastilles et un bouton de retrait sur une même ligne `flex-wrap`, puis
            un second rang en retrait de 56 px. À 390 px, tout cela se repliait en cinq
            lignes désordonnées, le retrait mangeait la largeur du second champ, et la
            case à cocher restait une cible de 16 px.
          -->
          <div class="rounded-lg border p-3 space-y-3">
            <div class="flex items-center gap-2">
              <span class="w-10 shrink-0 text-sm font-medium">J{day.number}</span>
              <div class="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {#each day.concurrent as other (other)}
                  <!--
                    Le signal qui manque partout ailleurs : les numéros ne se ressemblent
                    pas d'un championnat à l'autre, seule la semaine les rapproche.
                  -->
                  <Badge variant="warning" size="xs">aussi {CHAMPIONSHIP_RULES[other].label}</Badge>
                {/each}
                {#if day.kind === 'playoff'}
                  <Badge variant="info" size="xs">Toutes les équipes ne la disputent pas</Badge>
                {/if}
              </div>
              {#if canWrite}
                <Button
                  variant="ghost"
                  size="icon"
                  class="shrink-0"
                  aria-label={`Supprimer la journée ${day.number}`}
                  onclick={() => (draft = draft.filter((_, i) => i !== index))}
                >
                  <X class="w-4 h-4" />
                </Button>
              {/if}
            </div>

            <FormField
              id={`jour-${index}-semaine`}
              label={`Semaine de la journée ${day.number}`}
              hint={day.weekStart ? `Du ${mondayOf(day.weekStart)} au ${sundayOf(day.weekStart)}.` : undefined}
            >
              <Input
                id={`jour-${index}-semaine`}
                type="date"
                bind:value={day.weekStart}
                disabled={!canWrite}
              />
            </FormField>

            <!--
              Un numéro ne dit pas tout : « J15 » se lit comme une quinzième journée de
              championnat alors qu'il s'agit des barrages. Le libellé, quand il existe,
              remplace le numéro partout où la journée s'affiche.
            -->
            <FormField
              id={`jour-${index}-libelle`}
              label={`Libellé de la journée ${day.number}`}
              hint={`À défaut, la journée s'affiche « J${day.number} ».`}
            >
              <Input
                id={`jour-${index}-libelle`}
                bind:value={day.label}
                disabled={!canWrite}
                placeholder={`J${day.number}`}
              />
            </FormField>

            <SwitchField
              id={`jour-${index}-barrages`}
              label="Barrages ou phase finale"
              hint="Toutes les équipes ne la disputent pas."
              checked={day.kind === 'playoff'}
              disabled={!canWrite}
              onChange={(v) => (day.kind = v ? 'playoff' : 'regular')}
            />
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

</FormSheet>
