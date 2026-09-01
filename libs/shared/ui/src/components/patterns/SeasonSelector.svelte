<script lang="ts">
  import { Select } from "../ui/select";
  import { softNavigate } from "../../lib/navigation";
  import { toSeasonOptions, type SeasonLike } from "../../lib/seasons";

  /*
    Le nom est **facultatif**, comme il l'est dans les projections d'API qui alimentent
    cet écran : plusieurs pages passaient des saisons sans lui, et le contrat exigeait
    pourtant qu'il soit là. Le repli — nom, puis code, puis identifiant — et l'ordre
    chronologique viennent de `toSeasonOptions`, pour qu'un sélecteur de saison présente
    la même liste dans le même ordre d'un écran à l'autre.
  */
  let {
    seasons = [],
    current,
    param = "season",
    size = "default" as "default" | "sm"
  }: {
    seasons: SeasonLike[];
    current: string;
    param?: string;
    size?: "default" | "sm";
  } = $props();

  const options = $derived(toSeasonOptions(seasons));

  function handleChange(e: Event) {
    const newSeason = (e.target as HTMLSelectElement).value;
    const url = new URL(window.location.href);
    url.searchParams.set(param, newSeason);
    softNavigate(url.toString());
  }
</script>

<div class="w-fit min-w-36">
  <Select value={current} onchange={handleChange} {size} class="font-semibold" aria-label="Saison">
    {#each options as o (o.value)}
      <option value={o.value} selected={o.value === current}>{o.label}</option>
    {/each}
    {#if options.length === 0}
      <option value={current} selected>Saison {current}</option>
    {/if}
  </Select>
</div>
