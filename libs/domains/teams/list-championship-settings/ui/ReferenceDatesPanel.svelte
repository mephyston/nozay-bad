<script lang="ts">
  import { Badge, ChoiceField, FormField, uiAlert } from '@nba/ui';
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
    <!--
      Un vrai champ par championnat, et non une rangée à deux colonnes.

      Le nom du championnat était un paragraphe à gauche, la liste déroulante un bloc de
      240 px à droite : à 390 px l'un se repliait sous l'autre en laissant une colonne
      de vide, et surtout **le champ n'avait plus de nom** dès qu'on a quitté la liste
      déroulante native et son `aria-label` — `ChoiceField` ne porte son intitulé que
      sous un `FormField`, qui l'associe par `for`/`id`.
    -->
    <div class="rounded-lg border p-3">
      {#if item.rankingPolicy === 'per_day'}
        <!--
          Aucune date à épingler : le régional recalcule sa référence à chaque journée.
          Proposer un champ ici laisserait croire à un réglage qui ne serait jamais lu.
        -->
        <p class="text-sm font-medium">{item.label}</p>
        <p class="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Badge variant="info">
            <CalendarClock class="w-3 h-3 mr-1" />
            Résolue par journée
          </Badge>
          Le jeudi précédant chaque journée (art. 4.4.2)
        </p>
      {:else if availableDates.length === 0}
        <p class="text-sm font-medium">{item.label}</p>
        <p class="mt-1"><Badge variant="warning">Aucun classement importé</Badge></p>
      {:else}
        <FormField
          id={`date-reference-${item.championship}`}
          label={`Date de référence — ${item.label}`}
          keepLabel
          hint="Arrêtée pour toute la saison (art. 6.1.3)"
        >
          <ChoiceField
            id={`date-reference-${item.championship}`}
            label={item.label}
            value={item.referenceEloDate ?? ''}
            disabled={!canWrite || saving === item.championship}
            onChange={(v) => save(item.championship, v || null)}
            options={[
              { value: '', label: 'Aucune date épinglée' },
              ...availableDates.map((date) => ({
                value: date.eloDate,
                label: date.eloDate,
                hint: `${date.players} ${date.players > 1 ? 'joueurs' : 'joueur'}`
              }))
            ]}
          />
        </FormField>
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
