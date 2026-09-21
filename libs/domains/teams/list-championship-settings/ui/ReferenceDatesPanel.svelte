<script lang="ts">
  import { Badge, Select, uiAlert } from '@nba/ui';
  import { CalendarClock } from '@lucide/svelte';
  import { saveChampionshipSetting } from './championship-settings-api';
  import type { ChampionshipSettingsItem } from '../dto';
  import type { RankingDateSummary } from '../../list-rankings/dto';

  let {
    items,
    availableDates,
    seasonCode,
    canWrite,
    onSaved,
    endpoint = '/admin/api/teams/classements'
  }: {
    items: ChampionshipSettingsItem[];
    availableDates: RankingDateSummary[];
    /**
     * Saison transmise explicitement : la page ne la résout qu'après le POST, pour
     * l'affichage. S'en remettre au paramètre d'URL épinglait la date en saison vide au
     * premier chargement — un réglage écrit nulle part, et jamais relu.
     */
    seasonCode: string;
    canWrite: boolean;
    onSaved: () => void;
    /**
     * Destination des écritures : le relais de l'écran qui héberge ce panneau.
     *
     * Les deux panneaux de réglages écrivent dans la même table mais ne relèvent pas du
     * même écran, et les relais n'acceptent pas les mêmes clés.
     */
    endpoint?: string;
  } = $props();

  let saving = $state<string | null>(null);

  async function save(championship: string, referenceEloDate: string | null) {
    saving = championship;
    try {
      await saveChampionshipSetting(endpoint, seasonCode, championship, { referenceEloDate });
      onSaved();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'enregistrement a échoué.");
    } finally {
      saving = null;
    }
  }
</script>

<!--
  Sans carte ni en-tête : la section repliable qui enveloppe ce panneau les fournit déjà,
  et les empiler dessinerait deux bordures concentriques.
-->
<div class="space-y-3">
  {#each items as item (item.championship)}
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div class="min-w-[220px]">
        <p class="font-medium text-sm">{item.label}</p>
        <p class="text-xs text-muted-foreground">
          {#if item.rankingPolicy === 'season_fixed'}
            Arrêté pour toute la saison (art. 6.1.3)
          {:else}
            Le jeudi précédant chaque journée (art. 4.4.2)
          {/if}
        </p>
      </div>

      {#if item.rankingPolicy === 'per_day'}
        <!--
          Aucune date à épingler : le régional recalcule sa référence à chaque journée.
          Proposer un champ ici laisserait croire à un réglage qui ne serait jamais lu.
        -->
        <Badge variant="info">
          <CalendarClock class="w-3 h-3 mr-1" />
          Résolue par journée
        </Badge>
      {:else if availableDates.length === 0}
        <Badge variant="warning">Aucun classement importé</Badge>
      {:else}
        <div class="w-[240px]">
          <Select
            value={item.referenceEloDate ?? ''}
            disabled={!canWrite || saving === item.championship}
            onchange={(e) => save(item.championship, (e.currentTarget as HTMLSelectElement).value || null)}
            aria-label={`Date de référence — ${item.label}`}
          >
            <option value="">— Aucune date épinglée —</option>
            {#each availableDates as date (date.eloDate)}
              <option value={date.eloDate}>{date.eloDate}</option>
            {/each}
          </Select>
        </div>
      {/if}
    </div>
  {/each}

  {#if items.some((i) => i.rankingPolicy === 'season_fixed' && !i.referenceEloDate)}
    <p class="text-xs text-warning">
      Tant qu'un championnat départemental n'a pas de date épinglée, aucune valeur d'équipe
      n'y est calculable.
    </p>
  {/if}
</div>
