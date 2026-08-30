<script lang="ts">
  import { Select } from "../ui/select";
  import { softNavigate } from "../../lib/navigation";

  /*
    Le nom est **facultatif**, comme il l'est dans les projections d'API qui alimentent
    cet écran : plusieurs pages passaient des saisons sans lui, et le contrat exigeait
    pourtant qu'il soit là. Le repli ci-dessous reprend celui de `toSeasonOptions` —
    nom, puis code, puis identifiant — pour qu'une saison sans libellé s'affiche quand
    même plutôt que de laisser une ligne vide dans la liste.
  */
  interface SeasonOption {
    id?: number | string;
    code?: string;
    name?: string;
  }

  let {
    seasons = [],
    current,
    param = "season",
    size = "default" as "default" | "sm"
  }: {
    seasons: SeasonOption[];
    current: string;
    param?: string;
    size?: "default" | "sm";
  } = $props();

  const optionValue = (s: SeasonOption) => s.code || String(s.id);

  function handleChange(e: Event) {
    const newSeason = (e.target as HTMLSelectElement).value;
    const url = new URL(window.location.href);
    url.searchParams.set(param, newSeason);
    softNavigate(url.toString());
  }
</script>

<div class="w-fit min-w-36">
  <Select value={current} onchange={handleChange} {size} class="font-semibold" aria-label="Saison">
    {#each seasons as s (optionValue(s))}
      <option value={optionValue(s)} selected={optionValue(s) === current}>{s.name || s.code || `Saison ${s.id}`}</option>
    {/each}
    {#if seasons.length === 0}
      <option value={current} selected>Saison {current}</option>
    {/if}
  </Select>
</div>
