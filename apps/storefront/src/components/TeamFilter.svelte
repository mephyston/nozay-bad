<script lang="ts">
  import { ChoiceField } from '@nba/ui';

  /**
   * Le filtre par équipe de la vue « Interclubs » du calendrier : un seul champ, pas une
   * rangée de puces — dix équipes déborderaient l'écran du téléphone.
   *
   * Le choix est dans l'adresse (partageable, retour arrière) et retenu sur l'appareil : qui
   * suit l'équipe 3 la retrouve en revenant, sans la rechoisir.
   */
  let { teams, selected }: { teams: { id: number; name: string; championshipLabel: string }[]; selected: string } = $props();

  const KEY = 'nba:agenda-team';

  $effect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('equipe')) {
      try {
        localStorage.setItem(KEY, selected);
      } catch {}
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved && teams.some((team) => String(team.id) === saved)) {
      url.searchParams.set('equipe', saved);
      window.location.replace(url);
    }
  });

  function choose(value: string) {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('equipe', value);
    else url.searchParams.delete('equipe');
    window.location.assign(url);
  }

  const options = $derived([
    { value: '', label: 'Toutes les équipes' },
    ...teams.map((team) => ({ value: String(team.id), label: team.name, hint: team.championshipLabel }))
  ]);
</script>

<ChoiceField id="agenda-team" label="Équipe" value={selected} {options} onChange={choose} />
