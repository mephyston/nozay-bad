<script lang="ts">
  import { Input, Button, uiAlert } from '@nba/ui';
  import { ExternalLink } from '@lucide/svelte';
  import { saveChampionshipSetting } from './championship-settings-api';
  import type { ChampionshipSettingsItem } from '../dto';

  let {
    items,
    seasonCode,
    canWrite,
    onSaved,
    endpoint = '/admin/api/teams/reglements'
  }: {
    items: ChampionshipSettingsItem[];
    seasonCode: string;
    canWrite: boolean;
    /** Facultatif : une page Astro sérialise les props d'une île et ne peut pas passer de fonction. */
    onSaved?: () => void;
    /**
     * Destination des écritures : le relais de l'écran qui héberge ce panneau.
     *
     * Les deux panneaux de réglages écrivent dans la même table mais ne relèvent pas du
     * même écran, et les relais n'acceptent pas les mêmes clés.
     */
    endpoint?: string;
  } = $props();

  let saving = $state<string | null>(null);

  /** Saisie locale : on n'enregistre qu'au clic, pas à chaque frappe. */
  let links = $state<Record<string, { url: string; label: string }>>(
    Object.fromEntries(
      items.map((i) => [i.championship, { url: i.rulesUrl ?? '', label: i.rulesLabel ?? '' }])
    )
  );

  async function save(championship: string) {
    saving = championship;
    try {
      await saveChampionshipSetting(endpoint, seasonCode, championship, {
        rulesUrl: links[championship].url.trim() || null,
        rulesLabel: links[championship].label.trim() || null
      });
      onSaved?.();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'enregistrement a échoué.");
    } finally {
      saving = null;
    }
  }
</script>

<div class="space-y-3">
  <p class="text-xs text-muted-foreground">
    Déposez le PDF dans la médiathèque, puis collez son lien ici. Il apparaîtra en
    téléchargement sur la fiche de chaque équipe du championnat, dans l'espace adhérent.
    C'est le texte qui fait foi le soir de la rencontre.
  </p>

  {#each items as item (item.championship)}
    <div class="rounded-lg border p-3 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium">{item.label}</p>
        {#if item.rulesUrl}
          <!-- Le lien enregistré est vérifiable d'un clic : une URL fausse ne se voit pas. -->
          <a
            href={item.rulesUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            Ouvrir <ExternalLink class="w-3 h-3" />
          </a>
        {/if}
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        <div class="min-w-0">
          <Input
            bind:value={links[item.championship].url}
            disabled={!canWrite || saving === item.championship}
            placeholder="https://… (lien du PDF)"
            aria-label={`Lien du règlement — ${item.label}`}
          />
        </div>
        <div class="min-w-0 flex gap-2">
          <Input
            bind:value={links[item.championship].label}
            disabled={!canWrite || saving === item.championship}
            placeholder="Libellé affiché (facultatif)"
            aria-label={`Libellé du règlement — ${item.label}`}
          />
          {#if canWrite}
            <Button
              variant="outline"
              size="sm"
              disabled={saving === item.championship}
              onclick={() => save(item.championship)}
            >
              {saving === item.championship ? '…' : 'Enregistrer'}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>
